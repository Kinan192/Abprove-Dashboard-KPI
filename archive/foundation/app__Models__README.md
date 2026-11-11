# Rencana model Eloquent

| Model | Tabel |
|---|---|
| User | `users` |
| Role | `roles` |
| UserRole | `user_roles` |
| Division | `divisions` |
| Unit | `units` |
| Position | `positions` |
| Employee | `employees` |
| ScopeAssignment | `scope_assignments` |
| EmployeePlacement | `employee_placements` |
| KpiTemplate | `kpi_templates` |
| KpiItem | `kpi_items` |
| AssessmentCycle | `assessment_cycles` |
| CycleCategory | `cycle_categories` |
| Assessment | `assessments` |
| AssessmentItem | `assessment_items` |
| AuditEvent | `audit_events` |

`UserRole` adalah pivot dengan PK komposit, tanpa id/incrementing; Eloquent standar tidak mendukung PK komposit untuk model biasa. Role memakai PK string role_key dan tanpa timestamps. CycleCategory juga tidak mempunyai timestamps; AuditEvent hanya recorded_at. Jangan mass assign status, snapshot, scope, actor, hasil generated atau metadata final dari request. Detail implementasi mengikuti dokumen schema; model belum dibuat.
