from pathlib import Path
import sys, html, json
sys.path.insert(0, r'C:\Users\Kinan\.kpi-design-tools')
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/KPI-Kinerja-Review-Alur-dan-Fitur.pdf'
QA = ROOT / 'tmp/pdfs/flow-review'
OUT.parent.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
for name, file in [('Body','arial.ttf'),('Body-Bold','arialbd.ttf'),('Body-Italic','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts')/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Body-Bold',italic='Body-Italic',boldItalic='Body-Bold')
INK = colors.HexColor('#1D2433'); GREEN = colors.HexColor('#064E3B'); RED = colors.HexColor('#DC2626')
MUTED = colors.HexColor('#5D6675'); LINE = colors.HexColor('#DCE3DF'); SOFT = colors.HexColor('#F3F6F4')
styles = {
    'body': ParagraphStyle('body',fontName='Body',fontSize=10,leading=14.4,textColor=INK,spaceAfter=7),
    'small': ParagraphStyle('small',fontName='Body',fontSize=8.4,leading=11.6,textColor=MUTED,spaceAfter=6),
    'h1': ParagraphStyle('h1',fontName='Body-Bold',fontSize=22,leading=27,textColor=GREEN,spaceAfter=13),
    'h2': ParagraphStyle('h2',fontName='Body-Bold',fontSize=12.5,leading=17,textColor=INK,spaceBefore=8,spaceAfter=7),
    'title': ParagraphStyle('title',fontName='Body-Bold',fontSize=30,leading=35,textColor=GREEN,spaceAfter=9),
    'table': ParagraphStyle('table',fontName='Body',fontSize=8.4,leading=11.5,textColor=INK),
    'th': ParagraphStyle('th',fontName='Body-Bold',fontSize=8.2,leading=11.3,textColor=colors.white),
    'tb': ParagraphStyle('tb',fontName='Body-Bold',fontSize=8.4,leading=11.5,textColor=GREEN),
    'call': ParagraphStyle('call',fontName='Body',fontSize=9.4,leading=13.8,textColor=GREEN),
}
W = A4[0]-84
def p(text, style='body'):
    return Paragraph(html.escape(str(text)).replace('\n','<br/>'),styles[style])
def rich(text,style='body'): return Paragraph(text,styles[style])
def h(text): return p(text,'h2')
def table(headers, rows, widths, fs=None):
    data = [[p(v,'th') for v in headers]]
    for row in rows: data.append([p(v,'tb' if i==0 else 'table') for i,v in enumerate(row)])
    t = Table(data, colWidths=[W*x for x in widths],hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),GREEN),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,SOFT]),
        ('LINEBELOW',(0,0),(-1,0),.6,GREEN),('LINEBELOW',(0,1),(-1,-1),.4,LINE),
    ]))
    return t
def call(text):
    t=Table([[p(text,'call')]],colWidths=[W])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),SOFT),('BOX',(0,0),(-1,-1),.6,LINE),('LINEBEFORE',(0,0),(0,0),3,GREEN),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
    return t
def steps(items):
    return [rich(f'<b>{i:02d}.</b> {html.escape(text)}') for i,text in enumerate(items,1)]
def notes(lines=3):
    t=Table([[p('Catatan reviewer','tb')]]+[[''] for _ in range(lines)],colWidths=[W],rowHeights=[22]+[25]*lines)
    t.setStyle(TableStyle([('LINEBELOW',(0,1),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),0)]))
    return t
def source(text): return p('Dasar pemeriksaan: '+text,'small')

class CoreFlow(Flowable):
    def __init__(self): Flowable.__init__(self);self.width=W;self.height=206
    def draw(self):
        c=self.canv
        def box(x,y,w,h,title,body,fill=SOFT):
            c.setFillColor(fill);c.setStrokeColor(LINE);c.roundRect(x,y,w,h,7,fill=1,stroke=1)
            c.setFillColor(GREEN);c.setFont('Body-Bold',9);c.drawCentredString(x+w/2,y+h-19,title)
            c.setFillColor(MUTED);c.setFont('Body',8)
            for i,line in enumerate(body):c.drawCentredString(x+w/2,y+h-34-i*11,line)
        def arrow(x1,y1,x2,y2,label=''):
            c.setStrokeColor(GREEN);c.setFillColor(GREEN);c.setLineWidth(1);c.line(x1,y1,x2,y2)
            if x2>x1: pts=[(x2-5,y2+3),(x2,y2),(x2-5,y2-3)]
            elif x2<x1:pts=[(x2+5,y2+3),(x2,y2),(x2+5,y2-3)]
            else:pts=[(x2-3,y2+5),(x2,y2),(x2+3,y2+5)]
            path=c.beginPath();path.moveTo(*pts[0]);path.lineTo(*pts[1]);path.lineTo(*pts[2]);c.drawPath(path,stroke=1)
            if label:c.setFont('Body',7.5);c.drawCentredString((x1+x2)/2,(y1+y2)/2+6,label)
        box(0,142,W,57,'SUPER HC MENYIAPKAN SISTEM',['Struktur, akun, jabatan, KPI dan periode'])
        arrow(76,142,76,125)
        box(0,59,145,66,'KEPALA UNIT',['Isi nilai anggota','Simpan draft / ajukan'])
        box(183,59,145,66,'KEPALA DIVISI',['Tinjau angka anggota','ACC atau kembalikan'])
        box(366,59,W-366,66,'FINAL',['Terkunci','Rekap sesuai cakupan'])
        arrow(145,94,183,94,'ajukan');arrow(328,94,366,94,'ACC')
        c.setStrokeColor(RED);c.line(255,59,255,39);c.line(255,39,72,39);c.line(72,39,72,59)
        c.setFillColor(RED);c.setFont('Body',8);c.drawCentredString(167,24,'Dikembalikan + alasan: KU memperbaiki dan mengajukan ulang')
        c.setFillColor(MUTED);c.setFont('Body',8);c.drawString(0,3,'Jalur terpisah: KD mengisi nilai Kepala Unit, lalu menetapkannya langsung Final.')

