-- KPI Kinerja domain schema v2.0 / approved flow v1.3
-- MySQL 8.4 / new empty database only. Do not import into the existing application database.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE roles (
    role_key VARCHAR(32) NOT NULL,
    label VARCHAR(90) NOT NULL,
    PRIMARY KEY (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO roles(role_key,label) VALUES ('super_hc','Super HC'),('kepala_divisi','Kepala Divisi'),('kepala_unit','Kepala Unit');

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NULL,
    login_nip VARCHAR(64) NULL,
    role_key VARCHAR(32) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NULL,
    photo_path VARCHAR(255) NULL,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id), UNIQUE KEY uq_users_email(email), UNIQUE KEY uq_users_login_nip(login_nip),
    CONSTRAINT fk_users_role FOREIGN KEY(role_key) REFERENCES roles(role_key),
    CONSTRAINT chk_user_identifier CHECK ((email IS NOT NULL AND CHAR_LENGTH(TRIM(email))>0) OR (login_nip IS NOT NULL AND CHAR_LENGTH(TRIM(login_nip))>0)),
    CONSTRAINT chk_user_active CHECK (is_active IN(0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_key VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, role_key),
    KEY idx_user_roles_role (role_key),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_key) REFERENCES roles(role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE divisions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(190) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_divisions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE units (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    division_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(190) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_units_code (code),
    UNIQUE KEY uq_units_id_division (id, division_id),
    KEY idx_units_division_active (division_id, is_active),
    CONSTRAINT fk_units_division FOREIGN KEY (division_id) REFERENCES divisions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE positions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(190) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_positions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE employees (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nip VARCHAR(64) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    position_id BIGINT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id), UNIQUE KEY uq_employees_nip(nip),
    KEY idx_employee_position_active(position_id,is_active),
    CONSTRAINT fk_employee_position FOREIGN KEY(position_id) REFERENCES positions(id),
    CONSTRAINT chk_employee_nip CHECK (CHAR_LENGTH(TRIM(nip))>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scope_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    role_key VARCHAR(32) NOT NULL,
    division_id BIGINT UNSIGNED NULL,
    unit_id BIGINT UNSIGNED NULL,
    assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    revoked_at DATETIME(6) NULL,
    assigned_by BIGINT UNSIGNED NULL,
    revoked_by BIGINT UNSIGNED NULL,
    note TEXT NULL,
    active_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN revoked_at IS NULL THEN user_id END) STORED,
    active_division_head_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN role_key='kepala_divisi' AND revoked_at IS NULL THEN division_id END) STORED,
    active_unit_head_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN role_key='kepala_unit' AND revoked_at IS NULL THEN unit_id END) STORED,
    PRIMARY KEY(id), UNIQUE KEY uq_active_scope_user(active_user_id),
    UNIQUE KEY uq_active_division_head(active_division_head_id), UNIQUE KEY uq_active_unit_head(active_unit_head_id),
    UNIQUE KEY uq_assignment_user_unit(id,user_id,unit_id),
    UNIQUE KEY uq_assignment_user_division(id,user_id,division_id),
    KEY idx_scope_user_active(user_id,revoked_at,role_key),
    KEY idx_scope_division(division_id), KEY idx_scope_unit(unit_id),
    CONSTRAINT fk_scope_membership FOREIGN KEY(user_id,role_key) REFERENCES user_roles(user_id,role_key),
    CONSTRAINT fk_scope_division FOREIGN KEY(division_id) REFERENCES divisions(id),
    CONSTRAINT fk_scope_unit FOREIGN KEY(unit_id) REFERENCES units(id),
    CONSTRAINT fk_scope_assigner FOREIGN KEY(assigned_by) REFERENCES users(id),
    CONSTRAINT fk_scope_revoker FOREIGN KEY(revoked_by) REFERENCES users(id),
    CONSTRAINT chk_scope_shape CHECK (
    (role_key='super_hc' AND division_id IS NULL AND unit_id IS NULL) OR
    (role_key='kepala_divisi' AND division_id IS NOT NULL AND unit_id IS NULL) OR
    (role_key='kepala_unit' AND division_id IS NULL AND unit_id IS NOT NULL)),
    CONSTRAINT chk_scope_dates CHECK (revoked_at IS NULL OR revoked_at>=assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE employee_placements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    division_id BIGINT UNSIGNED NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE NULL,
    reason TEXT NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    open_employee_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN effective_until IS NULL THEN employee_id END) STORED,
    PRIMARY KEY(id), UNIQUE KEY uq_open_placement(open_employee_id),
    UNIQUE KEY uq_placement_employee_from(employee_id,effective_from),
    UNIQUE KEY uq_placement_context(id,employee_id,unit_id,division_id),
    KEY idx_placement_unit_dates(unit_id,effective_from,effective_until),
    CONSTRAINT fk_placement_employee FOREIGN KEY(employee_id) REFERENCES employees(id),
    CONSTRAINT fk_placement_unit_division FOREIGN KEY(unit_id,division_id) REFERENCES units(id,division_id),
    CONSTRAINT fk_placement_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT chk_placement_month CHECK (DAYOFMONTH(effective_from)=1 AND (effective_until IS NULL OR (DAYOFMONTH(effective_until)=1 AND effective_until>=effective_from)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kpi_scopes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope_level VARCHAR(16) NOT NULL,
    unit_id BIGINT UNSIGNED NULL,
    division_id BIGINT UNSIGNED NULL,
    scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN scope_level='unit' THEN unit_id ELSE division_id END) STORED,
    next_version INT UNSIGNED NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id), UNIQUE KEY uq_kpi_scope_area(scope_level,scope_key),
    UNIQUE KEY uq_kpi_scope_context(id,scope_level,scope_key),
    CONSTRAINT fk_kpi_scope_unit FOREIGN KEY(unit_id) REFERENCES units(id),
    CONSTRAINT fk_kpi_scope_division FOREIGN KEY(division_id) REFERENCES divisions(id),
    CONSTRAINT fk_kpi_scope_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT chk_kpi_scope_shape CHECK ((scope_level='unit' AND unit_id IS NOT NULL AND division_id IS NULL) OR (scope_level='division' AND division_id IS NOT NULL AND unit_id IS NULL)),
    CONSTRAINT chk_next_version CHECK (next_version>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kpi_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope_id BIGINT UNSIGNED NOT NULL,
    scope_level VARCHAR(16) NOT NULL,
    scope_key BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    version INT UNSIGNED NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE NULL,
    expected_item_count SMALLINT UNSIGNED NOT NULL,
    sealed_at DATETIME(6) NULL COMMENT 'Only null inside atomic apply transaction; no draft endpoint',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id), UNIQUE KEY uq_template_scope_version(scope_id,version),
    UNIQUE KEY uq_template_context(id,scope_id,scope_level,scope_key),
    KEY idx_template_effective(scope_id,effective_from,effective_until),
    CONSTRAINT fk_template_scope FOREIGN KEY(scope_id,scope_level,scope_key) REFERENCES kpi_scopes(id,scope_level,scope_key),
    CONSTRAINT fk_template_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT chk_template_month CHECK (DAYOFMONTH(effective_from)=1 AND (effective_until IS NULL OR (DAYOFMONTH(effective_until)=1 AND effective_until>=effective_from))),
    CONSTRAINT chk_template_count CHECK (expected_item_count BETWEEN 1 AND 200),
    CONSTRAINT chk_template_version CHECK (version>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kpi_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    template_id BIGINT UNSIGNED NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    pillar VARCHAR(64) NOT NULL,
    name VARCHAR(500) NOT NULL,
    numerator TEXT NULL,
    denominator TEXT NULL,
    measurement_formula TEXT NULL,
    target_text VARCHAR(500) NOT NULL,
    weight_percent DECIMAL(8,4) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_kpi_items_order (template_id, sort_order),
    UNIQUE KEY uq_kpi_item_template (id, template_id),
    CONSTRAINT fk_kpi_items_template FOREIGN KEY (template_id) REFERENCES kpi_templates(id),
    CONSTRAINT chk_kpi_items_weight CHECK (weight_percent > 0 AND weight_percent <= 100),
    CONSTRAINT chk_kpi_items_pillar CHECK (pillar IN (
        'Technical Care', 'Access', 'Coordination and Continuity',
        'Interpersonal Care', 'Efficient'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_cycles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_month DATE NOT NULL,
    opens_at DATETIME(6) NOT NULL,
    submission_due_at DATETIME(6) NOT NULL,
    approval_due_at DATETIME(6) NOT NULL,
    closes_at DATETIME(6) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'planned',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id), UNIQUE KEY uq_cycle_month(assessment_month),
    CONSTRAINT fk_cycle_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT chk_cycle_month CHECK (DAYOFMONTH(assessment_month)=1),
    CONSTRAINT chk_cycle_status CHECK (status IN('planned','open','closed')),
    CONSTRAINT chk_cycle_dates CHECK (opens_at<submission_due_at AND submission_due_at<=approval_due_at AND approval_due_at<=closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cycle_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cycle_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(32) NOT NULL,
    label VARCHAR(90) NOT NULL,
    lower_bound DECIMAL(12,6) NOT NULL,
    upper_bound DECIMAL(12,6) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cycle_category_code (cycle_id, code),
    UNIQUE KEY uq_cycle_category_order (cycle_id, sort_order),
    CONSTRAINT fk_cycle_categories_cycle FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(id),
    CONSTRAINT chk_cycle_categories_bounds CHECK (
        lower_bound >= 0 AND (upper_bound IS NULL OR upper_bound > lower_bound)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_kind VARCHAR(16) NOT NULL,
    employee_id BIGINT UNSIGNED NULL,
    subject_user_id BIGINT UNSIGNED NULL,
    head_assignment_id BIGINT UNSIGNED NULL,
    cycle_id BIGINT UNSIGNED NOT NULL,
    placement_id BIGINT UNSIGNED NULL,
    division_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    position_id BIGINT UNSIGNED NULL,
    kpi_template_id BIGINT UNSIGNED NOT NULL,
    kpi_scope_id BIGINT UNSIGNED NOT NULL,
    kpi_scope_level VARCHAR(16) NOT NULL,
    kpi_scope_key BIGINT UNSIGNED NOT NULL,
    scorer_user_id BIGINT UNSIGNED NOT NULL,
    scorer_unit_assignment_id BIGINT UNSIGNED NULL,
    scorer_division_assignment_id BIGINT UNSIGNED NULL,
    reviewer_user_id BIGINT UNSIGNED NOT NULL,
    reviewer_assignment_id BIGINT UNSIGNED NOT NULL,
    employee_name_snapshot VARCHAR(160) NOT NULL COMMENT 'Subject name, including account-only heads',
    nip_snapshot VARCHAR(64) NOT NULL,
    division_name_snapshot VARCHAR(190) NOT NULL,
    unit_name_snapshot VARCHAR(190) NOT NULL,
    position_name_snapshot VARCHAR(190) NOT NULL,
    template_name_snapshot VARCHAR(190) NOT NULL,
    template_version_snapshot INT UNSIGNED NOT NULL,
    expected_item_count SMALLINT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL,
    positive_finding TEXT NULL,
    negative_finding TEXT NULL,
    return_reason TEXT NULL,
    total_score_raw DECIMAL(12,6) NOT NULL,
    category_code_snapshot VARCHAR(32) NULL,
    category_label_snapshot VARCHAR(90) NULL,
    category_lower_snapshot DECIMAL(12,6) NULL,
    category_upper_snapshot DECIMAL(12,6) NULL,
    submitted_at DATETIME(6) NOT NULL,
    finalized_at DATETIME(6) NULL,
    finalized_by BIGINT UNSIGNED NULL,
    lock_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY(id),
    UNIQUE KEY uq_assessment_staff_cycle(employee_id,cycle_id),
    UNIQUE KEY uq_assessment_head_cycle(subject_user_id,cycle_id),
    UNIQUE KEY uq_assessment_template_context(id,kpi_template_id),
    KEY idx_assessment_cycle_status_scope(cycle_id,status,division_id,unit_id),
    KEY idx_assessment_division_cycle(division_id,cycle_id,status),
    KEY idx_assessment_unit_cycle(unit_id,cycle_id,status),
    CONSTRAINT fk_assessment_employee FOREIGN KEY(employee_id) REFERENCES employees(id),
    CONSTRAINT fk_assessment_subject_user FOREIGN KEY(subject_user_id) REFERENCES users(id),
    CONSTRAINT fk_assessment_head_assignment FOREIGN KEY(head_assignment_id,subject_user_id,unit_id) REFERENCES scope_assignments(id,user_id,unit_id),
    CONSTRAINT fk_assessment_cycle FOREIGN KEY(cycle_id) REFERENCES assessment_cycles(id),
    CONSTRAINT fk_assessment_placement FOREIGN KEY(placement_id,employee_id,unit_id,division_id) REFERENCES employee_placements(id,employee_id,unit_id,division_id),
    CONSTRAINT fk_assessment_unit_division FOREIGN KEY(unit_id,division_id) REFERENCES units(id,division_id),
    CONSTRAINT fk_assessment_position FOREIGN KEY(position_id) REFERENCES positions(id),
    CONSTRAINT fk_assessment_template FOREIGN KEY(kpi_template_id,kpi_scope_id,kpi_scope_level,kpi_scope_key) REFERENCES kpi_templates(id,scope_id,scope_level,scope_key),
    CONSTRAINT fk_assessment_scorer_unit FOREIGN KEY(scorer_unit_assignment_id,scorer_user_id,unit_id) REFERENCES scope_assignments(id,user_id,unit_id),
    CONSTRAINT fk_assessment_scorer_division FOREIGN KEY(scorer_division_assignment_id,scorer_user_id,division_id) REFERENCES scope_assignments(id,user_id,division_id),
    CONSTRAINT fk_assessment_reviewer FOREIGN KEY(reviewer_assignment_id,reviewer_user_id,division_id) REFERENCES scope_assignments(id,user_id,division_id),
    CONSTRAINT fk_assessment_finalizer FOREIGN KEY(finalized_by) REFERENCES users(id),
    CONSTRAINT chk_assessment_shape CHECK (
    (assessment_kind='member' AND employee_id IS NOT NULL AND subject_user_id IS NULL AND head_assignment_id IS NULL AND placement_id IS NOT NULL AND position_id IS NOT NULL AND kpi_scope_level='unit' AND kpi_scope_key=unit_id AND scorer_unit_assignment_id IS NOT NULL AND scorer_division_assignment_id IS NULL) OR
    (assessment_kind='unit_head' AND employee_id IS NULL AND subject_user_id IS NOT NULL AND head_assignment_id IS NOT NULL AND placement_id IS NULL AND position_id IS NULL AND kpi_scope_level='division' AND kpi_scope_key=division_id AND scorer_unit_assignment_id IS NULL AND scorer_division_assignment_id IS NOT NULL AND scorer_user_id=reviewer_user_id AND scorer_user_id<>subject_user_id)),
    CONSTRAINT chk_assessment_status CHECK (status IN('submitted','returned','final')),
    CONSTRAINT chk_assessment_total CHECK (total_score_raw BETWEEN 10 AND 100),
    CONSTRAINT chk_assessment_count CHECK (expected_item_count BETWEEN 1 AND 200),
    CONSTRAINT chk_return_reason CHECK (status<>'returned' OR (return_reason IS NOT NULL AND CHAR_LENGTH(TRIM(return_reason))>0)),
    CONSTRAINT chk_final_metadata CHECK (status<>'final' OR (finalized_at IS NOT NULL AND finalized_by IS NOT NULL AND finalized_by=reviewer_user_id AND category_code_snapshot IS NOT NULL AND category_label_snapshot IS NOT NULL AND category_lower_snapshot IS NOT NULL AND total_score_raw>=category_lower_snapshot AND (category_upper_snapshot IS NULL OR total_score_raw<category_upper_snapshot)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_id BIGINT UNSIGNED NOT NULL,
    source_kpi_item_id BIGINT UNSIGNED NOT NULL,
    source_template_id BIGINT UNSIGNED NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    pillar_snapshot VARCHAR(64) NOT NULL,
    kpi_name_snapshot VARCHAR(500) NOT NULL,
    numerator_snapshot TEXT NULL,
    denominator_snapshot TEXT NULL,
    formula_snapshot TEXT NULL,
    target_snapshot VARCHAR(500) NOT NULL,
    weight_percent_snapshot DECIMAL(8,4) NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    weighted_result_raw DECIMAL(12,6) GENERATED ALWAYS AS
        (CASE WHEN score IS NULL THEN NULL ELSE score * weight_percent_snapshot / 100 END) STORED,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_assessment_item_source (assessment_id, source_kpi_item_id),
    UNIQUE KEY uq_assessment_item_order (assessment_id, sort_order),
    CONSTRAINT fk_assessment_items_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    CONSTRAINT fk_assessment_items_source FOREIGN KEY (source_kpi_item_id, source_template_id)
        REFERENCES kpi_items(id, template_id),
    CONSTRAINT fk_assessment_items_template_context FOREIGN KEY (assessment_id, source_template_id)
        REFERENCES assessments(id, kpi_template_id),
    CONSTRAINT chk_assessment_items_score CHECK (score BETWEEN 10 AND 100),
    CONSTRAINT chk_assessment_items_weight CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
    CONSTRAINT chk_assessment_items_result_presence CHECK (
        (score IS NULL AND weighted_result_raw IS NULL)
        OR (score IS NOT NULL AND weighted_result_raw IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subject_type VARCHAR(64) NOT NULL,
    subject_id BIGINT UNSIGNED NOT NULL,
    assessment_id BIGINT UNSIGNED NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    actor_role_key VARCHAR(32) NULL,
    scope_division_id BIGINT UNSIGNED NULL,
    scope_unit_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    status_before VARCHAR(16) NULL,
    status_after VARCHAR(16) NULL,
    before_data JSON NULL,
    after_data JSON NULL,
    reason TEXT NULL,
    request_key VARCHAR(64) NULL,
    recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_audit_request_key (request_key),
    KEY idx_audit_assessment_time (assessment_id, recorded_at),
    KEY idx_audit_subject_time (subject_type, subject_id, recorded_at),
    KEY idx_audit_actor_time (actor_user_id, recorded_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE operation_requests (request_id CHAR(36) NOT NULL, actor_user_id BIGINT UNSIGNED NOT NULL, action VARCHAR(120) NOT NULL, payload_hash CHAR(64) NOT NULL, context_key VARCHAR(160) NOT NULL, response_data JSON NOT NULL, created_at DATETIME(6) NOT NULL, PRIMARY KEY(request_id), KEY idx_operation_actor_time(actor_user_id,created_at), CONSTRAINT fk_operation_actor FOREIGN KEY(actor_user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notification_reads (
    user_id BIGINT UNSIGNED NOT NULL,
    cycle_id BIGINT UNSIGNED NOT NULL,
    notification_key VARCHAR(160) NOT NULL,
    read_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(user_id,cycle_id,notification_key),
    CONSTRAINT fk_notification_reader FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT fk_notification_cycle FOREIGN KEY(cycle_id) REFERENCES assessment_cycles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE domain_schema_versions (
    version VARCHAR(24) NOT NULL,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO domain_schema_versions(version) VALUES ('2.0.0');

-- Sealing exists only inside the atomic apply transaction, never as an editable draft.
DELIMITER $$
CREATE TRIGGER seal_kpi_template BEFORE UPDATE ON kpi_templates FOR EACH ROW
BEGIN
 DECLARE item_count INT;
 DECLARE weight_sum DECIMAL(12,4);
 IF OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL THEN
  SELECT COUNT(*),COALESCE(SUM(weight_percent),0) INTO item_count,weight_sum FROM kpi_items WHERE template_id=OLD.id;
  IF item_count<>NEW.expected_item_count OR weight_sum<>100.0000 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='INVALID_TEMPLATE_WEIGHT_OR_COUNT';
  END IF;
 ELSEIF OLD.sealed_at IS NOT NULL THEN
  IF NOT(NEW.scope_id<=>OLD.scope_id) OR NOT(NEW.scope_level<=>OLD.scope_level) OR NOT(NEW.scope_key<=>OLD.scope_key)
    OR NOT(NEW.name<=>OLD.name) OR NEW.version<>OLD.version OR NEW.effective_from<>OLD.effective_from
    OR NEW.expected_item_count<>OLD.expected_item_count OR NOT(NEW.sealed_at<=>OLD.sealed_at)
    OR NEW.created_by<>OLD.created_by THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEMPLATE_IMMUTABLE';
  END IF;
  IF NEW.effective_until IS NOT NULL AND EXISTS(SELECT 1 FROM assessments a JOIN assessment_cycles c ON c.id=a.cycle_id WHERE a.kpi_template_id=OLD.id AND c.assessment_month>NEW.effective_until) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEMPLATE_RANGE_IN_USE';
  END IF;
 END IF;
END$$
CREATE TRIGGER protect_kpi_item_insert BEFORE INSERT ON kpi_items FOR EACH ROW
BEGIN
 IF (SELECT sealed_at FROM kpi_templates WHERE id=NEW.template_id) IS NOT NULL THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEMPLATE_IMMUTABLE';
 END IF;
END$$
CREATE TRIGGER protect_kpi_item_update BEFORE UPDATE ON kpi_items FOR EACH ROW
BEGIN
 IF (SELECT sealed_at FROM kpi_templates WHERE id=OLD.template_id) IS NOT NULL OR
    (SELECT sealed_at FROM kpi_templates WHERE id=NEW.template_id) IS NOT NULL THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEMPLATE_IMMUTABLE';
 END IF;
END$$
CREATE TRIGGER assessment_initial_submission BEFORE INSERT ON assessments FOR EACH ROW
BEGIN
 IF NEW.status<>'submitted' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='INITIAL_STATUS_MUST_BE_SUBMITTED'; END IF;
 IF (SELECT sealed_at FROM kpi_templates WHERE id=NEW.kpi_template_id) IS NULL THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEMPLATE_NOT_SEALED';
 END IF;
END$$
CREATE TRIGGER protect_assessment_update BEFORE UPDATE ON assessments FOR EACH ROW
BEGIN
 DECLARE item_count INT;
 DECLARE weight_sum DECIMAL(12,4);
 DECLARE score_sum DECIMAL(12,6);
 IF OLD.status='final' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE'; END IF;
 IF NOT(NEW.employee_id<=>OLD.employee_id) OR NOT(NEW.subject_user_id<=>OLD.subject_user_id)
   OR NOT(NEW.head_assignment_id<=>OLD.head_assignment_id) OR NEW.cycle_id<>OLD.cycle_id
   OR NOT(NEW.placement_id<=>OLD.placement_id) OR NEW.unit_id<>OLD.unit_id OR NEW.division_id<>OLD.division_id
   OR NOT(NEW.position_id<=>OLD.position_id) OR NEW.assessment_kind<>OLD.assessment_kind
   OR NEW.kpi_template_id<>OLD.kpi_template_id OR NEW.kpi_scope_id<>OLD.kpi_scope_id
   OR NEW.kpi_scope_level<>OLD.kpi_scope_level OR NEW.kpi_scope_key<>OLD.kpi_scope_key
   OR NEW.scorer_user_id<>OLD.scorer_user_id OR NOT(NEW.scorer_unit_assignment_id<=>OLD.scorer_unit_assignment_id)
   OR NOT(NEW.scorer_division_assignment_id<=>OLD.scorer_division_assignment_id)
   OR NEW.reviewer_user_id<>OLD.reviewer_user_id OR NEW.reviewer_assignment_id<>OLD.reviewer_assignment_id
   OR NEW.expected_item_count<>OLD.expected_item_count THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ASSESSMENT_CONTEXT_IMMUTABLE';
 END IF;
 IF NEW.status IN('submitted','final') THEN
  SELECT COUNT(*),COALESCE(SUM(weight_percent_snapshot),0),COALESCE(SUM(weighted_result_raw),0)
    INTO item_count,weight_sum,score_sum FROM assessment_items WHERE assessment_id=OLD.id;
  IF item_count<>NEW.expected_item_count OR weight_sum<>100.0000 OR score_sum<>NEW.total_score_raw THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ASSESSMENT_INCOMPLETE';
  END IF;
 END IF;
END$$
CREATE TRIGGER protect_assessment_delete BEFORE DELETE ON assessments FOR EACH ROW
BEGIN
 IF OLD.status='final' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE'; END IF;
END$$
CREATE TRIGGER protect_assessment_item_insert BEFORE INSERT ON assessment_items FOR EACH ROW
BEGIN
 IF (SELECT status FROM assessments WHERE id=NEW.assessment_id)='final' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE';
 END IF;
END$$
CREATE TRIGGER protect_assessment_item_update BEFORE UPDATE ON assessment_items FOR EACH ROW
BEGIN
 IF (SELECT status FROM assessments WHERE id=OLD.assessment_id)='final' OR
    (SELECT status FROM assessments WHERE id=NEW.assessment_id)='final' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE';
 END IF;
 IF NEW.assessment_id<>OLD.assessment_id OR NEW.source_kpi_item_id<>OLD.source_kpi_item_id
   OR NEW.source_template_id<>OLD.source_template_id OR NEW.sort_order<>OLD.sort_order
   OR NEW.pillar_snapshot<>OLD.pillar_snapshot OR NEW.kpi_name_snapshot<>OLD.kpi_name_snapshot
   OR NOT(NEW.numerator_snapshot<=>OLD.numerator_snapshot) OR NOT(NEW.denominator_snapshot<=>OLD.denominator_snapshot)
   OR NOT(NEW.formula_snapshot<=>OLD.formula_snapshot) OR NOT(NEW.target_snapshot<=>OLD.target_snapshot)
   OR NEW.weight_percent_snapshot<>OLD.weight_percent_snapshot THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ASSESSMENT_ITEM_SNAPSHOT_IMMUTABLE';
 END IF;
 IF (SELECT status FROM assessments WHERE id=OLD.assessment_id)<>'returned' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SCORES_LOCKED';
 END IF;
END$$
CREATE TRIGGER protect_assessment_item_delete BEFORE DELETE ON assessment_items FOR EACH ROW
BEGIN
 IF (SELECT status FROM assessments WHERE id=OLD.assessment_id)='final' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE';
 END IF;
END$$
CREATE TRIGGER protect_audit_update BEFORE UPDATE ON audit_events FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='AUDIT_APPEND_ONLY'; END$$
CREATE TRIGGER protect_audit_delete BEFORE DELETE ON audit_events FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='AUDIT_APPEND_ONLY'; END$$
DELIMITER ;
