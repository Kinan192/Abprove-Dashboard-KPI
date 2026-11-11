"""Migrate and test backend v2 using disposable MySQL; no Laragon DB writes."""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import secrets
import socket
import time
import urllib.request
import urllib.error
import http.cookiejar
from isolated_mysql import IsolatedMysql

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--filter',default='');parser.add_argument('--mysql-bin',type=Path);args=parser.parse_args()
db=IsolatedMysql('kpi_backend_v2_test',args.mysql_bin);report={'contract':'backend-v2','liveDatabaseApplied':False};code=1
try:
 with db:
  env=os.environ.copy();env.update(APP_ENV='testing',APP_DEBUG='false',DB_CONNECTION='mysql',DB_HOST='127.0.0.1',DB_PORT=str(db.port),DB_DATABASE=db.database,DB_USERNAME='root',DB_PASSWORD='',DB_URL='',CACHE_STORE='array',SESSION_DRIVER='array',KPI_ISOLATED_TEST='1',APP_CONFIG_CACHE=str(db.directory/'config.php'),APP_ROUTES_CACHE=str(db.directory/'routes.php'))
  php=shutil.which('php')
  subprocess.run([php,'artisan','migrate','--force','--no-interaction'],cwd=ROOT,env=env,check=True,**db.flags)
  command=[php,'vendor/phpunit/phpunit/phpunit','--log-junit',str(db.directory/'junit.xml')]
  if args.filter:command+=['--filter',args.filter]
  result=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',**db.flags)
  print(result.stdout[:22000]);print(result.stderr[:2000] if result.stderr else '')
  report.update(exitCode=result.returncode,junit=str(db.directory/'junit.xml'),output=result.stdout);code=result.returncode
  if code==0:
   env['KPI_HTTP_PASSWORD']=secrets.token_urlsafe(24)
   subprocess.run([php,'tests/Support/http_seed.php'],cwd=ROOT,env=env,capture_output=True,check=True,**db.flags)
   with socket.socket()as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
   httpenv=dict(env,APP_ENV='local',SESSION_DRIVER='file',CACHE_STORE='array')
   server=subprocess.Popen([php,'-S','127.0.0.1:'+str(port),'-t','public','tools/testing/server.php'],cwd=ROOT,env=httpenv,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,**db.flags)
   opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
   def request(path,body=None,csrf=None):
    headers={'Accept':'application/json','Content-Type':'application/json'}
    if csrf:headers['X-CSRF-TOKEN']=csrf
    req=urllib.request.Request('http://127.0.0.1:'+str(port)+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
    try:
     with opener.open(req,timeout=10)as response:return response.status,json.loads(response.read())
    except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
   try:
    for _ in range(100):
     try:
      status,initial=request('/login')
      if status==200:break
     except OSError:pass
     time.sleep(.1)
    credentials={'identifier':'http@example.test','password':env['KPI_HTTP_PASSWORD']}
    real={'csrf':request('/login',credentials)[0]==419}
    status,login=request('/login',credentials,initial['csrf_token']);real['login']=status==200
    real['me']=request('/me')[0]==200
    real['logout']=request('/logout',{},login['data']['csrf_token'])[0]==200
    real['logout_revokes_session']=request('/me')[0]==401
    report['realHttp']=real;print('Real HTTP: '+json.dumps(real));code=0 if all(real.values())else 1
   finally:server.terminate();server.wait(timeout=15)
except Exception as e:report['error']=str(e);print('Runner error: '+str(e));code=1
finally:
 report.update(db.metadata());report['exitCode']=code
 (ROOT/'docs/backend/v2').mkdir(parents=True,exist_ok=True)
 (ROOT/'docs/backend/v2/test-result.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
raise SystemExit(code)