pages=[]
def page(title, items): pages.append([p(title,'h1')]+items)

pages.append([
    p('KPI Kinerja','title'),p('Review alur sistem dan fungsi fitur','h1'),
    p('Bahan review pemilik produk | 9 November 2026 | Versi 1.0','small'),
    call('Keputusan yang sudah tetap: Kepala Unit menilai anggota. Kepala Divisi menjadi pemegang keputusan akhir dan menilai Kepala Unit. Super HC mengelola sistem serta laporan, tanpa hak keputusan nilai.'),
    Spacer(1,12),
    p('Dokumen ini menjelaskan pekerjaan setiap role dari login hingga selesai, kegunaan seluruh fitur yang tersedia, dan bagian alur/desain yang perlu dilengkapi. Pemeriksaan memakai kode UI aktif, PRD v1.2 dan kontrak backend, bukan hanya daftar frame desain.'),
    h('Cara membaca kondisi saat ini'),
    table(['Penanda','Makna'],[
        ('NYATA','Login, logout, session dan akses jalur aplikasi memakai backend.'),
        ('SIMULASI','Form/data kerja masih memakai contoh ABprove dan penyimpanan browser. Belum menjadi transaksi lintas akun di server.'),
        ('PARSIAL','Halaman atau kontrol tersedia, tetapi langkah/field untuk pekerjaan utuh belum lengkap.'),
        ('PERLU KEPUTUSAN','Aturan produk belum ditetapkan; usulan pada dokumen ini bukan keputusan otomatis.')
    ],[.21,.79]),
    h('Peta isi'),
    table(['Halaman','Isi review'],[
        ('2-3','Alur bersama, status, login dan fitur umum'),
        ('4-5','Kepala Unit: perjalanan, fungsi fitur dan skenario review'),
        ('6-7','Kepala Divisi: persetujuan anggota dan penilaian Kepala Unit'),
        ('8-9','Super HC: persiapan sistem dan fungsi setiap fitur'),
        ('10-12','Daftar kekurangan, skenario lintas role, keputusan dan lembar catatan')
    ],[.21,.79]),
    Spacer(1,10),p('Penerimaan tampilan visual belum berarti seluruh alur operasional sudah lengkap. Pengujian teknis sebelumnya mencakup skenario yang tersedia; dokumen ini memperluas pemeriksaan terhadap kelengkapan pekerjaan pengguna.','small')
])

page('02 / Alur utama dan status',[
    CoreFlow(),Spacer(1,8),
    table(['Status','Siapa yang bekerja','Tindakan selanjutnya'],[
        ('Belum diisi','KU untuk anggota; KD untuk Kepala Unit','Mulai lembar penilaian.'),
        ('Draft','Penilai yang mengisi lembar','Simpan bertahap. Semua KPI wajib lengkap sebelum diajukan/ditetapkan.'),
        ('Diajukan','KD meninjau anggota','ACC menjadi Final atau kembalikan dengan alasan. KU dapat menarik sebelum diputuskan.'),
        ('Dikembalikan','KU memperbaiki anggota','Baca alasan, revisi, lalu ajukan ulang.'),
        ('Final','Tidak ada lagi pengisian','Hanya baca. Dipakai sebagai hasil resmi dan laporan sesuai cakupan.')
    ],[.19,.29,.52]),
    h('Aturan yang tidak berubah antarhalaman'),
    p('Nilai setiap KPI adalah bilangan bulat 10-100. Bobot template harus 100%. Temuan positif/negatif bersifat opsional dan tidak menambah atau mengurangi angka secara otomatis. Hasil KPI = nilai x bobot / 100; total adalah jumlah hasil semua KPI.'),
    call('Contoh hitung: nilai 90 dengan bobot 15% menghasilkan 13,50. Batas kategori 70/80/90 pada UI merupakan contoh; aturan resmi ditetapkan melalui konfigurasi periode.'),
    p('ACC Kepala Divisi langsung Final. Status Disetujui tidak menjadi antrean terpisah untuk Super HC. Alur membuka kembali Final belum ditetapkan.','small'),
    source('S1, S3, S6. Diagram menunjukkan aturan bisnis; aksi bisnis UI saat ini masih simulasi.')
])

