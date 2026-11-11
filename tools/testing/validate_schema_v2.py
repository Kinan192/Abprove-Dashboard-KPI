"""Validate domain schema v2 directly on disposable MySQL 8.4."""
from pathlib import Path
import json
import re
from isolated_mysql import IsolatedMysql

ROOT=Path(__file__).resolve().parents[2]
checks=[]
def run(db,name,sql,error=None,equals=None):
 result=db.query(sql,check=False)
 if error:
  passed=result.returncode!=0 and re.search(r'ERROR '+str(error)+r'\b',result.stderr) is not None
 else:
  passed=result.returncode==0 and (equals is None or result.stdout.strip()==str(equals))
 checks.append({'name':name,'passed':passed})
 if not passed:raise AssertionError(name+': '+result.stderr+' '+result.stdout)

def template_sql(tid,sid,level,key,weight='60',count=2):
 return f"""INSERT INTO kpi_templates(id,scope_id,scope_level,scope_key,name,version,effective_from,expected_item_count,created_by) VALUES ({tid},{sid},'{level}',{key},'KPI {tid}',1,'2026-11-01',{count},1);
 INSERT INTO kpi_items(template_id,sort_order,pillar,name,target_text,weight_percent) VALUES ({tid},1,'Technical Care','KPI satu','100%',{weight}),({tid},2,'Efficient','KPI dua','95%',40);
 UPDATE kpi_templates SET sealed_at=NOW(6) WHERE id={tid};"""

def header(aid,head=False,**changes):
 row={'id':aid,'assessment_kind':'unit_head' if head else 'member','employee_id':None if head else 1,'subject_user_id':3 if head else None,'head_assignment_id':3 if head else None,'cycle_id':1,'placement_id':None if head else 1,'division_id':1,'unit_id':1,'position_id':None if head else 1,'kpi_template_id':2 if head else 1,'kpi_scope_id':2 if head else 1,'kpi_scope_level':'division' if head else 'unit','kpi_scope_key':1,'scorer_user_id':2 if head else 3,'scorer_unit_assignment_id':None if head else 3,'scorer_division_assignment_id':2 if head else None,'reviewer_user_id':2,'reviewer_assignment_id':2,'employee_name_snapshot':'Kepala' if head else 'Staf','nip_snapshot':'NIP','division_name_snapshot':'Divisi 1','unit_name_snapshot':'Unit 1','position_name_snapshot':'Kepala Unit' if head else 'Staf','template_name_snapshot':'KPI','template_version_snapshot':1,'expected_item_count':2,'status':'submitted','total_score_raw':86,'submitted_at':'2026-11-09 00:00:00'}
 row.update(changes)
 literal=lambda v:'NULL' if v is None else str(v) if isinstance(v,(int,float)) else "'"+str(v).replace("'","''")+"'"
 return 'INSERT INTO assessments('+','.join(row)+') VALUES ('+','.join(literal(v) for v in row.values())+');'
def items(aid,tid=1):
 return f"""INSERT INTO assessment_items(assessment_id,source_kpi_item_id,source_template_id,sort_order,pillar_snapshot,kpi_name_snapshot,target_snapshot,weight_percent_snapshot,score)
 SELECT {aid},id,{tid},sort_order,pillar,name,target_text,weight_percent,IF(sort_order=1,90,80) FROM kpi_items WHERE template_id={tid};"""
def final(aid,**changes):
 fields={'status':"'final'",'finalized_by':'2','finalized_at':'NOW(6)','category_code_snapshot':"'baik'",'category_label_snapshot':"'Baik'",'category_lower_snapshot':'80','category_upper_snapshot':'90'}
 fields.update(changes)
 return 'UPDATE assessments SET '+','.join(k+'='+v for k,v in fields.items())+' WHERE id='+str(aid)+';'

