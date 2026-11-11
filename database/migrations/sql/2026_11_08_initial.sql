-- KPI KINERJA BULANAN — physical schema reference for MySQL 8.4 / InnoDB
-- Source: PRD KPI Kinerja Revisi v1.1 (2026-11-08)
-- Revision: MVC foundation v1.2. Canonical schema for this structure-only phase.
-- Future Laravel migrations must be equivalent; do not bootstrap both paths on one database.
-- Target: MySQL 8.4 LTS; engine-specific validation is required before implementation.
-- Use a dedicated database and a UTC connection/session. DO NOT run this on production without review.
-- No DROP TABLE is included to avoid destructive accidents.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 01. ACCOUNTS / RBAC
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NULL,
    login_nip VARCHAR(64) NULL,
    password VARCHAR(255) NOT NULL COMMENT 'password hash only',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_login_nip (login_nip),
    CONSTRAINT chk_users_identifier CHECK ((email IS NOT NULL AND CHAR_LENGTH(TRIM(email)) > 0) OR (login_nip IS NOT NULL AND CHAR_LENGTH(TRIM(login_nip)) > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE roles (
    role_key VARCHAR(32) NOT NULL,
    label VARCHAR(90) NOT NULL,
    PRIMARY KEY (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO roles (role_key, label) VALUES
  ('super_hc', 'Super HC / SDM'),
  ('kepala_divisi', 'Kepala Divisi'),
  ('kepala_unit', 'Kepala Unit');

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_key VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, role_key),
    KEY idx_user_roles_role (role_key),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_key) REFERENCES roles(role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 02. ORGANIZATION
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
    UNIQUE KEY uq_units_division_code (division_id, code),
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
    user_id BIGINT UNSIGNED NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_employees_nip (nip),
    UNIQUE KEY uq_employees_user_id (user_id),
    KEY idx_employees_position_active (position_id, is_active),
    CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(id),
    CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- One active head per division/unit is a PRD USUL, not yet formally approved.
-- Generated UNIQUE indexed columns allow multiple revoked historical assignments.
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
    active_division_head_id BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN role_key = 'kepala_divisi' AND revoked_at IS NULL THEN division_id ELSE NULL END) STORED,
    active_unit_head_id BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN role_key = 'kepala_unit' AND revoked_at IS NULL THEN unit_id ELSE NULL END) STORED,
    active_super_hc_user_id BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN role_key = 'super_hc' AND revoked_at IS NULL THEN user_id ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_division_head (active_division_head_id),
    UNIQUE KEY uq_active_unit_head (active_unit_head_id),
    UNIQUE KEY uq_active_super_hc_membership (active_super_hc_user_id),
    KEY idx_scope_user_active (user_id, revoked_at, role_key),
    KEY idx_scope_division (division_id),
    KEY idx_scope_unit (unit_id),
    CONSTRAINT fk_scope_membership FOREIGN KEY (user_id, role_key)
        REFERENCES user_roles(user_id, role_key),
    CONSTRAINT fk_scope_division FOREIGN KEY (division_id) REFERENCES divisions(id),
    CONSTRAINT fk_scope_unit FOREIGN KEY (unit_id) REFERENCES units(id),
    CONSTRAINT fk_scope_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
    CONSTRAINT fk_scope_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id),
    CONSTRAINT chk_scope_role_shape CHECK (
        (role_key = 'super_hc' AND division_id IS NULL AND unit_id IS NULL)
        OR (role_key = 'kepala_divisi' AND division_id IS NOT NULL AND unit_id IS NULL)
        OR (role_key = 'kepala_unit' AND division_id IS NULL AND unit_id IS NOT NULL)
    ),
    CONSTRAINT chk_scope_revoke_date CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE employee_placements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    division_id BIGINT UNSIGNED NOT NULL COMMENT 'division snapshot for this placement',
    started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ended_at DATETIME(6) NULL,
    reason TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    ended_by BIGINT UNSIGNED NULL,
    active_employee_id BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN ended_at IS NULL THEN employee_id ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_one_active_placement (active_employee_id),
    UNIQUE KEY uq_placement_context (id, employee_id, unit_id, division_id),
    KEY idx_placements_employee_dates (employee_id, started_at),
    KEY idx_placements_unit_active (unit_id, ended_at),
    KEY idx_placements_division (division_id),
    CONSTRAINT fk_placements_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_placements_unit FOREIGN KEY (unit_id, division_id) REFERENCES units(id, division_id),
    CONSTRAINT fk_placements_division FOREIGN KEY (division_id) REFERENCES divisions(id),
    CONSTRAINT fk_placements_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_placements_ended_by FOREIGN KEY (ended_by) REFERENCES users(id),
    CONSTRAINT chk_placements_end_date CHECK (ended_at IS NULL OR ended_at >= started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 03. KPI MASTER / VERSIONING
CREATE TABLE kpi_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    position_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    template_year SMALLINT UNSIGNED NOT NULL,
    version INT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    effective_from DATE NULL,
    effective_until DATE NULL,
    published_at DATETIME(6) NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_kpi_template_version (position_id, template_year, version),
    UNIQUE KEY uq_template_id_position (id, position_id),
    KEY idx_kpi_template_lookup (position_id, template_year, status),
    CONSTRAINT fk_templates_position FOREIGN KEY (position_id) REFERENCES positions(id),
    CONSTRAINT fk_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_templates_status CHECK (status IN ('draft', 'published', 'retired')),
    CONSTRAINT chk_templates_version CHECK (version > 0),
    CONSTRAINT chk_templates_effective CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE kpi_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    template_id BIGINT UNSIGNED NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    pillar VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    numerator TEXT NULL,
    denominator TEXT NULL,
    measurement_formula TEXT NULL,
    target_text VARCHAR(255) NULL,
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

-- 04. CYCLE / PERFORMANCE CATEGORIES
CREATE TABLE assessment_cycles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_month DATE NOT NULL COMMENT 'first date of evaluated month (e.g. 2026-10-01)',
    opens_at DATETIME(6) NOT NULL COMMENT 'UTC',
    submission_due_at DATETIME(6) NOT NULL COMMENT 'UTC',
    approval_due_at DATETIME(6) NOT NULL COMMENT 'UTC',
    closes_at DATETIME(6) NOT NULL COMMENT 'UTC',
    status VARCHAR(16) NOT NULL DEFAULT 'planned',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_assessment_cycle_month (assessment_month),
    CONSTRAINT fk_cycles_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_cycles_status CHECK (status IN ('planned', 'open', 'closed')),
    CONSTRAINT chk_cycle_month_first_day CHECK (DAYOFMONTH(assessment_month) = 1),
    CONSTRAINT chk_cycles_time_order CHECK (
        opens_at <= submission_due_at AND
        submission_due_at <= approval_due_at AND
        approval_due_at <= closes_at
    )
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

-- 05. ASSESSMENTS
-- Belum diisi = absence of row; valid values here: draft/submitted/returned/approved/final.
CREATE TABLE assessments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL,
    cycle_id BIGINT UNSIGNED NOT NULL,
    placement_id BIGINT UNSIGNED NOT NULL,
    division_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    position_id BIGINT UNSIGNED NOT NULL,
    kpi_template_id BIGINT UNSIGNED NOT NULL,
    employee_name_snapshot VARCHAR(160) NOT NULL,
    nip_snapshot VARCHAR(64) NOT NULL,
    division_name_snapshot VARCHAR(190) NOT NULL,
    unit_name_snapshot VARCHAR(190) NOT NULL,
    position_name_snapshot VARCHAR(190) NOT NULL,
    template_name_snapshot VARCHAR(190) NOT NULL,
    template_version_snapshot INT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    positive_finding TEXT NULL,
    negative_finding TEXT NULL,
    total_score_raw DECIMAL(12,6) NULL,
    category_code_snapshot VARCHAR(32) NULL,
    category_label_snapshot VARCHAR(90) NULL,
    category_lower_snapshot DECIMAL(12,6) NULL,
    category_upper_snapshot DECIMAL(12,6) NULL,
    submitted_at DATETIME(6) NULL,
    approved_at DATETIME(6) NULL,
    finalized_at DATETIME(6) NULL,
    approved_by BIGINT UNSIGNED NULL,
    finalized_by BIGINT UNSIGNED NULL,
    lock_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_assessment_employee_cycle (employee_id, cycle_id),
    UNIQUE KEY uq_assessment_template_context (id, kpi_template_id),
    KEY idx_assessments_cycle_status_scope (cycle_id, status, division_id, unit_id),
    KEY idx_assessments_cycle_division_status (cycle_id, division_id, status),
    KEY idx_assessments_unit_cycle (unit_id, cycle_id),
    KEY idx_assessments_template (kpi_template_id),
    CONSTRAINT fk_assessments_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_assessments_cycle FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(id),
    CONSTRAINT fk_assessments_placement FOREIGN KEY (placement_id, employee_id, unit_id, division_id)
        REFERENCES employee_placements(id, employee_id, unit_id, division_id),
    CONSTRAINT fk_assessments_division FOREIGN KEY (division_id) REFERENCES divisions(id),
    CONSTRAINT fk_assessments_unit FOREIGN KEY (unit_id) REFERENCES units(id),
    CONSTRAINT fk_assessments_position FOREIGN KEY (position_id) REFERENCES positions(id),
    CONSTRAINT fk_assessments_template FOREIGN KEY (kpi_template_id, position_id) REFERENCES kpi_templates(id, position_id),
    CONSTRAINT fk_assessments_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_assessments_finalized_by FOREIGN KEY (finalized_by) REFERENCES users(id),
    CONSTRAINT chk_assessments_status CHECK (status IN ('draft', 'submitted', 'returned', 'approved', 'final')),
    CONSTRAINT chk_assessments_total CHECK (total_score_raw IS NULL OR total_score_raw BETWEEN 0 AND 100),
    CONSTRAINT chk_final_metadata CHECK (status <> 'final' OR (
        total_score_raw IS NOT NULL AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL
        AND approved_at IS NOT NULL AND approved_by IS NOT NULL
        AND category_code_snapshot IS NOT NULL AND category_label_snapshot IS NOT NULL
        AND category_lower_snapshot IS NOT NULL
        AND total_score_raw >= category_lower_snapshot
        AND (category_upper_snapshot IS NULL OR total_score_raw < category_upper_snapshot)
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_id BIGINT UNSIGNED NOT NULL,
    source_kpi_item_id BIGINT UNSIGNED NOT NULL,
    source_template_id BIGINT UNSIGNED NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL,
    pillar_snapshot VARCHAR(64) NOT NULL,
    kpi_name_snapshot VARCHAR(255) NOT NULL,
    numerator_snapshot TEXT NULL,
    denominator_snapshot TEXT NULL,
    formula_snapshot TEXT NULL,
    target_snapshot VARCHAR(255) NULL,
    weight_percent_snapshot DECIMAL(8,4) NOT NULL,
    score TINYINT UNSIGNED NULL,
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
    CONSTRAINT chk_assessment_items_score CHECK (score IS NULL OR score BETWEEN 10 AND 100),
    CONSTRAINT chk_assessment_items_weight CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
    CONSTRAINT chk_assessment_items_result_presence CHECK (
        (score IS NULL AND weighted_result_raw IS NULL)
        OR (score IS NOT NULL AND weighted_result_raw IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 06. AUDIT
-- Do NOT grant UPDATE/DELETE on this table to runtime DB account in production.
-- Retain backups for >= 5 years. Sanitize before_data/after_data in application.
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
    CONSTRAINT fk_audit_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- END SCHEMA REFERENCE.
-- IMPORTANT invariants that require Laravel Actions/Policies (not enforced by this SQL):
-- 1. SUM(kpi_items.weight_percent) == 100.0000 before publish.
-- 2. No editing of published templates or finalized assessments/items.
-- 3. Role-scoped SELECT/UPDATE/aggregate on every endpoint.
-- 4. Active placement eligibility, impact preview and transfer blocking (PRD O-6).
--    Composite FKs enforce unit/division, placement/employee and source-template consistency.
-- 5. No category gaps/overlaps and no template effective-date overlap.
-- 6. Full lifecycle transitions, session expiry, audit atomicity, and idempotent retries.
-- 7. Integer input syntax before SQL coercion: a TINYINT stores integers but can coerce a decimal input.
-- 8. Final metadata CHECK is not an immutable-row guard; updates/deletes must be blocked by future application/DB permissions.