page('03 / Login dan fitur bersama',[
    p('Alur masuk aplikasi: buka /login, isi email atau NIP dan kata sandi, sistem memeriksa akun serta penugasan aktif, kemudian membuka beranda sesuai role. Pengguna tidak memilih role atau divisi dari sidebar.'),
    table(['Fitur','Fungsi dan kegunaan','Kondisi UI saat ini'],[
        ('Login / keluar','Membuka dan mengakhiri sesi akun. Menu keluar ada pada menu akun di navbar.','NYATA pada aplikasi. Login /design-review memakai akun contoh terpisah.'),
        ('Lupa kata sandi','Memulihkan akses ketika pengguna tidak bisa masuk.','SIMULASI konfirmasi; belum mengirim email/petunjuk reset.'),
        ('Sidebar','Navigasi pekerjaan sesuai role. Status aktif menunjukkan posisi halaman.','Tersedia; beberapa halaman sekunder belum jelas posisinya dalam menu.'),
        ('Periode di navbar','Menentukan bulan penilaian yang sedang dilihat/dikerjakan.','Kalender contoh tahun 2026; bulan aktif masih contoh November.'),
        ('Pencarian / Ctrl K','Mencari halaman, nama atau NIP lalu membuka tujuan.','Mencari data contoh dalam konteks role.'),
        ('Notifikasi','Mengantar pengguna ke tugas, revisi atau penilaian yang perlu diperiksa.','Daftar contoh; tandai dibaca hanya feedback lokal.'),
        ('Profil','Meninjau identitas, email/telepon, foto, preferensi notifikasi dan form sandi.','SIMULASI. Foto hanya preview; kata sandi tidak diubah/disimpan.'),
        ('Panduan','Memberi langkah kerja dan batas kewenangan role.','Tersedia untuk setiap role; perlu diselaraskan ketika flow berubah.'),
        ('Tema dan dialog','Tema terang/gelap, konfirmasi tindakan dan drawer detail.','Interaktif lokal, mendukung keyboard dan Escape.'),
        ('Filter / ekspor','Mempersempit data dan membawa rekap ke Excel.','Filter/unduh lokal tersedia. Ekspor belum selalu mengikuti filter layar.')
    ],[.22,.39,.39]),
    Spacer(1,10),call('Penting saat review: setelah login asli, nama akun dapat tampil nyata, tetapi daftar anggota, struktur dan periode pada UI baru masih bersumber dari contoh ABprove. Jangan menganggap daftar tersebut sudah mencerminkan tim database Anda.'),
    source('S2, S4, S5, S7. Akses audit desain tidak mewakili otorisasi produksi.')
])

page('04 / Kepala Unit: pekerjaan utama',[
    p('Tujuan role: menyelesaikan penilaian bulanan anggota unitnya sendiri. Kepala Unit tidak menilai dirinya sendiri dan tidak menetapkan hasil anggota sebagai Final.'),
    *steps([
        'Login, periksa nama unit dan periode, lalu baca tugas pada Beranda.',
        'Buka Isi nilai. Pilih anggota dari daftar dan periksa jabatan serta template KPI.',
        'Isi nilai integer 10-100; lihat hasil berbobot, total dan kategori. Tambahkan temuan bila perlu.',
        'Simpan draft bila belum selesai. Penyimpanan saat ini perlu tombol Simpan draft; bukan autosave.',
        'Setelah seluruh KPI lengkap, pilih Ajukan ke Kepala Divisi dan konfirmasi. Angka menjadi hanya baca.',
        'Pantau Pengajuan. Jika dikembalikan, baca alasan, perbaiki dan ajukan ulang. Jika masih Diajukan, dapat ditarik menjadi Draft.',
        'Jika KD menyetujui, hasil menjadi Final dan terkunci. Buka detail/riwayat untuk membaca hasil.'
    ]),
    h('Kegunaan setiap fitur Kepala Unit'),
    table(['Fitur','Kegunaan','Hasil yang dicari pengguna'],[
        ('Beranda','Ringkasan progres, tenggat, penilaian dikembalikan dan pekerjaan berikutnya.','Mengetahui siapa yang harus dikerjakan lebih dahulu.'),
        ('Isi nilai','Daftar anggota dan lembar KPI, temuan, salin bulan lalu, draft, ajukan, tarik kembali.','Satu penilaian lengkap per anggota dan periode.'),
        ('Pengajuan','Daftar status, cari anggota dan baca detail pengajuan.','Melacak yang masih dikerjakan, menunggu KD, direvisi atau Final.'),
        ('Riwayat','Grafik dan matriks nilai per bulan; klik sel untuk membaca lembar historis.','Menilai perubahan kinerja dengan konteks periode.'),
        ('KPI unit','Membaca nama KPI, pilar, target, formula dan bobot template.','Memahami dasar penilaian; tidak mengubah master.'),
        ('Anggota unit','Melihat kepala/anggota unit dan status penilaian. Halaman sekunder.','Memeriksa cakupan orang yang menjadi tanggung jawabnya.')
    ],[.19,.43,.38]),
    source('S1-S4. Profil, panduan, notifikasi dan ekspor dijelaskan pada halaman 3.')
])

