"""Disposable MySQL instance. Never connects to the Laragon application server."""
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time


class IsolatedMysql:
    def __init__(self, database, binary=None):
        if not re.fullmatch(r'kpi_(?:schema|backend)_v2_test', database):
            raise ValueError('Only dedicated v2 test database names are accepted')
        self.database = database
        self.binary = Path(binary) if binary else Path(r'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin')
        self.flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
        self.directory = Path(tempfile.mkdtemp(prefix='kpi-domain-v2-'))
        self.version = subprocess.check_output([str(self.binary/'mysqld.exe'), '--no-defaults', '--version'], text=True, **self.flags).strip()
        if 'Ver 8.4' not in self.version:
            raise RuntimeError('MySQL 8.4 is required')
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            self.port = listener.getsockname()[1]
        self.process = None

    def __enter__(self):
        data = self.directory/'data'
        data.mkdir()
        subprocess.run([str(self.binary/'mysqld.exe'), '--no-defaults', '--initialize-insecure', '--basedir='+str(self.binary.parent), '--datadir='+str(data)], capture_output=True, check=True, timeout=90, **self.flags)
        self.process = subprocess.Popen([str(self.binary/'mysqld.exe'), '--no-defaults', '--basedir='+str(self.binary.parent), '--datadir='+str(data), '--port='+str(self.port), '--bind-address=127.0.0.1', '--mysqlx=OFF', '--default-time-zone=+00:00', '--log-error='+str(self.directory/'mysql.log')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **self.flags)
        self.cli = [str(self.binary/'mysql.exe'), '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port='+str(self.port), '--user=root', '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names']
        for _ in range(150):
            if self.process.poll() is not None:
                raise RuntimeError((self.directory/'mysql.log').read_text(encoding='utf-8', errors='replace'))
            if self.query('SELECT 1', database=False, check=False).returncode == 0:
                break
            time.sleep(.2)
        else:
            self.__exit__(None, None, None)
            raise RuntimeError('MySQL startup timeout')
        self.query('CREATE DATABASE '+self.database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci', database=False)
        return self

    def query(self, sql, database=True, check=True):
        command = self.cli + (['--database='+self.database] if database else [])
        result = subprocess.run(command, input=sql, text=True, encoding='utf-8', capture_output=True, timeout=45, **self.flags)
        if check and result.returncode:
            raise RuntimeError(result.stderr[:3000])
        return result

    def __exit__(self, *_):
        if self.process and self.process.poll() is None:
            subprocess.run([str(self.binary/'mysqladmin.exe'), '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port='+str(self.port), '--user=root', 'shutdown'], capture_output=True, timeout=25, **self.flags)
            try:
                self.process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                self.process.terminate()
                self.process.wait(timeout=10)

    def metadata(self):
        return {'engine': self.version, 'isolated': True, 'existingDatabaseTouched': False, 'tempDirectory': str(self.directory), 'instanceStopped': self.process is not None and self.process.poll() is not None}
