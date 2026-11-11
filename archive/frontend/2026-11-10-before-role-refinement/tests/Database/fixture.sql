-- Synthetic fixtures for the private instance created by validate_schema.py only.
INSERT INTO users(id,name,login_nip,password) VALUES
(1,'HC fixture','HC-1','not-a-login-hash'),(2,'KD Umum','KD-1','not-a-login-hash'),
(3,'KU IT','KU-1','not-a-login-hash'),(4,'KD Medical','KD-2','not-a-login-hash'),(5,'KU UGD','KU-2','not-a-login-hash');
INSERT INTO user_roles(user_id,role_key) VALUES(1,'super_hc'),(2,'kepala_divisi'),(3,'kepala_unit'),(4,'kepala_divisi'),(5,'kepala_unit');
INSERT INTO divisions(id,code,name) VALUES(1,'UMUM','Umum & SDM'),(2,'MED','Pelayanan Medis');
INSERT INTO units(id,division_id,code,name) VALUES(1,1,'IT','IT'),(2,1,'SDM','SDM'),(3,2,'UGD','UGD');
INSERT INTO positions(id,code,name) VALUES(1,'IT','Staf IT'),(2,'DOC','Dokter');
INSERT INTO employees(id,nip,full_name,position_id) VALUES(1,'IT-001','A',1),(2,'SDM-001','B',1),(3,'MED-001','C',2);
INSERT INTO employee_placements(id,employee_id,unit_id,division_id) VALUES(1,1,1,1),(2,2,2,1),(3,3,3,2);
INSERT INTO scope_assignments(user_id,role_key,division_id,unit_id) VALUES(1,'super_hc',NULL,NULL),(2,'kepala_divisi',1,NULL),(3,'kepala_unit',NULL,1),(4,'kepala_divisi',2,NULL),(5,'kepala_unit',NULL,3);
INSERT INTO kpi_templates(id,position_id,name,template_year,version,status,created_by) VALUES(1,1,'IT',2026,1,'published',1),(2,2,'Doctor',2026,1,'published',1);
INSERT INTO kpi_items(id,template_id,sort_order,pillar,name,weight_percent) VALUES
(1,1,1,'Technical Care','KPI 1',15),(2,1,2,'Technical Care','KPI 2',10),
(3,1,3,'Interpersonal Care','KPI 3',10),(4,1,4,'Coordination and Continuity','KPI 4',25),
(5,1,5,'Access','KPI 5',20),(6,1,6,'Efficient','KPI 6',20),(7,2,1,'Technical Care','Doctor KPI',100);
INSERT INTO assessment_cycles(id,assessment_month,opens_at,submission_due_at,approval_due_at,closes_at,status,created_by)
VALUES(1,'2026-10-01','2026-11-01','2026-11-08','2026-11-10','2026-11-15','open',1);
INSERT INTO cycle_categories(cycle_id,code,label,lower_bound,upper_bound,sort_order) VALUES
(1,'kurang','Kurang',0,70,1),(1,'cukup','Cukup',70,80,2),(1,'baik','Baik',80,90,3),(1,'sangat_baik','Sangat Baik',90,NULL,4);
INSERT INTO assessments(id,employee_id,cycle_id,placement_id,division_id,unit_id,position_id,kpi_template_id,employee_name_snapshot,nip_snapshot,division_name_snapshot,unit_name_snapshot,position_name_snapshot,template_name_snapshot,template_version_snapshot)
VALUES(1,1,1,1,1,1,1,1,'A','IT-001','Umum & SDM','IT','Staf IT','IT',1),
(2,3,1,3,2,3,2,2,'C','MED-001','Pelayanan Medis','UGD','Dokter','Doctor',1);
INSERT INTO assessment_items(assessment_id,source_kpi_item_id,source_template_id,sort_order,pillar_snapshot,kpi_name_snapshot,weight_percent_snapshot,score)
SELECT 1,id,template_id,sort_order,pillar,name,weight_percent,
CASE sort_order WHEN 1 THEN 90 WHEN 2 THEN 80 WHEN 3 THEN 100 WHEN 4 THEN 85 ELSE 75 END
FROM kpi_items WHERE template_id=1;