page('05 / Kepala Unit: titik review',[
    h('Kondisi yang harus jelas di layar'),
    table(['Kondisi','Perilaku yang dibutuhkan','Catatan UI saat ini'],[
        ('Belum ada anggota','Jelaskan penyebab dan arahkan menghubungi HC.','Perlu empty state operasional, bukan hanya daftar kosong.'),
        ('Template tidak tersedia','Tunjukkan jabatan/periode bermasalah dan pihak yang memperbaiki.','Belum ada flow pemulihan khusus; template contoh sudah disediakan.'),
        ('Draft belum lengkap','Boleh disimpan; belum boleh diajukan.','Validasi dasar sudah disimulasikan.'),
        ('Nilai dikembalikan','Alasan KD harus mudah ditemukan saat memperbaiki.','Catatan tampil; riwayat alasan/revisi belum lengkap untuk audit bisnis.'),
        ('Batas waktu habis','Jelaskan penilaian berhenti pada tahap mana dan tindakan pengguna.','UI belum memakai jadwal server. Bulan selain bulan aktif contoh hanya baca.'),
        ('Selesai satu anggota','Berikan arah ke anggota berikutnya yang masih membutuhkan nilai.','Belum otomatis melanjutkan; pengguna memilih anggota lagi.'),
        ('Salin bulan lalu','Hanya salin KPI yang cocok dan jelaskan perubahan template.','Simulasi menyalin berdasarkan indeks; perlu penyelarasan versi/KPI saat integrasi.')
    ],[.23,.40,.37]),
    h('Skenario yang bisa Anda review'),
    *steps([
        'Buka anggota yang belum diisi, simpan sebagian nilai, pindah halaman dan kembali. Apakah status draft dan pekerjaan tersisa jelas?',
        'Coba nilai 9, 90,5 dan 101. Apakah pesan kesalahan menunjukkan kolom yang perlu diperbaiki?',
        'Ajukan satu anggota, lalu periksa apakah Anda paham siapa pemilik tugas berikutnya dan mengapa angka terkunci.',
        'Lihat penilaian yang dikembalikan. Apakah catatan KD cukup dekat dengan kolom yang harus diperbaiki?'
    ]),
    notes(3),source('S1, S3-S4. Skenario simpan saat ini memakai browser yang sama, bukan kolaborasi akun server.')
])

page('06 / Kepala Divisi: dua jalur kerja',[
    call('Kepala Divisi mempunyai dua pekerjaan berbeda: meninjau nilai anggota yang diisi KU, dan mengisi nilai Kepala Unit sendiri. Kedua jalur berakhir pada Final oleh KD.'),
    h('A. Meninjau penilaian anggota'),
    *steps([
        'Login, lihat jumlah pengajuan menunggu dan progres unit pada Beranda.',
        'Buka Persetujuan, pilih unit/status atau cari anggota dalam divisinya.',
        'Tinjau lembar: nilai, bobot, hasil, temuan, selisih bulan lalu dan riwayat. Angka anggota hanya dapat dibaca.',
        'Jika benar, pilih Tetapkan Final dan konfirmasi. Jika perlu koreksi, pilih Kembalikan dengan alasan wajib.',
        'Pantau antrean yang tersisa. Setelah KU memperbaiki dan mengajukan ulang, tinjau kembali.'
    ]),
    h('B. Mengisi penilaian Kepala Unit'),
    *steps([
        'Buka Nilai Kepala Unit, lalu pilih kepala unit aktif di bawah divisinya.',
        'Periksa periode dan template; isi KPI serta temuan, kemudian simpan draft bila belum selesai.',
        'Setelah lengkap, pilih Tetapkan nilai Final dan konfirmasi. Tidak diteruskan ke Super HC untuk persetujuan.'
    ]),
    table(['Objek penilaian','Boleh mengubah angka?','Keputusan KD'],[
        ('Anggota yang diisi KU','Tidak. Koreksi melalui pengembalian ke KU.','Final atau dikembalikan dengan alasan.'),
        ('Kepala Unit dalam divisinya','Ya, selama masih draft/perlu pengisian dan periode mengizinkan.','Tetapkan langsung Final.'),
        ('Anggota/kepala unit divisi lain','Tidak mempunyai cakupan.','Tidak dapat memberi keputusan.'),
        ('Kepala Divisi sendiri','Belum ada alur penilaiannya.','Menunggu keputusan produk.')
    ],[.31,.42,.27]),
    source('S1, S3, S6. Satu KD dapat membawahi banyak unit; penugasan bukan akses global.')
])

