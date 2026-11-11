"""Validate schema on a NEW disposable MySQL instance, never an existing database."""
import argparse,json,os,re,socket,subprocess,tempfile,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mysql-bin',required=True,type=Path);p.add_argument('--expected-version-prefix',default='8.4');args=p.parse_args()
 suffix='.exe' if os.name=='nt' else '';server=args.mysql_bin/('mysqld'+suffix);client=args.mysql_bin/('mysql'+suffix);admin=args.mysql_bin/('mysqladmin'+suffix)
 flags={'creationflags':subprocess.CREATE_NO_WINDOW} if os.name=='nt' else {}
 version=subprocess.run([str(server),'--no-defaults','--version'],capture_output=True,text=True,**flags).stdout
 if args.expected_version_prefix not in version:raise RuntimeError('Unexpected engine: '+version)
 run=Path(tempfile.mkdtemp(prefix='kpi-schema-'));data=run/'data';data.mkdir();log=run/'server.log'
 init=subprocess.run([str(server),'--no-defaults','--initialize-insecure','--basedir='+str(args.mysql_bin.parent),'--datadir='+str(data)],capture_output=True,text=True,timeout=90,**flags)
 if init.returncode:raise RuntimeError(init.stderr)
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 proc=subprocess.Popen([str(server),'--no-defaults','--basedir='+str(args.mysql_bin.parent),'--datadir='+str(data),'--port='+str(port),'--bind-address=127.0.0.1','--mysqlx=OFF','--default-time-zone=+00:00','--log-error='+str(log)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,**flags)
 cli=[str(client),'--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(port),'--user=root','--batch','--skip-column-names','--default-character-set=utf8mb4']
 results=[]
 def sql(statement,db=True):
  return subprocess.run(cli+(['--database=kpi_schema_test'] if db else []),input=statement,encoding='utf-8',capture_output=True,timeout=30,**flags)
 def check(name,statement,expected=None,error=None):
  r=sql(statement);out=r.stdout.strip()
  ok=(r.returncode!=0 and re.search(r'ERROR '+str(error)+r'\b',r.stderr)) if error else (r.returncode==0 and (expected is None or out==expected))
  item={'name':name,'pass':bool(ok),'expectedError':error}
  if not ok:item.update(stdout=out,stderr=r.stderr)
  results.append(item)
  if not ok:raise AssertionError(json.dumps(item))
 try:
  for _ in range(100):
   if proc.poll() is not None:raise RuntimeError(log.read_text(errors='replace'))
   ping=sql('SELECT 1;',False)
   if ping.returncode==0:break
   time.sleep(.3)
  else:raise RuntimeError('MySQL startup timeout')
  ddl=(ROOT/'database/schema/schema.mysql.sql').read_text(encoding='utf-8');r=sql('CREATE DATABASE kpi_schema_test; USE kpi_schema_test;\n'+ddl,False)
  if r.returncode:raise RuntimeError(r.stderr)
  check('16 domain tables',"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();",'16')
  check('3 role seeds','SELECT COUNT(*) FROM roles;','3')
  fixture=(ROOT/'tests/Database/fixture.sql').read_text(encoding='utf-8');check('Two-division fixture',fixture)
  check('Generated results SUM = 82.750000','SELECT SUM(weighted_result_raw) FROM assessment_items WHERE assessment_id=1;','82.750000')
  check('Score zero rejected','UPDATE assessment_items SET score=0 WHERE id=1;',error=3819)
  check('Score 101 rejected','UPDATE assessment_items SET score=101 WHERE id=1;',error=3819)
  check('Generated result cannot be overridden','UPDATE assessment_items SET weighted_result_raw=99 WHERE id=1;',error=3105)
  check('Wrong unit/division rejected',"INSERT INTO employee_placements(employee_id,unit_id,division_id) VALUES(3,1,2);",error=1452)
  check('Double active placement rejected','INSERT INTO employee_placements(employee_id,unit_id,division_id) VALUES(1,2,1);',error=1062)
  check('Revoked historical placement allowed',"INSERT INTO employee_placements(employee_id,unit_id,division_id,started_at,ended_at) VALUES(1,1,1,'2024-01-01','2025-01-01');")
  check('Second active division head rejected',"INSERT INTO scope_assignments(user_id,role_key,division_id) VALUES(4,'kepala_divisi',1);",error=1062)
  check('Role-scope shape rejected',"INSERT INTO scope_assignments(user_id,role_key,division_id) VALUES(3,'kepala_unit',1);",error=3819)
  check('Ineligible role assignment rejected',"INSERT INTO scope_assignments(user_id,role_key,division_id) VALUES(5,'kepala_divisi',1);",error=1452)
  check('Revoked historical head allowed',"INSERT INTO scope_assignments(user_id,role_key,division_id,assigned_at,revoked_at) VALUES(2,'kepala_divisi',1,'2024-01-01','2025-01-01');")
  check('Empty login identifiers rejected',"INSERT INTO users(name,email,login_nip,password) VALUES('Invalid','',' ','fixture-only');",error=3819)
  check('Cycle date must be first of month',"UPDATE assessment_cycles SET assessment_month='2026-10-02' WHERE id=1;",error=3819)
  check('Invalid deadline order rejected',"UPDATE assessment_cycles SET submission_due_at='2027-01-01' WHERE id=1;",error=3819)
  check('Assessment employee-placement mismatch rejected','UPDATE assessments SET placement_id=3 WHERE id=1;',error=1452)
  check('Assessment template-position mismatch rejected','UPDATE assessments SET position_id=2 WHERE id=1;',error=1452)
  check('Item source-template mismatch rejected','UPDATE assessment_items SET source_kpi_item_id=7 WHERE id=1;',error=1452)
  check('Item assessment-template mismatch rejected','UPDATE assessment_items SET source_template_id=2,source_kpi_item_id=7 WHERE id=1;',error=1452)
  cols='employee_id,cycle_id,placement_id,division_id,unit_id,position_id,kpi_template_id,employee_name_snapshot,nip_snapshot,division_name_snapshot,unit_name_snapshot,position_name_snapshot,template_name_snapshot,template_version_snapshot'
  check('One assessment per employee-cycle','INSERT INTO assessments('+cols+') SELECT '+cols+' FROM assessments WHERE id=1;',error=1062)
  check('Incomplete Final rejected',"UPDATE assessments SET status='final' WHERE id=1;",error=3819)
  check('Complete Final accepted',"UPDATE assessments SET status='final',total_score_raw=82.750000,approved_at=UTC_TIMESTAMP(6),approved_by=2,finalized_at=UTC_TIMESTAMP(6),finalized_by=1,category_code_snapshot='baik',category_label_snapshot='Baik',category_lower_snapshot=80,category_upper_snapshot=90 WHERE id=1;")
  check('Final category mismatch rejected','UPDATE assessments SET category_lower_snapshot=90 WHERE id=1;',error=3819)
  check('Historical parent delete restricted','DELETE FROM divisions WHERE id=1;',error=1451)
  check('Snapshot survives master label changes',"UPDATE kpi_items SET name='Renamed master label' WHERE id=1; SELECT kpi_name_snapshot FROM assessment_items WHERE id=1;",'KPI 1')
  check('Audit request key unique',"INSERT INTO audit_events(subject_type,subject_id,actor_user_id,action,request_key) VALUES('assessment',1,1,'fixture','fixture-key');")
  check('Duplicate audit request rejected',"INSERT INTO audit_events(subject_type,subject_id,actor_user_id,action,request_key) VALUES('assessment',1,1,'fixture','fixture-key');",error=1062)
  check('Transactional audit rolls back',"START TRANSACTION; INSERT INTO audit_events(subject_type,subject_id,action,request_key) VALUES('assessment',1,'rollback','rollback-key'); ROLLBACK; SELECT COUNT(*) FROM audit_events WHERE request_key='rollback-key';",'0')
  check('Division-1 query excludes division-2','SELECT COUNT(*) FROM assessments WHERE division_id IN (SELECT division_id FROM scope_assignments WHERE user_id=2 AND role_key=\'kepala_divisi\' AND revoked_at IS NULL);','1')
  check('Unit-1 query excludes unit-3','SELECT COUNT(*) FROM assessments WHERE unit_id IN (SELECT unit_id FROM scope_assignments WHERE user_id=3 AND role_key=\'kepala_unit\' AND revoked_at IS NULL);','1')
 finally:
  if proc.poll() is None:
   subprocess.run([str(admin),'--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(port),'--user=root','shutdown'],capture_output=True,timeout=20,**flags)
   try:proc.wait(timeout=20)
   except subprocess.TimeoutExpired:proc.terminate();proc.wait(timeout=10)
  report={'engine':version.strip(),'target':'MySQL 8.4 LTS','targetVersionTested':version.find('Ver 8.4')>=0,'isolatedInstanceStopped':proc.poll() is not None,'temporaryDataDir':str(run),'cases':results,'passed':sum(t['pass'] for t in results),'total':len(results),'limitations':['No Laravel runtime or application authorization implemented/tested.','Cross-row business invariants and Final immutability require application policies/services/DB privileges.','Run again on target MySQL 8.4 before migrations are accepted.']}
  dest=ROOT/'docs/database/baseline-validation-result.json';dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='cases'}))
if __name__=='__main__':main()
