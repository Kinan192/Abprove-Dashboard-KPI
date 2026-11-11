# ERD

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : memiliki
    ROLES ||--o{ USER_ROLES : memberi
    USER_ROLES ||--o{ SCOPE_ASSIGNMENTS : memenuhi_role
    DIVISIONS ||--o{ UNITS : menaungi
    DIVISIONS ||--o{ SCOPE_ASSIGNMENTS : cakupan_divisi
    UNITS ||--o{ SCOPE_ASSIGNMENTS : cakupan_unit
    POSITIONS ||--o{ EMPLOYEES : jabatan
    USERS o|--o| EMPLOYEES : akun_opsional
    EMPLOYEES ||--o{ EMPLOYEE_PLACEMENTS : riwayat_penempatan
    UNITS ||--o{ EMPLOYEE_PLACEMENTS : lokasi
    DIVISIONS ||--o{ EMPLOYEE_PLACEMENTS : konteks
    POSITIONS ||--o{ KPI_TEMPLATES : template_jabatan
    KPI_TEMPLATES ||--o{ KPI_ITEMS : daftar_kpi
    ASSESSMENT_CYCLES ||--o{ CYCLE_CATEGORIES : kategori_per_siklus
    ASSESSMENT_CYCLES ||--o{ ASSESSMENTS : periode
    EMPLOYEES ||--o{ ASSESSMENTS : dinilai
    EMPLOYEE_PLACEMENTS ||--o{ ASSESSMENTS : konteks_awal
    KPI_TEMPLATES ||--o{ ASSESSMENTS : versi_sumber
    ASSESSMENTS ||--o{ ASSESSMENT_ITEMS : salinan_kpi_dan_nilai
    KPI_ITEMS ||--o{ ASSESSMENT_ITEMS : asal_kpi
    ASSESSMENTS ||--o{ AUDIT_EVENTS : aktivitas
    USERS ||--o{ AUDIT_EVENTS : pelaku
    SCOPE_ASSIGNMENTS o|--o{ ASSESSMENTS : kepala_unit_dinilai
    USERS ||--o{ OPERATION_REQUESTS : retry_terikat_aktor
```

FK komposit fisik menjaga konteks placement dan template. assessment_kind member/unit_head dan head_assignment_id membedakan objek penilaian; satu employee+cycle tetap satu lembar. operation_requests menyimpan hasil retry atomik. Diagram konseptual tidak menampilkan seluruh key. Sumber aktif: [SCHEMA.md](SCHEMA.md) dan [migrations](../../database/migrations/README.md).
