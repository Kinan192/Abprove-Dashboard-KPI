"""Fresh SQL and credential upgrade checks on disposable MySQL, never Laragon."""
from pathlib import Path
import json,os,subprocess,shutil
from isolated_mysql import IsolatedMysql
ROOT=Path(__file__).resolve().parents[2];checks=[]
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)})
 if not condition:raise AssertionError(name)
with IsolatedMysql('kpi_schema_v3_test') as db:
 db.query((ROOT/'database/schema/schema.mysql.sql').read_text(encoding='utf-8'))
 check('fresh schema has 23 domain/auth tables',db.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()').stdout.strip()=='23')
 check('all 11 domain protection triggers remain',db.query('SELECT COUNT(*)FROM information_schema.triggers WHERE trigger_schema=DATABASE()').stdout.strip()=='11')
 db.query("INSERT INTO users(id,name,email,role_key) VALUES(1,'Test','test@example.test','super_hc'); INSERT INTO auth_accounts(accountId,providerId,userId,password) VALUES('1','credential',1,'test-hash'); INSERT INTO auth_sessions(token,userId,expiresAt) VALUES('test-token',1,DATE_ADD(NOW(),INTERVAL 1 HOUR))")
 check('users does not retain a password column','1054' in db.query("SELECT password FROM users",check=False).stderr)
 check('credential unique per user/provider','1062' in db.query("INSERT INTO auth_accounts(accountId,providerId,userId,password)VALUES('other','credential',1,'x')",check=False).stderr)
 check('session owner foreign key enforced','1452' in db.query("INSERT INTO auth_sessions(token,userId,expiresAt)VALUES('bad',99,NOW())",check=False).stderr)
 db.query('DELETE FROM users WHERE id=1')
 check('unused account deletion removes credentials and sessions',db.query('SELECT (SELECT COUNT(*)FROM auth_accounts)+(SELECT COUNT(*)FROM auth_sessions)').stdout.strip()=='0')
 metadata=db.metadata()
with IsolatedMysql('kpi_schema_v3_test') as db:
 db.query((ROOT/'database/migrations/sql/2026_11_10_domain_v2.sql').read_text(encoding='utf-8'))
 db.query("INSERT INTO users(id,name,email,role_key,password) VALUES(1,'Preserve','preserve@example.test','super_hc','existing-bcrypt-hash')")
 env=dict(os.environ,APP_ENV='testing',DB_HOST='127.0.0.1',DB_PORT=str(db.port),DB_DATABASE=db.database,DB_USERNAME='root',DB_PASSWORD='',APP_CONFIG_CACHE=str(db.directory/'config.php'),APP_ROUTES_CACHE=str(db.directory/'routes.php'))
 script="require 'vendor/autoload.php';$a=require 'bootstrap/app.php';$a->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();(require 'database/migrations/2026_11_10_000006_install_better_auth.php')->up();(require 'database/migrations/2026_11_10_000007_add_server_idle_timeout.php')->up();"
 subprocess.run([shutil.which('php'),'-r',script],cwd=ROOT,env=env,check=True,**db.flags)
 check('v2 upgrade preserves exact credential hash',db.query("SELECT password FROM auth_accounts WHERE userId=1 AND providerId='credential'").stdout.strip()=='existing-bcrypt-hash')
 check('upgraded users password column removed','1054' in db.query('SELECT password FROM users',check=False).stderr)
 check('upgraded session includes server idle timestamp',db.query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='auth_sessions' AND column_name='last_activity_at'").stdout.strip()=='1')
(ROOT/'docs/database/schema-v3-validation.json').write_text(json.dumps({'checks':checks,'isolated':True,'existingDatabaseTouched':False},indent=2),encoding='utf-8')
print(str(len(checks))+' schema v3 checks passed')
