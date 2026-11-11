from pathlib import Path
import sys,html,json
sys.path.insert(0,r'C:\Users\Kinan\.kpi-design-tools')
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
import pymupdf

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/KPI-Kinerja-Alur-Terbaru-v1.3.pdf'
QA=ROOT/'tmp/pdfs/flow-v13'
OUT.parent.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('BodyBold','C:/Windows/Fonts/arialbd.ttf'))
GREEN=colors.HexColor('#064E3B');INK=colors.HexColor('#1D2433');MUTED=colors.HexColor('#5D6675');LINE=colors.HexColor('#DCE3DF');SOFT=colors.HexColor('#F3F6F4');W=A4[0]-84
styles={'body':ParagraphStyle('body',fontName='Body',fontSize=10,leading=14.5,textColor=INK,spaceAfter=8),'small':ParagraphStyle('small',fontName='Body',fontSize=8.5,leading=12,textColor=MUTED,spaceAfter=6),'title':ParagraphStyle('title',fontName='BodyBold',fontSize=24,leading=29,textColor=GREEN,spaceAfter=14),'h':ParagraphStyle('h',fontName='BodyBold',fontSize=12,leading=17,textColor=GREEN,spaceBefore=10,spaceAfter=8),'cell':ParagraphStyle('cell',fontName='Body',fontSize=9,leading=12.5,textColor=INK),'head':ParagraphStyle('head',fontName='BodyBold',fontSize=9,leading=12.5,textColor=colors.white)}
def p(s,style='body'):return Paragraph(html.escape(str(s)).replace('\n','<br/>'),styles[style])
def table(headers,rows,widths):
 t=Table([[p(x,'head')for x in headers]]+[[p(x,'cell')for x in row]for row in rows],colWidths=[W*x for x in widths],hAlign='LEFT',repeatRows=1)
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,SOFT]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,-1),.4,LINE)]));return t
def section(title,body):return [p(title,'h'),p(body)]
pages=[]
pages.append([p('Alur KPI Kinerja v1.3','title'),p('Pembaruan setelah review pengguna | 9 November 2026','small'),p('Dokumen ini melengkapi PDF review sebelumnya. Jika ada perbedaan, keputusan terbaru di sini menjadi acuan frontend: tidak ada Draft penilaian; KPI Unit dan KPI Divisi disusun HC; akun kepala dibuat sebelum struktur.'),p('01 / Persiapan oleh Super HC','h'),table(['Urutan','Pekerjaan','Hasil'],[
('1. Akun Kepala','Buat akun Kepala Divisi dan Kepala Unit.','Identitas, email/NIP, role dan status tersedia sebelum penetapan kepala.'),
('2. Jabatan','Tambahkan jabatan pekerjaan staf.','Klasifikasi pekerjaan tersedia; berbeda dari role akses.'),
('3. Divisi','Pilih akun KD aktif yang sudah ada.','Divisi mempunyai penanggung jawab yang jelas.'),
('4. Unit','Pilih divisi induk dan akun KU aktif yang sudah ada.','Unit berada di divisi yang benar dan memiliki kepala.'),
('5. Staf','Masukkan nama, NIP, jabatan dan unit.','Data staf tersedia tanpa membuat akun login.'),
('6. KPI','Susun KPI Unit dan KPI Divisi; bobot 100%.','Indikator penilaian dan pihak yang dinilai jelas.'),
('7. Periode','Tentukan bulan, jadwal WIB dan kategori; buka periode.','KU/KD dapat mulai pada jendela kerja yang sah.'),
('8. Monitoring','Pantau tugas, rekap, analitik dan ekspor.','HC melihat proses/hasil tanpa mengambil keputusan nilai.')],[.18,.41,.41]),Spacer(1,12),p('Batas akun: hanya KU, KD dan Super HC. Akun yang sudah memimpin area aktif lain tidak dipilih ganda. Form divisi/unit memilih akun yang sudah dibuat, bukan membuat akun baru diam-diam.'),p('Contoh: Divisi Umum & SDM membawahi Unit SDM, Logistik dan IT. Masing-masing KU menilai stafnya sendiri; KD divisi tersebut meninjau semua unit di bawahnya.')])
pages.append([p('02 / Definisi KPI dan angka nilai','title'),p('HC menyusun definisi KPI. KU dan KD mengisi angka hasil penilaian. Kedua kegiatan tersebut dipisahkan pada menu dan penjelasan form.'),table(['Aspek','KPI Unit','KPI Divisi'],[
('Disusun oleh','Super HC','Super HC'),('Cakupan definisi','Satu Unit','Satu Divisi'),('Yang dinilai','Staf dalam Unit tersebut','Kepala Unit dalam Divisi tersebut'),('Pengisi angka','Kepala Unit','Kepala Divisi'),('Keputusan akhir','Kepala Divisi setelah review','Kepala Divisi langsung menetapkan Final'),('Menu baca','KU > KPI Unit','KD > KPI Divisi')],[.22,.39,.39]),*section('Isi definisi yang disusun HC','Nama template, pilar, indikator KPI, numerator, denominator, formula pengukuran, target dan bobot. HC juga menentukan bulan mulai berlaku. Total bobot harus tepat 100% sebelum diterapkan.'),*section('Penerapan versi','Pratinjau tidak menyimpan perubahan. Terapkan versi KPI membuat versi yang berlaku untuk rentang belum dinilai. Penilaian terpakai mempertahankan snapshot indikator, bobot dan kategori. Perubahan yang menabrak penilaian terpakai diblokir.'),*section('Pengisian oleh penilai','Setiap nilai adalah integer 10-100. Hasil KPI = nilai x bobot / 100. Misalnya nilai 90 dan bobot 15% menghasilkan 13,50. Semua indikator harus lengkap sebelum dikirim. Temuan positif dan negatif opsional.'),*section('Hubungan dengan jabatan','Jabatan menjelaskan pekerjaan staf. Pada alur terbaru, pilihan definisi KPI mengikuti Unit atau Divisi, bukan penempatan template bebas per orang/jabatan. Halaman Cakupan KPI menerangkan hubungan ini.')])
pages.append([p('03 / Penilaian tanpa Draft','title'),table(['Jalur','Urutan pekerjaan'],[
('Staf oleh KU','Login > pilih periode/staf > isi seluruh KPI Unit > konfirmasi pengajuan > Diajukan > ditinjau KD > Final atau Dikembalikan.'),
('Revisi staf','KD memberi alasan > KU membaca catatan > memperbaiki seluruh isian yang diperlukan > ajukan ulang > KD meninjau kembali.'),
('KU oleh KD','Login > Nilai Kepala Unit > pilih kepala > isi seluruh KPI Divisi > konfirmasi > langsung Final.')],[.24,.76]),*section('Status yang digunakan','Belum diisi, Diajukan, Dikembalikan dan Final. Tidak ada tombol simpan Draft, status Draft atau autosave nilai parsial pada frontend.'),*section('Isian belum dikirim','Isian hanya berada dalam memori halaman. Ketika pindah orang atau meninggalkan halaman, pengguna mendapat peringatan membuang isian. Jika dibuang, nilainya tidak tersimpan sebagai pekerjaan sementara.'),*section('Pembatalan pengajuan','KU dapat membatalkan pengajuan yang belum diputuskan ketika jadwal mengizinkan. Konfirmasi menjelaskan bahwa angka dan temuan pengajuan akan dihapus, status menjadi Belum diisi, dan penilaian perlu diisi ulang. Jejak pembatalan tetap dicatat.'),*section('Batas kewenangan','KD hanya membaca angka staf; koreksi melalui pengembalian dengan alasan wajib. KD mengisi sendiri angka Kepala Unit. HC tidak mempunyai tindakan mengisi, ACC, mengembalikan atau memfinalkan nilai.'),*section('Tenggat dan Final','Periode dapat Direncanakan, Terbuka atau Ditutup. Jadwal WIB memisahkan batas KU dan batas KD. Final serta periode yang tidak mengizinkan pengisian hanya dapat dibaca. Membuka kembali Final belum ditetapkan.')])
report=json.loads((ROOT/'docs/frontend/flow-v2/browser-report.json').read_text(encoding='utf-8'))
pages.append([p('04 / Fitur dan batas implementasi','title'),table(['Role','Fitur frontend yang tersedia'],[
('Kepala Unit','Beranda, pengisian staf, pengajuan/revisi, pembatalan, riwayat Final, KPI Unit hanya baca, Anggota Unit serta fitur bersama.'),
('Kepala Divisi','Persetujuan staf, Final pilihan, penilaian Kepala Unit, KPI Divisi hanya baca, Tim Divisi dan analitik Final.'),
('Super HC','Akun Kepala, Jabatan, Divisi & Unit, Staf, KPI dua cakupan, versi/masa berlaku, periode/kategori, monitoring, rekap, analitik dan jejak perubahan.'),
('Bersama','Pencarian, periode, notifikasi tugas, profil, panduan, dialog/konfirmasi, tema dan navigasi ponsel.')],[.24,.76]),*section('Perbaikan alur yang dapat direview','Rekap menggabungkan Staf dan Kepala Unit. Analitik menghitung Final saja dan peringkat dipisahkan per versi KPI yang sebanding. Ekspor mengikuti filter. Pemindahan staf/pergantian kepala menampilkan dampak dan guard. Riwayat mencatat pelaku, waktu serta perubahan sebelum/sesudah.'),*section('Bukti pengujian',f"Build Vite dan {report['stats']['expected']} skenario browser lulus. Skenario utama membuat akun, jabatan, struktur, staf, dua jenis KPI dan periode dari kosong, lalu menyelesaikan dua jenis Final. Regresi backend lama: 51 tes dan 509 assertions lulus pada MySQL terisolasi."),*section('Yang masih menunggu integrasi','Data bisnis frontend tetap simulasi browser. Login/logout aplikasi menggunakan backend nyata, tetapi akun baru dari form simulasi belum mempunyai kredensial server. Backend lama masih memiliki Draft dan template per jabatan; kontrak tersebut harus diubah sebelum alur v1.3 diintegrasikan. Tidak ada perubahan migration atau reset database pada revisi ini.'),p('Impor CSV dapat diuji lokal. Parser Excel, pemulihan sandi server dan pengiriman pesan belum dihubungkan. Unlock Final, penilaian KD, akses hasil pribadi staf dan delegasi tetap belum diputuskan.','small'),p('Rujukan: docs/requirements/ALUR-KPI-v1.3.md; docs/frontend/flow-v2/README.md; resources/views/v2; resources/js/abprove/flow-*.','small'),p('Cara review: buka /design-review. HC > Periode & Kategori > Mulai persiapan dari kosong untuk mencoba alur lengkap lokal. Reset contoh tersedia pada halaman yang sama.','small')])
def frame(canvas,doc):
 canvas.setFont('Body',8);canvas.setFillColor(MUTED);canvas.drawString(42,A4[1]-30,'KPI KINERJA / ALUR TERBARU v1.3');canvas.drawRightString(A4[0]-42,A4[1]-30,'09 NOVEMBER 2026');canvas.setStrokeColor(LINE);canvas.line(42,36,A4[0]-42,36);canvas.drawString(42,23,'Frontend untuk review alur; data bisnis masih lokal');canvas.drawRightString(A4[0]-42,23,f'{doc.page} / 4')
story=[]
for i,page in enumerate(pages):
 if i:story.append(PageBreak())
 story.extend(page)
doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=55,bottomMargin=48,title='Alur KPI Kinerja v1.3',author='KPI Kinerja - Bahan Review')
doc.build(story,onFirstPage=frame,onLaterPages=frame)
r=PdfReader(OUT);assert len(r.pages)==4
pdf=pymupdf.open(OUT)
for i,page in enumerate(pdf):page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5),alpha=False).save(str(QA/f'page-{i+1}.png'))
assert all(len(page.extract_text())>500 for page in r.pages)
print(json.dumps({'output':str(OUT),'pages':len(r.pages),'bytes':OUT.stat().st_size}))