page('07 / Kepala Divisi: fungsi dan evaluasi',[
    table(['Fitur','Fungsi dan kegunaan','Yang perlu Anda nilai'],[
        ('Beranda','Antrean persetujuan, tenggat, progres unit dan pintasan penilaian kepala.','Apakah tugas anggota dan tugas menilai kepala terlihat terpisah?'),
        ('Persetujuan','Tab Menunggu/Dikembalikan/Final/Semua; filter unit; detail dan keputusan.','Apakah keputusan dan alasan dapat dipahami tanpa membuka banyak halaman?'),
        ('Finalkan pilihan','Menyetujui beberapa pengajuan anggota sekaligus.','Jumlah, unit dan nama yang dipilih harus jelas sebelum keputusan akhir.'),
        ('Nilai Kepala Unit','Mengisi, menyimpan draft dan menetapkan KPI kepala unit.','Identitas sebagai kepala unit dan konteks divisi harus terlihat.'),
        ('Dashboard divisi','Membaca rata-rata, kategori, tren dan matriks bulanan divisi.','Beranda untuk pekerjaan; dashboard untuk analisis. Hindari informasi berulang tanpa fungsi.'),
        ('KPI divisi','Membaca template KPI yang digunakan unit/jabatan.','Perlu hubungan jabatan, versi dan masa berlaku yang jelas.'),
        ('Tim divisi','Melihat unit, kepala unit dan anggota dalam naungan. Halaman sekunder.','Cakupan tim harus mudah ditemukan melalui navigasi.')
    ],[.22,.41,.37]),
    h('Kekurangan yang sudah terlihat'),
    p('Persetujuan sudah memiliki konfirmasi dan alasan pengembalian. Setelah keputusan, drawer ditutup dan pengguna kembali memilih pengajuan; belum ada alur lanjut ke pengajuan berikutnya. Tampilan penilaian Kepala Unit juga belum tersambung utuh dengan rekap dan analitik pada role lain.'),
    p('Grafik berlabel hasil Final pada UI masih menghitung lembar yang nilainya lengkap tanpa menyaring status Final. Bagian peringkat masih memakai urutan data contoh, belum pengurutan hasil dan pengelompokan jabatan/template yang sebanding. Ini perlu koreksi logika tampilan, bukan sekadar perubahan warna.'),
    h('Checklist review KD'),
    table(['Periksa','Catatan Anda'],[
        ('[ ] Tidak ada input angka saat review anggota',''),
        ('[ ] Alasan return jelas dan dapat ditindaklanjuti KU',''),
        ('[ ] Konfirmasi Final menjelaskan bahwa hasil akan terkunci',''),
        ('[ ] Nilai Kepala Unit terlihat sebagai tugas tersendiri','')
    ],[.59,.41]),
    source('S1, S3-S5. Fitur umum tetap mengikuti halaman 3.')
])

page('08 / Super HC: menyiapkan sistem',[
    p('Tujuan role: memastikan struktur, akses, template dan periode siap digunakan, kemudian memantau proses serta membaca rekap seluruh organisasi. HC tidak mengisi, menyetujui, mengembalikan atau membuka kembali nilai Final.'),
    h('Urutan persiapan yang diperlukan'),
    *steps([
        'Buat divisi, jabatan dan unit dengan induk divisi yang jelas.',
        'Buat akun kepala divisi/kepala unit dan tentukan kelayakan role. Membuat akun belum sama dengan menetapkannya sebagai kepala suatu area.',
        'Buat data karyawan. Untuk KU, hubungkan akun dengan identitas karyawan, lalu tempatkan di unit yang akan dipimpinnya.',
        'Tetapkan Kepala Divisi dan Kepala Unit pada area yang benar. Tampilkan siapa membawahi siapa sebelum menyimpan.',
        'Tempatkan anggota ke unit dan jabatan. Anggota biasa belum membutuhkan akun login.',
        'Siapkan template KPI per jabatan/tahun, periksa bobot 100%, tentukan masa berlaku dan publikasikan.',
        'Buat periode: bulan yang dinilai, waktu mulai, batas KU, batas KD, waktu tutup, kategori dan status periode.',
        'Pantau progres, tindak lanjuti konfigurasi yang menghambat, baca rekap/ekspor, lalu tutup periode sesuai kebijakan.'
    ]),
    call('Urutan di atas adalah alur operasional yang dibutuhkan dan didukung konsep backend. UI baru masih parsial untuk proses membuat organisasi dari kosong, memilih penanggung jawab, publish versi KPI dan membuka/menutup periode.'),
    h('Contoh kebutuhan tim Anda'),
    table(['Susunan','Tanggung jawab'],[
        ('Divisi Umum & SDM','Satu KD meninjau anggota seluruh unit di divisi ini dan menilai masing-masing KU.'),
        ('Unit SDM, Logistik dan IT','Masing-masing KU mengisi anggotanya sendiri. KU IT tidak menilai anggota Logistik.'),
        ('Divisi lain','Mempunyai KD/unit/anggota sendiri. Pemisahan berlaku pada daftar, pencarian, detail dan laporan.')
    ],[.34,.66]),
    p('Penempatan anggota ke unit berbeda dari penempatan template KPI. Perpindahan orang perlu asal/tujuan, alasan dan preview dampak. Histori Final tidak ditulis ulang. Backend saat ini memblokir perubahan struktur tertentu bila masih ada penilaian non-Final terdampak.','small'),
    source('S1, S6. Contoh Umum & SDM adalah ilustrasi kebutuhan pengguna, bukan klaim data sudah terpasang.')
])

