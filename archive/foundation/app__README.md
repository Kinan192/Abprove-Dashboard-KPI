# MVC backend - struktur saja

`Models/` untuk Eloquent; `Http/Controllers/` untuk menerima request dan memilih response/view. `Http/Requests/` memvalidasi input, `Policies/` mengotorisasi aksi per record, dan middleware memvalidasi akun/sesi.

Business transactions berada di `Services/<domain>/`, dan read queries scoped di `Queries/`. Ini helper MVC satu aplikasi, bukan app/Modules atau dua backend. Tidak ada lapisan repository generik, API publik atau implementasi Livewire pada fase ini.

View berada di `../resources/views`. Nama kelas dan tanggung jawab dirinci di `../docs/architecture/ARCHITECTURE.md`. Folder .gitkeep bukan klaim fitur sudah berjalan.