db=IsolatedMysql('kpi_schema_v2_test')
report={'schema':'2.0.0','databaseAppliedToApplication':False}
try:
 with db:
  run(db,'fresh DDL imports', (ROOT/'database/migrations/sql/2026_11_10_domain_v2.sql').read_text(encoding='utf-8'))
  run(db,'20 domain tables','SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()',equals=20)
  run(db,'11 protection triggers','SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE()',equals=11)
  run(db,'staff has no account column',"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='employees' AND column_name='user_id'",equals=0)
  run(db,'only three account roles','SELECT COUNT(*) FROM roles',equals=3)
  run(db,'accounts before structure',"""INSERT INTO users(id,name,email,login_nip,role_key,password) VALUES
  (1,'HC','hc@example.test','HC','super_hc','test-hash'),
  (2,'KD1','kd1@example.test','KD1','kepala_divisi','test-hash'),
  (3,'KU1','ku1@example.test','KU1','kepala_unit','test-hash'),
  (4,'KD2','kd2@example.test','KD2','kepala_divisi','test-hash'),
  (5,'KU2','ku2@example.test','KU2','kepala_unit','test-hash');
  INSERT INTO user_roles(user_id,role_key) SELECT id,role_key FROM users;""")
  run(db,'organization and separate staff',"""INSERT INTO positions(id,code,name) VALUES(1,'STAFF','Staf');
  INSERT INTO divisions(id,code,name) VALUES(1,'D1','Divisi 1'),(2,'D2','Divisi 2');
  INSERT INTO units(id,division_id,code,name) VALUES(1,1,'U1','Unit 1'),(2,2,'U2','Unit 2'),(3,1,'U3','Unit kosong');
  INSERT INTO scope_assignments(id,user_id,role_key,division_id,unit_id,assigned_by) VALUES
  (1,1,'super_hc',NULL,NULL,1),(2,2,'kepala_divisi',1,NULL,1),(3,3,'kepala_unit',NULL,1,1),(4,4,'kepala_divisi',2,NULL,1),(5,5,'kepala_unit',NULL,2,1);
  INSERT INTO employees(id,nip,full_name,position_id) VALUES(1,'S1','Staf 1',1),(2,'S2','Staf 2',1);
  INSERT INTO employee_placements(id,employee_id,unit_id,division_id,effective_from,reason,created_by) VALUES(1,1,1,1,'2026-11-01','Awal',1),(2,2,2,2,'2026-11-01','Awal',1);
  INSERT INTO kpi_scopes(id,scope_level,unit_id,division_id,created_by) VALUES(1,'unit',1,NULL,1),(2,'division',NULL,1,1),(3,'unit',2,NULL,1);
  INSERT INTO assessment_cycles(id,assessment_month,opens_at,submission_due_at,approval_due_at,closes_at,status,created_by) VALUES(1,'2026-11-01','2026-11-01','2026-12-05','2026-12-10','2026-12-15','open',1);
  INSERT INTO cycle_categories(cycle_id,code,label,lower_bound,upper_bound,sort_order) VALUES(1,'baik','Baik',80,90,1);""")
  run(db,'additional cycle',"INSERT INTO assessment_cycles SELECT 2,'2026-12-01',opens_at,submission_due_at,approval_due_at,closes_at,status,created_by,created_at,updated_at FROM assessment_cycles WHERE id=1")
  run(db,'one active head per account',"INSERT INTO scope_assignments(user_id,role_key,assigned_by) VALUES(1,'super_hc',1)",error=1062)
  run(db,'one head per unit',"INSERT INTO scope_assignments(user_id,role_key,unit_id,assigned_by) VALUES(5,'kepala_unit',1,1)",error=1062)
  run(db,'mismatched division placement',"INSERT INTO employee_placements(employee_id,unit_id,division_id,effective_from,effective_until,reason,created_by) VALUES(1,2,1,'2027-01-01','2027-01-01','Salah',1)",error=1452)
  run(db,'scope XOR rejects missing unit',"INSERT INTO kpi_scopes(scope_level,created_by) VALUES('unit',1)",error=3819)
  run(db,'template scope mismatch',template_sql(7,1,'division',1),error=1452)
  run(db,'unit template applied atomically',template_sql(1,1,'unit',1))
  run(db,'division template applied atomically',template_sql(2,2,'division',1))
  run(db,'invalid weight seal rolls transaction back',"START TRANSACTION;"+template_sql(3,3,'unit',2,'59')+"COMMIT;",error=1644)
  run(db,'failed template leaves no row','SELECT COUNT(*) FROM kpi_templates WHERE id=3',equals=0)
  run(db,'second unit template',template_sql(3,3,'unit',2))
  run(db,'sealed template cannot edit name',"UPDATE kpi_templates SET name='Diubah' WHERE id=1",error=1644)
  run(db,'sealed template cannot change weight',"UPDATE kpi_items SET weight_percent=50 WHERE template_id=1",error=1644)
  run(db,'sealed template rejects item addition',"INSERT INTO kpi_items(template_id,sort_order,pillar,name,target_text,weight_percent) VALUES(1,3,'Efficient','Baru','100%',1)",error=1644)
  run(db,'valid complete submission header',header(10))
  run(db,'no draft persistence',header(11,status='draft'),error=1644)
  run(db,'no approved intermediary',header(11,status='approved'),error=1644)
  run(db,'member requires a staff subject',header(11,employee_id=None),error=3819)
  run(db,'member cannot contain account subject',header(11,subject_user_id=3),error=3819)
  run(db,'KPI Unit cannot cross unit boundary',header(11,employee_id=2,placement_id=2,unit_id=2,division_id=2,scorer_user_id=5,scorer_unit_assignment_id=5,reviewer_user_id=4,reviewer_assignment_id=4),error=3819)
  run(db,'reviewer must match division',header(11,cycle_id=2,reviewer_user_id=4,reviewer_assignment_id=4),error=1452)
  run(db,'scorer must match unit',header(11,cycle_id=2,scorer_user_id=5,scorer_unit_assignment_id=5),error=1452)
  run(db,'incomplete submission cannot become Final',final(10),error=1644)
  run(db,'complete item snapshots',items(10))
  run(db,'generated decimal result exact','SELECT SUM(weighted_result_raw) FROM assessment_items WHERE assessment_id=10',equals='86.000000')
  run(db,'submitted scores cannot be changed','UPDATE assessment_items SET score=99 WHERE assessment_id=10',error=1644)
  run(db,'return requires nonempty reason',"UPDATE assessments SET status='returned',return_reason=' ' WHERE id=10",error=3819)
  run(db,'returned with reason',"UPDATE assessments SET status='returned',return_reason='Periksa layanan' WHERE id=10")
  for score,code in [('NULL',1048),('9',3819),('101',3819)]:
   run(db,'invalid score '+score,f'UPDATE assessment_items SET score={score} WHERE assessment_id=10',error=code)
  run(db,'returned score correction','UPDATE assessment_items SET score=90 WHERE assessment_id=10')
  run(db,'snapshot weight remains immutable','UPDATE assessment_items SET weight_percent_snapshot=50 WHERE assessment_id=10',error=1644)
  run(db,'complete resubmission',"UPDATE assessments SET status='submitted',return_reason=NULL,total_score_raw=90 WHERE id=10")
  run(db,'duplicate staff cycle rejected',header(11),error=1062)
  run(db,'Final requires finalizer identity',final(10,total_score_raw='90',category_lower_snapshot='90',category_upper_snapshot='NULL',finalized_by='NULL'),error=3819)
  run(db,'Final finalizer must be reviewer',final(10,total_score_raw='90',category_lower_snapshot='90',category_upper_snapshot='NULL',finalized_by='1'),error=3819)
  run(db,'KD Final accepted',final(10,total_score_raw='90',category_lower_snapshot='90',category_upper_snapshot='NULL'))
  run(db,'Final header immutable',"UPDATE assessments SET positive_finding='Ubah' WHERE id=10",error=1644)
  run(db,'Final item immutable','UPDATE assessment_items SET score=80 WHERE assessment_id=10',error=1644)
  run(db,'Final items cannot be removed','DELETE FROM assessment_items WHERE assessment_id=10',error=1644)
  run(db,'Final header cannot be removed','DELETE FROM assessments WHERE id=10',error=1644)
  run(db,'account-only head submission',header(20,True))
  run(db,'head uses division KPI',items(20,2))
  run(db,'head direct Final in one transaction',final(20))
  run(db,'head cycle unique',header(21,True),error=1062)
  run(db,'head needs correct account assignment',header(21,True,subject_user_id=5),error=1452)
  run(db,'used template range protected',"UPDATE kpi_templates SET effective_until='2026-10-01' WHERE id=1",error=1644)
  run(db,'used item cannot be deleted','DELETE FROM kpi_items WHERE template_id=1',error=1451)
  run(db,'used unit cannot be deleted','DELETE FROM units WHERE id=1',error=1451)
  run(db,'unused unit may be deleted','DELETE FROM units WHERE id=3')
  run(db,'new complete submission to withdraw',header(40,employee_id=2,placement_id=2,unit_id=2,division_id=2,scorer_user_id=5,scorer_unit_assignment_id=5,reviewer_user_id=4,reviewer_assignment_id=4,kpi_template_id=3,kpi_scope_id=3,kpi_scope_key=2)+items(40,3))
  run(db,'withdraw clears rows and retains audit',"""INSERT INTO audit_events(subject_type,subject_id,assessment_id,actor_user_id,action) VALUES('assessment',40,40,5,'assessment.withdrawn'); DELETE FROM assessment_items WHERE assessment_id=40; DELETE FROM assessments WHERE id=40;""")
  run(db,'withdraw means no active assessment','SELECT COUNT(*) FROM assessments WHERE id=40',equals=0)
  run(db,'withdraw audit survives','SELECT COUNT(*) FROM audit_events WHERE assessment_id=40',equals=1)
  run(db,'audit append-only update',"UPDATE audit_events SET action='changed'",error=1644)
  run(db,'audit append-only delete','DELETE FROM audit_events',error=1644)
  run(db,'schema marker correct','SELECT version FROM domain_schema_versions',equals='2.0.0')
except Exception as error:
 report['error']=str(error)
finally:
 report.update(db.metadata());report['checks']=checks;report['passed']=all(x['passed'] for x in checks) and not report.get('error');report['assertions']=len(checks)
 dest=ROOT/'docs/database/schema-v2-validation.json';dest.write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps({k:v for k,v in report.items() if k not in ['checks','tempDirectory']}))
if not report['passed']:raise SystemExit(1)