page('09 / Super HC: fungsi setiap fitur',[
    table(['Fitur','Fungsi dan kegunaan','Kondisi UI saat ini'],[
        ('Beranda','Memantau progres organisasi dan tugas yang belum selesai.','SIMULASI ringkasan/progres divisi-unit.'),
        ('Rekap penilaian','Menelusuri hasil/proses menurut divisi, unit, status dan nama.','Detail hanya baca. Belum menyatukan hasil anggota dan kepala unit secara utuh.'),
        ('Dashboard','Analisis tren, rata-rata, kategori, matriks, peringkat dan temuan.','SIMULASI; seleksi Final dan logika peringkat perlu diperbaiki.'),
        ('Karyawan','Mencatat identitas, NIP, jabatan, unit dan status anggota.','Form tambah/ubah lokal. Perpindahan belum memakai preview dampak.'),
        ('Kepala unit','Melihat/mengubah penanggung jawab unit dan form kepala baru.','Tab dalam Karyawan. Hubungan akun-karyawan-penugasan belum utuh.'),
        ('Divisi & tim','Membentuk hierarki divisi, unit, kepala dan anggota.','Halaman sekunder. Form generik belum memuat seluruh hubungan.'),
        ('Pengguna & akses','Membuat akun, role, status dan cakupan kerja kepala.','Form generik belum menyediakan penetapan role/cakupan yang lengkap.'),
        ('Jabatan','Menjadi dasar klasifikasi anggota dan pemilihan KPI.','Halaman/form lokal; relasi ke template aktif perlu dibuat jelas.'),
        ('Master KPI','Mengelola pilar, indikator, formula/target dan bobot template.','Edit/add/delete dan bobot tersedia; draft/publish/versi/masa berlaku belum tergambar.'),
        ('Impor KPI','Mempercepat input master dari file dengan preview validasi.','CSV dapat dicoba lokal. Parser Excel UI belum terhubung backend.'),
        ('Penempatan KPI','Menentukan template dan rentang mulai untuk karyawan.','Menyimpan riwayat contoh; belum menentukan template lembar nilai nyata.'),
        ('Pengaturan','Mengatur tenggat dan batas kategori hasil.','Field jadwal masih teks contoh; belum alur membuat/membuka/menutup periode.'),
        ('Riwayat aktivitas','Menelusuri pelaku, waktu dan perubahan penting.','Tampilan aktivitas contoh; belum jejak perubahan operasional yang lengkap.'),
        ('Pengingat','Mengingatkan unit yang belum selesai sebelum tenggat.','Feedback simulasi. Tidak mengirim pesan atau berjalan otomatis.'),
        ('Ekspor / salin','Membawa data hasil ke Excel atau clipboard.','XLSX contoh dapat diunduh. Cakupan/filter ekspor perlu diselaraskan.')
    ],[.22,.39,.39]),
    Spacer(1,8),p('Profil, panduan, pencarian, notifikasi, periode dan logout berlaku juga untuk HC; lihat halaman 3. Beberapa fitur HC berada di tautan sekunder, bukan seluruhnya pada sidebar utama.','small'),
    source('S2, S4-S7. Tidak ada fitur keputusan nilai untuk HC.')
])

