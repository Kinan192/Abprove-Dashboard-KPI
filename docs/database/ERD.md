# ERD schema v3.0

Lihat [kamus dan aturan](SCHEMA.md). Unit bersifat turunan divisi; penanggung jawab dipisahkan sebagai riwayat assignment.

```mermaid
erDiagram
    roles ||--o{ users : current_role
    users ||--o{ auth_accounts : credentials
    users ||--o{ auth_sessions : better_auth_sessions
    users ||--o{ user_roles : eligibility_history
    user_roles ||--o{ scope_assignments : eligible
    divisions ||--o{ units : contains
    divisions ||--o{ scope_assignments : division_head
    units ||--o{ scope_assignments : unit_head
    positions ||--o{ employees : classifies
    employees ||--o{ employee_placements : placement_history
    units ||--o{ employee_placements : receives
    units ||--o| kpi_scopes : unit_kpi
    divisions ||--o| kpi_scopes : division_kpi
    kpi_scopes ||--o{ kpi_templates : versions
    kpi_templates ||--|{ kpi_items : defines
    assessment_cycles ||--|{ cycle_categories : categorizes
    assessment_cycles ||--o{ assessments : evaluated_month
    employees o|--o{ assessments : staff_subject
    users o|--o{ assessments : head_subject
    scope_assignments o|--o{ assessments : subject_head
    scope_assignments ||--o{ assessments : scorer_and_reviewer
    employee_placements o|--o{ assessments : staff_placement
    kpi_templates ||--o{ assessments : snapshot_source
    assessments ||--|{ assessment_items : complete_scores
    kpi_items ||--o{ assessment_items : snapshot_source
    users ||--o{ audit_events : performs
    users ||--o{ operation_requests : retries
    users ||--o{ notification_reads : reads
    assessment_cycles ||--o{ notification_reads : context
```

staff_subject dan head_subject adalah XOR. Seorang Kepala Unit merupakan users + scope_assignments, tidak menjadi staf berakun. audit_events.assessment_id sengaja bukan FK yang menghalangi penghapusan kiriman non-Final; ID peristiwa historis tetap tercatat setelah pembatalan.

auth_verifications menyimpan identifier dan nilai verifikasi Better Auth tanpa FK user. users tidak mempunyai password; auth_accounts adalah sumber hash. auth_sessions menyimpan context_key dan waktu aktivitas server untuk batas tidak aktif 30 menit. Pengiriman email belum diaktifkan.
