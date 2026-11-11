"""Run migrations and HTTP tests on a NEW disposable MySQL 8.4 server."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import secrets
import urllib.request
import urllib.error
import http.cookiejar

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mysql-bin', type=Path, default=Path(r'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin'))
    parser.add_argument('--filter', default='')
    args = parser.parse_args()
    suffix = '.exe' if os.name == 'nt' else ''
    server = args.mysql_bin / ('mysqld' + suffix)
    client = args.mysql_bin / ('mysql' + suffix)
    admin = args.mysql_bin / ('mysqladmin' + suffix)
    flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
    version = subprocess.check_output([str(server), '--no-defaults', '--version'], text=True, **flags).strip()
    if 'Ver 8.4' not in version:
        raise RuntimeError('Tests require MySQL 8.4: ' + version)
    run = Path(tempfile.mkdtemp(prefix='kpi-backend-test-'))
    data = run / 'data'
    data.mkdir()
    subprocess.run([str(server), '--no-defaults', '--initialize-insecure', '--basedir=' + str(args.mysql_bin.parent), '--datadir=' + str(data)], check=True, capture_output=True, timeout=90, **flags)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    proc = subprocess.Popen([str(server), '--no-defaults', '--basedir=' + str(args.mysql_bin.parent), '--datadir=' + str(data), '--port=' + str(port), '--bind-address=127.0.0.1', '--mysqlx=OFF', '--default-time-zone=+00:00', '--log-error=' + str(run / 'mysql.log')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags)
    cli = [str(client), '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port=' + str(port), '--user=root']
    report = {'engine': version, 'isolated': True, 'existingDatabaseTouched': False, 'tempDirectory': str(run)}
    code = 1
    try:
        for _ in range(150):
            if proc.poll() is not None:
                raise RuntimeError((run / 'mysql.log').read_text(errors='replace'))
            result = subprocess.run(cli + ['--execute=SELECT 1'], capture_output=True, **flags)
            if result.returncode == 0:
                break
            time.sleep(.2)
        else:
            raise RuntimeError('MySQL startup timeout')
        subprocess.run(cli + ['--execute=CREATE DATABASE kpi_backend_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'], check=True, capture_output=True, **flags)
        env = os.environ.copy()
        env.update(APP_ENV='testing', APP_DEBUG='false', DB_CONNECTION='mysql', DB_HOST='127.0.0.1', DB_PORT=str(port), DB_DATABASE='kpi_backend_test', DB_USERNAME='root', DB_PASSWORD='', DB_URL='', CACHE_STORE='array', SESSION_DRIVER='array', KPI_ISOLATED_TEST='1', APP_CONFIG_CACHE=str(run / 'config.php'))
        php = shutil.which('php')
        subprocess.run([php, 'artisan', 'migrate', '--force', '--no-interaction'], cwd=ROOT, env=env, check=True, **flags)
        cmd = [php, 'vendor/phpunit/phpunit/phpunit', '--log-junit', str(run / 'junit.xml')]
        if args.filter:
            cmd += ['--filter', args.filter]
        result = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', **flags)
        try:
            parsed = json.loads(result.stdout)
            print(json.dumps({k: v for k, v in parsed.items() if k != 'failures'}))
            for failure in parsed.get('failures', []):
                print(failure['test'] + ': ' + failure['message'].split('Stack trace:')[0][:1800])
        except (ValueError, TypeError):
            print(result.stdout[:8000])
        if result.stderr:
            print(result.stderr)
        (run / 'phpunit.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
        report.update(exitCode=result.returncode, output=result.stdout, junit=str(run / 'junit.xml'))
        code = result.returncode
        if code == 0:
            env['KPI_HTTP_PASSWORD'] = secrets.token_urlsafe(24)
            subprocess.run([php, 'tests/Support/http_seed.php'], cwd=ROOT, env=env, check=True, capture_output=True, **flags)
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                http_port = sock.getsockname()[1]
            http_env = dict(env, APP_ENV='local', SESSION_DRIVER='file', CACHE_STORE='file')
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            http_proc = subprocess.Popen([php, '-S', '127.0.0.1:' + str(http_port), '-t', 'public', 'public/index.php'], cwd=ROOT, env=http_env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags)
            base = 'http://127.0.0.1:' + str(http_port)

            def request_http(path, payload=None, token=None):
                headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
                if token:
                    headers['X-CSRF-TOKEN'] = token
                req = urllib.request.Request(base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
                try:
                    with opener.open(req, timeout=10) as response:
                        return response.status, json.loads(response.read())
                except urllib.error.HTTPError as error:
                    return error.code, json.loads(error.read())

            try:
                for _ in range(100):
                    try:
                        status, initial = request_http('/login')
                        if status == 200:
                            break
                    except OSError:
                        pass
                    time.sleep(.1)
                else:
                    raise RuntimeError('HTTP server startup timeout')
                credentials = {'identifier': 'http@example.test', 'password': env['KPI_HTTP_PASSWORD']}
                checks = []
                checks.append(('missing_csrf_rejected', request_http('/login', credentials)[0] == 419))
                status, login = request_http('/login', credentials, initial['csrf_token'])
                checks.append(('session_login', status == 200 and login.get('data', {}).get('role') == 'super_hc'))
                checks.append(('authenticated_me', request_http('/me')[0] == 200))
                checks.append(('logout', request_http('/logout', {}, login['data']['csrf_token'])[0] == 200))
                checks.append(('logout_revokes_session', request_http('/me')[0] == 401))
                report['realHttp'] = dict(checks)
                print('Real HTTP: ' + json.dumps(dict(checks)))
                if not all(passed for _, passed in checks):
                    code = 1
            finally:
                http_proc.terminate()
                http_proc.wait(timeout=15)
        report['exitCode'] = code
    finally:
        if proc.poll() is None:
            subprocess.run([str(admin), '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port=' + str(port), '--user=root', 'shutdown'], capture_output=True, timeout=30, **flags)
            try:
                proc.wait(timeout=20)
            except subprocess.TimeoutExpired:
                proc.terminate()
                proc.wait(timeout=10)
        report['isolatedInstanceStopped'] = proc.poll() is not None
        (ROOT / 'docs/backend').mkdir(exist_ok=True)
        (ROOT / 'docs/backend/test-result.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    raise SystemExit(code)


if __name__ == '__main__':
    main()