page('10 / Kekurangan yang perlu diprioritaskan',[
    p('Daftar ini merupakan temuan review kode/UI. Prioritas di bawah adalah usulan urutan perbaikan. Belum integrasi merupakan batas fase yang disengaja; kekurangan desain tetap dapat diselesaikan sebelum integrasi.'),
    table(['ID / prioritas','Temuan saat ini','Hasil perbaikan yang perlu dirancang'],[
        ('G01 / tinggi\nIntegrasi','Tim/periode di halaman pascalogin masih contoh; bukan hasil scope akun database.','Identitas, jumlah tugas dan cakupan selalu berasal dari konteks akun/periode yang sah.'),
        ('G02 / tinggi\nDesain','Membuat divisi, unit, kepala dan anggota belum menjadi perjalanan lengkap.','Flow Divisi > Unit > Kepala > Anggota, termasuk empty state dan langkah berikutnya.'),
        ('G03 / tinggi\nDesain','Form pengguna belum memisahkan akun, role dan penugasan area.','Pilih akun sah, role, area, hubungan karyawan dan preview cakupan.'),
        ('G04 / tinggi\nDesain','Master KPI belum memperlihatkan versi, status publish dan tanggal berlaku.','Draft > validasi > publish; hasil historis tetap memakai snapshot lama.'),
        ('G05 / tinggi\nDesain','Periode masih bulan contoh dan field jadwal teks.','Bulan dinilai vs bulan pemrosesan jelas; status direncanakan/dibuka/ditutup dan tenggat konsisten.'),
        ('G06 / tinggi\nPenyelarasan','Penempatan KPI per orang pada UI berbeda dari backend yang memilih template berdasarkan jabatan/tahun/masa berlaku.','Putuskan mengikuti jabatan atau mendukung override per orang. Jangan menganggap keduanya sudah terhubung.'),
        ('G07 / tinggi\nLogika UI','Analitik belum membatasi Final; peringkat memakai urutan contoh.','Hanya hasil Final, urut nilai dan kelompok pembanding yang sebanding.'),
        ('G08 / tinggi\nAlur laporan','Hasil penilaian Kepala Unit belum masuk utuh ke rekap/analitik lintas role.','Jenis Anggota/Kepala Unit terlihat pada filter, hitungan, detail dan ekspor.'),
        ('G09 / sedang\nDesain','Perpindahan anggota/pergantian kepala belum menampilkan dampak pekerjaan aktif.','Ringkasan asal/tujuan, alasan, guard dampak dan konfirmasi sebelum simpan.'),
        ('G10 / sedang\nUX','Belum ada lanjut anggota/pengajuan berikutnya; halaman Tim/Anggota kurang terlihat.','Antrean kerja dan navigasi sekunder yang mudah ditemukan.'),
        ('G11 / sedang\nKonsistensi','Salin/ekspor belum selalu mengikuti filter aktif; riwayat dan notifikasi masih contoh.','Nyatakan cakupan ekspor; tampilkan pelaku/waktu/perubahan serta tugas yang benar.'),
        ('G12 / sedang\nPemulihan','Sesi habis, gagal simpan, konflik versi, template hilang dan tenggat lewat belum menjadi flow UI server.','Pesan sebab, perlindungan draft dan tindakan pemulihan yang jelas.')
    ],[.19,.39,.42]),
    source('S1-S7. G01/G12 menunggu integrasi; G02-G11 mencakup desain/logika yang masih perlu dibahas.')
])

page('11 / Skenario review lintas role',[
    p('Gunakan skenario berikut untuk menilai apakah pekerjaan bisa diselesaikan dari awal hingga akhir. Saat ini simulasi lintas role hanya berbagi state pada browser/origin yang sama. Uji akun nyata pada perangkat berbeda baru sah setelah integrasi.'),
    table(['ID','Langkah review','Hasil yang seharusnya terlihat'],[
        ('R01','HC mulai dari organisasi kosong: buat divisi, unit, kepala dan anggota.','Relasi benar, tidak masuk ke unit contoh, ada petunjuk langkah berikutnya.'),
        ('R02','KU mengisi sebagian, simpan draft, kembali, lengkapi dan ajukan.','Draft tidak hilang; status menjadi Diajukan dan KD pemilik tugas berikutnya.'),
        ('R03','KD mengembalikan; KU membaca alasan, memperbaiki dan mengajukan ulang.','Alasan/revisi dapat ditelusuri dan tidak tertukar periode/anggota.'),
        ('R04','KD ACC anggota dan menetapkan nilai kepala unit.','Keduanya Final, angka terkunci, rekap HC membedakan jenisnya.'),
        ('R05','Masuk sebagai KU/KD lain, cari nama dan coba membuka detail luar naungan.','Data lintas cakupan tidak muncul. Pengujian ini harus memakai backend nyata.'),
        ('R06','Ganti periode atau versi template saat ada hasil Final.','Histori, bobot dan kategori Final tidak berubah; bulan tanpa nilai bukan nol.'),
        ('R07','Filter satu unit/status, lalu salin/ekspor dan cocokkan dengan layar.','Nama, periode, jenis dan jumlah baris konsisten dengan cakupan yang dipilih.'),
        ('R08','Simulasikan tenggat lewat, sesi habis atau gagal simpan di ponsel.','Alasan pembatasan dan cara melanjutkan jelas; draft tidak hilang tanpa peringatan.')
    ],[.09,.43,.48]),
    h('Keputusan produk yang masih terbuka'),
    p('Siapa yang menilai Kepala Divisi; apakah anggota dapat melihat hasilnya sendiri; mekanisme unlock hasil Final; serta delegasi/multi-penugasan masih memerlukan keputusan. SSO dan kanal pengingat juga belum ditetapkan. Tidak ada hak tambahan yang boleh diasumsikan otomatis.'),
    call('Tidak perlu memutuskan ulang pemegang finalisasi: tetap Kepala Divisi. Penempatan KPI per orang vs template per jabatan pada G06 adalah pertanyaan penyelarasan UI-backend yang perlu dijawab sebelum fitur itu diintegrasikan.'),
    source('S1, S6. R01 dan R05-R08 belum dapat dinilai tuntas melalui data contoh saja.')
])

