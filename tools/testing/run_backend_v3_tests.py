"""Laravel + genuine Better Auth + browser tests on an isolated MySQL instance."""
from pathlib import Path
import os,sys,subprocess,shutil,socket,secrets,time,json,urllib.request,xml.etree.ElementTree as ET
from isolated_mysql import IsolatedMysql
sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parents[2]
def free_port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def ready(url):
 for _ in range(100):
  try:
   with urllib.request.urlopen(url,timeout=2)as r:
    if r.status==200:return
  except OSError:pass
  time.sleep(.1)
 raise RuntimeError('Service did not become ready: '+url)
db=IsolatedMysql('kpi_backend_v2_test',timezone='+07:00');children=[];report={'contract':'backend-live-v3','realBetterAuth':True,'existingDatabaseTouched':False,'mysqlServerTimezone':'+07:00','applicationTimezone':'UTC'};code=1
try:
 with db:
  port,auth_port=free_port(),free_port()
  env=dict(os.environ,APP_ENV='testing',APP_DEBUG='false',APP_URL=f'http://127.0.0.1:{port}',DB_CONNECTION='mysql',DB_HOST='127.0.0.1',DB_PORT=str(db.port),DB_DATABASE=db.database,DB_USERNAME='root',DB_PASSWORD='',DB_URL='',CACHE_STORE='array',SESSION_DRIVER='array',KPI_ISOLATED_TEST='1',APP_CONFIG_CACHE=str(db.directory/'config.php'),APP_ROUTES_CACHE=str(db.directory/'routes.php'),BETTER_AUTH_SECRET=secrets.token_urlsafe(48),BETTER_AUTH_PORT=str(auth_port),BETTER_AUTH_INTERNAL_URL=f'http://127.0.0.1:{auth_port}',BETTER_AUTH_TRUSTED_ORIGINS='')
  php=shutil.which('php');node=shutil.which('node')
  subprocess.run([php,'artisan','migrate','--force','--no-interaction'],cwd=ROOT,env=env,check=True,**db.flags)
  result=subprocess.run([php,'vendor/phpunit/phpunit/phpunit','--log-junit',str(db.directory/'junit.xml')],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',**db.flags)
  report['phpunitExitCode']=result.returncode
  tree=ET.parse(db.directory/'junit.xml');failures=[]
  for test in tree.iter('testcase'):
   for element in list(test):
    if element.tag in ['failure','error']:failures.append({'test':test.attrib['name'],'message':(element.text or '')[:1800]})
  report['phpunitFailures']=failures;print(result.stdout[:2500]);print(json.dumps(failures,indent=2)[:8000])
  if result.returncode:raise RuntimeError('Laravel feature tests failed')
  env['KPI_DEMO_PASSWORD']=secrets.token_urlsafe(22)+'A9';env['KPI_E2E_PASSWORD']=env['KPI_DEMO_PASSWORD'];env['KPI_E2E_URL']=env['APP_URL']
  subprocess.run([php,'artisan','db:seed','--force'],cwd=ROOT,env=env,check=True,**db.flags)
  authlog=open(db.directory/'auth.log','w',encoding='utf-8');phplog=open(db.directory/'php.log','w',encoding='utf-8')
  auth=subprocess.Popen([node,'services/auth/server.mjs'],cwd=ROOT,env=env,stdout=authlog,stderr=authlog,**db.flags);children.append(auth);ready(f'http://127.0.0.1:{auth_port}/health')
  httpenv=dict(env,APP_ENV='local',SESSION_DRIVER='file')
  server=subprocess.Popen([php,'-S',f'127.0.0.1:{port}','-t','public','tools/testing/server.php'],cwd=ROOT,env=httpenv,stdout=phplog,stderr=phplog,**db.flags);children.append(server);ready(env['APP_URL']+'/login')
  browser_command=[node,'node_modules/@playwright/test/cli.js','test','--config=playwright.live.config.js']
  if env.get('KPI_BROWSER_GREP'):browser_command.extend(['--grep',env['KPI_BROWSER_GREP']])
  result=subprocess.run(browser_command,cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=600,**db.flags)
  (db.directory/'browser.log').write_text(result.stdout+'\n'+result.stderr,encoding='utf-8')
  print(result.stdout[-4500:],flush=True)
  report['browserExitCode']=result.returncode;code=result.returncode
  report['junit']=str(db.directory/'junit.xml');report['serviceLogs']=str(db.directory)
except Exception as e:report['error']=str(e);print(str(e))
finally:
 for child in reversed(children):
  if child.poll()is None:child.terminate();child.wait(timeout=15)
 report.update(db.metadata());report['exitCode']=code
 (ROOT/'docs/backend/v3').mkdir(parents=True,exist_ok=True)
 (ROOT/'docs/backend/v3/test-result.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
sys.exit(code)