page('12 / Lembar keputusan dan sumber',[
    p('Catat ID G/R dari halaman 10-11 agar revisi berikutnya spesifik. Contoh: G02 - tampilkan pemilihan Kepala Divisi saat membuat divisi; G08 - tambahkan filter jenis penilaian pada Rekap.'),
    table(['ID / halaman','Perubahan yang diminta','Prioritas / keputusan'],[
        ('1.','',''),('2.','',''),('3.','',''),('4.','',''),('5.','',''),('6.','','')
    ],[.18,.58,.24]),
    Spacer(1,12),
    p('[ ] Alur KU sudah sesuai    [ ] Alur KD sudah sesuai    [ ] Alur HC sudah sesuai'),
    p('[ ] Revisi flow dahulu    [ ] Revisi navigasi dahulu    [ ] Lanjut integrasi setelah revisi disetujui'),
    notes(3),
    h('Dasar dokumen'),
    p('Root: D:/Produktif/BantuanIT File/Project/KPI-Kinerja-UIUX','small'),
    table(['Kode','Berkas yang diperiksa'],[
        ('S1','docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md'),
        ('S2','app/ViewModels/AbproveDesign.php; app/Http/Controllers/FrontendController.php; resources/views/layouts/ dan halaman role/shared'),
        ('S3','resources/js/abprove/assessments.js; store.js'),
        ('S4','resources/js/abprove/forms.js; ui.js; resources/js/app.js'),
        ('S5','resources/js/abprove/analytics.js; exports.js; resources/views/shared/analytics-content.blade.php'),
        ('S6','docs/backend/DECISIONS.md; docs/backend/README.md; app/Services/Assessment/AssessmentService.php'),
        ('S7','docs/frontend/abprove-blade/README.md; README.md; resources/data/abprove-demo.json')
    ],[.12,.88]),
    Spacer(1,9),p('Dokumen ini merekam kondisi kode pada 9 November 2026. Tidak ada perubahan UI, backend atau database yang dilakukan selama penyusunan review ini.','small')
])

def frame(c,doc):
    c.saveState()
    c.setStrokeColor(LINE);c.setLineWidth(.5);c.line(42,A4[1]-40,A4[0]-42,A4[1]-40)
    c.setFont('Body-Bold',8);c.setFillColor(GREEN);c.drawString(42,A4[1]-29,'KPI KINERJA / ALUR DAN FUNGSI FITUR')
    c.setFont('Body',8);c.setFillColor(MUTED);c.drawRightString(A4[0]-42,A4[1]-29,'BAHAN REVIEW 09.11.2026')
    c.setStrokeColor(LINE);c.line(42,35,A4[0]-42,35)
    c.setFont('Body',8);c.setFillColor(MUTED);c.drawString(42,22,'Kondisi UI saat ini dan aturan kerja yang menjadi acuan')
    c.drawRightString(A4[0]-42,22,f'{doc.page:02d} / 12')
    c.restoreState()

story=[]
for i,items in enumerate(pages):
    if i:story.append(PageBreak())
    story.extend(items)
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=56,bottomMargin=47,title='KPI Kinerja - Review Alur dan Fungsi Fitur',author='KPI Kinerja - Bahan Review',pageCompression=1)
doc.build(story,onFirstPage=frame,onLaterPages=frame)
reader=PdfReader(str(OUT));texts=[pg.extract_text() or '' for pg in reader.pages]
assert len(reader.pages)==12, f'Expected 12 pages, got {len(reader.pages)}'
assert all(len(t)>300 for t in texts)
assert all('\ufffd' not in t and '\u25a0' not in t for t in texts)
pdf=pymupdf.open(str(OUT))
for i,pg in enumerate(pdf):
    pg.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5),alpha=False).save(str(QA/f'page-{i+1:02d}.png'))
(QA/'extracted.txt').write_text('\n\n'.join(texts),encoding='utf-8')
(QA/'checks.json').write_text(json.dumps({'pages':len(reader.pages),'bytes':OUT.stat().st_size,'pagesWithText':len(texts),'rendered':len(pdf),'output':str(OUT)},indent=2),encoding='utf-8')
print(json.dumps({'pages':len(reader.pages),'bytes':OUT.stat().st_size,'output':str(OUT)}))
