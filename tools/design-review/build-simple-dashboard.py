"""Build editable native FigCraft screens from the approved November 8 document.

No raster export, thumbnail generation, screenshot or image service is used here.
Run the generated interaction script through the official FigCraft CLI afterwards.
"""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'design/prototypes/KPI-Kinerja-UIUX.figcraft'
OUT = ROOT / 'output/design-review/simple-dashboard'
OUT.mkdir(parents=True, exist_ok=True)
doc = json.loads(zipfile.ZipFile(BASE).read('document.json'))
nodes = doc['nodes']
counter = max(int(k) for k in nodes) + 1
old_pages = doc['pages'][:]
for p in old_pages:
    nodes[str(p)]['name'] = 'Arsip 8 November / ' + nodes[str(p)]['name']
new_pages = []
links = []
frames = {}
C = dict(paper='#FFFFFF', canvas='#F4F5F7', ink='#1D2433', muted='#5D6675',
         line='#E4E6E1', accent='#064E3B', soft='#E3F2EC', chart='#0E7A55',
         brand='#064E3B', navactive='#10634D', green='#0E7A55', blue='#245FC5', red='#B5323E')


def color(value):
    value = C.get(value, value).lstrip('#')
    return {**dict(zip('rgb', [int(value[i:i+2], 16)/255 for i in (0, 2, 4)])), 'a': 1.0}


def paint(value):
    return [{'type': 'solid', 'color': color(value), 'opacity': 1.0,
             'visible': True, 'blend': 'normal'}]


def node(typ, name, parent=None, x=0, y=0, w=100, h=30, fill=None):
    global counter
    id = counter
    counter += 1
    n = dict(id=id, name=name, type=typ, width=float(w), height=float(h),
             transform=[1.0, 0.0, 0.0, 1.0, float(x), float(y)])
    if parent is not None:
        n['parent'] = parent
        nodes[str(parent)].setdefault('children', []).append(id)
    if fill:
        n['fills'] = paint(fill)
    if typ in ('frame', 'page'):
        n['children'] = []
    nodes[str(id)] = n
    return id


def page(name):
    id = node('page', name, w=0, h=0)
    nodes[str(id)]['background'] = color('canvas')
    nodes[str(id)]['flows'] = []
    new_pages.append(id)
    return id


def rect(p, name, x, y, w, h, fill='paper', radius=8, border=False):
    id = node('frame', name, p, x, y, w, h, fill)
    nodes[str(id)]['corners'] = {'radii': [float(radius)]*4, 'smoothing': 0.0}
    if border:
        nodes[str(id)]['strokes'] = paint('line')
        nodes[str(id)]['stroke'] = {'weight': 1.0, 'align': 'inside'}
    return id


def text(p, value, x, y, w=250, size=13, fill='ink', bold=False, h=None):
    id = node('text', value[:80], p, x, y, w, h or size*1.5, fill)
    nodes[str(id)].update(characters=value, auto_resize='height', style={
        'font_family': 'Inter', 'font_style': 'SemiBold' if bold else 'Regular',
        'font_size': float(size), 'line_height': {'unit': 'pixels', 'value': size*1.5},
        'letter_spacing': {'unit': 'percent', 'value': 0.0},
        'decoration': 'none', 'case': 'original'})
    return id


def button(p, label, x, y, w=130, dest=None, primary=False):
    id = rect(p, label, x, y, w, 38, 'accent' if primary else 'paper', 6, not primary)
    text(id, label, 12, 9, w-20, 12, 'paper' if primary else 'ink', bold=True)
    if dest:
        links.append((id, dest, 'navigate'))
    return id


MENUS = {
    'ku': [('dashboard', 'Dashboard'), ('nilai', 'Isi nilai'), ('pengajuan', 'Pengajuan'),
           ('riwayat', 'Riwayat'), ('kpi', 'KPI Unit'), ('tim', 'Anggota Unit')],
    'kd': [('dashboard', 'Dashboard divisi'), ('persetujuan', 'Persetujuan'),
           ('kpi', 'KPI Divisi'), ('nilai-kepala', 'Nilai Kepala Unit'), ('tim', 'Tim Divisi')],
    'hc': [('dashboard', 'Dashboard'), ('rekap', 'Rekap Penilaian'),
           ('struktur', 'Struktur & Staf'), ('akun', 'Akun Kepala'), ('kpi', 'KPI & Periode'),
           ('aktivitas', 'Riwayat Aktivitas')],
}
ROLES = {'ku': 'Kepala Unit', 'kd': 'Kepala Divisi', 'hc': 'Super HC'}
EXTRA = [('profil', 'Profil'), ('panduan', 'Panduan'), ('notifikasi', 'Notifikasi')]
EDITORS = {
    'hc': [('unit-form', 'Tambah / ubah unit'), ('division-form', 'Tambah / ubah divisi'),
           ('staff-form', 'Tambah / ubah staf'), ('account-form', 'Tambah / ubah akun kepala'),
           ('goal-form', 'Buat / edit KPI / Goal'), ('pengaturan', 'Periode & kategori'), ('period-form', 'Buat / edit periode'),
           ('result-form', 'Rincian penilaian Final'), ('divisi', 'Divisi'), ('unit', 'Unit'), ('jabatan', 'Jabatan'), ('staff', 'Staf'), ('position-form', 'Tambah / ubah jabatan')],
    'ku': [('assessment-form', 'Lembar penilaian staf'), ('receipt-form', 'Rincian pengajuan / hanya baca')],
    'kd': [('review-form', 'Tinjau penilaian staf'), ('head-form', 'Nilai Kepala Unit langsung'), ('return-form', 'Kembalikan untuk revisi')],
}
pages = {}
for role in MENUS:
    p = pages[role] = page(f'{len(new_pages)+1:02d} / {ROLES[role]} / Simple Dashboard')
    for i, (key, title) in enumerate(MENUS[role] + EXTRA + EDITORS[role] + [('periode', 'Pilih periode'), ('login', 'Masuk')]):
        id = rect(p, f'{ROLES[role]} / {title}', (i % 3)*1540, (i // 3)*1000,
                  1440, 900, 'canvas', 0)
        nodes[str(id)]['clip'] = True
        frames[(role, key)] = id


def table(p, title, headings, rows, x=260, y=390, w=1152, target=None):
    count = min(len(rows), 5)
    card = rect(p, title, x, y, w, 48 + 38 + count*46 + 44, border=True)
    text(card, title, 18, 14, w-100, 15, bold=True)
    rect(card, 'Header tabel', 1, 48, w-2, 38, 'soft', 0)
    cw = (w-36)/len(headings)
    for j, head in enumerate(headings):
        text(card, head, 18+j*cw, 57, cw-10, 11, 'muted', True)
    for i, row in enumerate(rows[:5]):
        for j, value in enumerate(row):
            colour = 'green' if value == 'Final' else 'blue' if value == 'Diajukan' else 'red' if value == 'Dikembalikan' else 'ink'
            tid = text(card, str(value), 18+j*cw, 100+i*46, cw-10, 12, colour)
            if target and j == len(row)-1:
                links.append((tid, target[i] if isinstance(target,list) else target, 'navigate'))
        rect(card, 'Garis baris', 18, 130+i*46, w-36, 1, 'line', 0)
    text(card, f'1–{count} dari {len(rows)} data contoh', 18, 48+38+count*46+12, 400, 11, 'muted')
    return card


def chart(p, x, y, w=760, h=280):
    card = rect(p, 'Tren nilai Final', x, y, w, h, border=True)
    text(card, 'Tren rata-rata nilai Final', 18, 14, w-100, 15, bold=True)
    text(card, 'Hanya hasil Final • Januari–November 2026', 18, 40, w-80, 11, 'muted')
    points = [(45+i*(w-80)/10, 185-v) for i,v in enumerate([30,47,37,61,58,76,69,99,82,104,113])]
    n = node('vector', 'Garis tren / data ilustrasi', card, 0, 0, w, h)
    nodes[str(n)]['network'] = {'vertices': [{'x':a,'y':b,'radius':0.0} for a,b in points],
        'segments': [{'a':i,'b':i+1,'ta':[0.0,0.0],'tb':[0.0,0.0]} for i in range(len(points)-1)], 'regions':[]}
    nodes[str(n)]['strokes'] = paint('chart')
    nodes[str(n)]['stroke'] = {'weight':2.5,'align':'center'}
    for i,m in enumerate(['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov']):
        text(card,m,35+i*(w-75)/11,h-33,45,10,'muted')


def field(p, label, value, x, y, w=480):
    text(p, label, x, y, w, 12, 'muted')
    box = rect(p, label, x, y+24, w, 40, 'paper', 6, True)
    text(box, value, 12, 11, w-24, 12)


for (role, key), id in frames.items():
    title = nodes[str(id)]['name'].split(' / ',1)[1]
    if key == 'login':
        brand_panel = rect(id, 'Identitas ABprove', 0, 0, 720, 900, 'brand', 0)
        text(brand_panel, 'ABprove', 72, 66, 500, 30, 'paper', bold=True)
        text(brand_panel, 'Penilaian yang jelas.\nKeputusan yang dapat ditelusuri.', 72, 290, 600, 34, 'paper', bold=True, h=110)
        text(brand_panel, 'Sistem Penilaian Kinerja Bulanan\nRS Awal Bros Botania', 72, 450, 580, 15, '#BDD8CD', h=50)
        form = rect(id, 'Form masuk / Better Auth', 790, 160, 520, 540, border=True)
        text(form, 'Masuk ke ABprove', 32, 32, 440, 25, bold=True)
        field(form, 'Email atau NIP', '', 32, 110, 456)
        field(form, 'Kata sandi', '', 32, 210, 456)
        text(form, 'Lupa kata sandi? Hubungi Super HC.', 32, 310, 440, 12, 'muted')
        button(form, 'Masuk', 32, 380, 456, frames[(role, 'dashboard')], True)
        continue
    sidebar = rect(id, 'Sidebar tetap / 232 px', 0, 0, 232, 900, 'brand', 0)
    text(sidebar, 'ABprove', 24, 18, 184, 23, 'paper', bold=True)
    text(sidebar, 'RS Awal Bros Botania', 24, 52, 184, 10, '#BDD8CD')
    text(sidebar, 'UTAMA', 24, 100, 180, 10, '#BDD8CD')
    for i,(menu,label) in enumerate(MENUS[role]):
        selected = menu == key or (key.endswith('-form') and menu == ('kpi' if key in ['goal-form','period-form'] else 'struktur' if role=='hc' else 'nilai' if role=='ku' else 'persetujuan'))
        nav = rect(sidebar, 'Navigasi / '+label, 14, 125+i*44, 204, 40, 'navactive' if selected else 'brand', 7)
        text(nav, label, 14, 10, 176, 13, 'paper', selected)
        links.append((nav, frames[(role,menu)], 'navigate'))
    text(sidebar, 'AKUN & BANTUAN', 24, 704, 180, 10, '#BDD8CD')
    for j,(menu,label) in enumerate(EXTRA):
        nav = rect(sidebar, label, 14, 730+j*44, 204, 38, 'brand', 6)
        text(nav, label, 14, 9, 178, 12, 'paper')
        links.append((nav,frames[(role,menu)],'navigate'))
    top = rect(id, 'Navbar tetap / 64 px', 232, 0, 1208, 64, 'paper', 0)
    text(top, title, 28, 20, 285, 14, bold=True)
    rect(top,'Pencarian global',340,13,350,38,'canvas',6)
    search = text(top,'Cari halaman, nama atau NIP',354,24,320,12,'muted')
    links.append((search,frames[(role,'tim' if role!='hc' else 'struktur')],'navigate'))
    button(top,'November 2026',730,13,146,frames[(role,'periode')])
    button(top,'Notifikasi',890,13,100,frames[(role,'notifikasi')])
    button(top,ROLES[role],1005,13,178,frames[(role,'profil')])
    text(id,title,260,88,900,23,bold=True)
    text(id,ROLES[role]+' • Penilaian November 2026',260,126,1000,12,'muted')
    if key=='dashboard':
        for i,(label,value,hint) in enumerate([('Rata-rata nilai Final','88,5','hasil Final periode terpilih'),('Sudah Final' if role=='hc' else 'Belum dinilai','10' if role=='hc' else '8','dalam cakupan role'),('Menunggu ACC','6','Kepala Divisi'),('Dikembalikan','2','perlu diperbaiki penilai')]):
            c=rect(id,label,260+i*292,166,278,111,border=True)
            text(c,label,16,14,244,12,'muted');text(c,value,16,38,230,30,bold=True);text(c,hint,16,83,240,10,'muted')
        chart(id,260,298,654,330)
        label = 'Perbandingan kinerja divisi' if role=='hc' else 'Perbandingan kinerja unit' if role=='kd' else 'Rata-rata nilai per KPI'
        c=rect(id,label,932,298,480,330,border=True)
        text(c,label,18,14,444,15,bold=True)
        text(c,'Rata-rata nilai Final periode terpilih',18,44,444,11,'muted')
        comparison = [('Umum & SDM',82),('Pelayanan',88),('Penunjang',90)] if role=='hc' else [('IT',84),('Logistik',86),('SDM',90)] if role=='kd' else [('Kepatuhan SLA',82),('Mutu layanan',90),('Pelatihan',92)]
        for j,(name,value) in enumerate(comparison):
            text(c,name,18,92+j*66,360,12)
            text(c,str(value),400,92+j*66,60,12,bold=True)
            rect(c,'Latar batang',18,118+j*66,440,9,'canvas',4)
            rect(c,'Nilai rata-rata',18,118+j*66,440*value/100,9,'chart',4)
        button(id,'Lihat rekap' if role=='hc' else 'Tinjau pengajuan' if role=='kd' else 'Isi nilai staf',260,658,210,frames[(role,'rekap' if role=='hc' else 'persetujuan' if role=='kd' else 'nilai')],True)
        text(id,'Grafik tren menjelaskan perubahan waktu. Grafik batang membandingkan divisi, unit atau indikator. Tidak memakai pie/donut untuk mengulang KPI card.',260,724,1120,12,'muted',h=48)
    elif key.endswith('-form'):
        back = {'goal-form':'kpi','period-form':'pengaturan','unit-form':'unit','division-form':'divisi',
                'staff-form':'staff','account-form':'akun','position-form':'jabatan','result-form':'rekap',
                'review-form':'persetujuan','return-form':'persetujuan','head-form':'nilai-kepala','assessment-form':'nilai','receipt-form':'pengajuan'}.get(key,'dashboard')
        if (role,back) not in frames: back='kpi'
        button(id,'Kembali ke daftar',1240,86,172,frames[(role,back)])
        form=rect(id,'Form terpisah dari tabel data',260,164,1152,668,border=True)
        nodes[str(form)]['overflow']='vertical';nodes[str(form)]['clip']=True
        if key in ['result-form','receipt-form']:
            for j,(label,value) in enumerate([('Subjek penilaian','Staf Unit IT / November 2026'),('Nilai akhir / kategori','92 / Sangat Baik'),('Status','Final / hanya baca'),('Keputusan terakhir','Disetujui Kepala Divisi'),('Jejak keputusan','Diajukan Kepala Unit → disetujui Kepala Divisi')]):
                field(form,label,value,22,20+j*92,1000)
        elif key=='goal-form':
            for j,(label,value) in enumerate([('Nama KPI / Goal','Ketersediaan layanan IT'),('Pilar & periode','Technical Care • November 2026'),('Target, satuan & bobot','99,5% • semakin tinggi semakin baik • 25%'),('Variabel numerator / denominator','A: total menit • B: downtime'),('Formula pengukuran','(A - B) / A * 100'),('Ditugaskan ke','Staf Unit IT • pilih penerima')]):
                field(form,label,value,22,20+j*86,720)
            text(form,'Kritik & rekomendasi formula',776,35,340,14,bold=True)
            text(form,'Uji angka sebelum menyimpan.\nPengaturan tidak mengubah nilai Final.',776,76,330,12,'muted',h=60)
        elif key=='period-form':
            for j,(label,value) in enumerate([('Bulan yang dinilai','November 2026'),('Nama & status periode','Penilaian November 2026 • Aktif'),('Jadwal pengisian (WIB)','1–5 Desember 2026'),('Batas ACC & penutupan','10 Desember • 15 Desember 2026'),('Kategori nilai','Sangat Baik ≥90 • Baik ≥80 • Cukup ≥70')]):
                field(form,label,value,22,20+j*92,950)
        else:
            form_fields = {
                'unit-form': [('Nama unit','Teknologi Informasi'),('Divisi induk','Umum & SDM'),('Akun Kepala Unit','Pilih akun Kepala Unit yang sudah dibuat'),('Status','Aktif')],
                'division-form': [('Nama divisi','Umum & SDM'),('Akun Kepala Divisi','Pilih akun Kepala Divisi yang sudah dibuat'),('Status','Aktif')],
                'staff-form': [('Nama lengkap','Nama staf'),('NIP','Nomor induk pegawai'),('Jabatan','Cari jabatan pekerjaan'),('Penempatan unit','Cari unit penempatan')],
                'position-form': [('Nama jabatan','Staf Teknologi Informasi'),('Status','Aktif')],
                'account-form': [('Nama lengkap & NIP','Identitas kepala'),('Email login','Email akun kepala'),('Role akses','Kepala Unit / Kepala Divisi / Super HC'),('Kata sandi awal','Minimal 12 karakter, huruf dan angka'),('Status','Aktif')],
                'assessment-form': [('Subjek / periode','Staf unit sendiri / November 2026'),('Nilai KPI 1','85 × bobot 25% = 21,25'),('Nilai KPI 2','90 × bobot 75% = 67,50'),('Temuan positif / negatif','Catatan pendukung, bila ada'),('Total nilai berbobot','88,75 / total bobot 100%')],
                'review-form': [('Subjek penilaian','Staf dalam naungan divisi'),('Perbandingan nilai','Oktober 86 / November 88,75'),('Rincian nilai KPI','Angka dari Kepala Unit, hanya baca'),('Temuan staf','Catatan positif dan perlu ditingkatkan'),('Jejak keputusan','Pengajuan Kepala Unit / belum ada keputusan')],
                'head-form': [('Kepala Unit yang dinilai','Kepala Unit dalam naungan divisi'),('Periode','November 2026'),('Nilai KPI Divisi','10–100 / total bobot 100%'),('Temuan & bukti','Catatan pendukung, bila ada')],
                'return-form': [('Penilaian staf','Dikembalikan kepada Kepala Unit'),('Alasan pengembalian (wajib)','Jelaskan nilai atau bukti yang perlu diperbaiki')],
            }
            for j,(label,value) in enumerate(form_fields.get(key, [])):
                field(form,label,value,22,20+j*96,1000)
        if key in ['result-form','receipt-form']:
            button(form,'Kembali ke daftar',22,592,180,frames[(role,back)])
        else:
            label='Setujui / Final' if key in ['review-form','head-form'] else 'Kirim penilaian' if role=='ku' else 'Kembalikan untuk revisi' if key=='return-form' else 'Simpan'
            button(form,label,22,592,210,frames[(role,back)],True)
            if key=='review-form': button(form,'Kembalikan untuk revisi',250,592,210,frames[(role,'return-form')])
    elif key=='riwayat':
        chart(id,260,170,1152,275)
        table(id,'Rata-rata nilai per KPI',['Indikator','Cakupan','Rata-rata','Bobot'],[['Kepatuhan layanan','Unit IT','88,5','25%'],['Efisiensi','Unit IT','84,0','20%']],y=470)
    elif key=='kpi':
        button(id,'+ Buat KPI / Goal',1212,87,200,frames[('hc','goal-form')],True) if role=='hc' else None
        if role=='hc': button(id,'Periode & kategori',1020,87,180,frames[('hc','pengaturan')])
        kpi_heads=['Pilar','KPI & formula','Target','Bobot','Penerima']
        kpi_rows=[['Technical Care','Ketersediaan layanan IT','99,5%','25%','Staf Unit IT'],['Access','Tiket sesuai SLA','95%','25%','Staf Unit IT']]
        if role=='hc':
            kpi_heads.append('Tindakan')
            for row in kpi_rows: row.append('Edit')
        table(id,'Daftar KPI / Goals',kpi_heads,kpi_rows,y=180,target=frames[('hc','goal-form')] if role=='hc' else None)
        text(id,'KPI diatur oleh SDM. Hubungi SDM untuk usulan perubahan.' if role!='hc' else 'Form tambah dan edit dibuka pada halaman tersendiri.',280,610,1050,12,'muted')
    elif key=='pengaturan':
        button(id,'+ Buat periode',1230,87,182,frames[(role,'period-form')],True)
        table(id,'Daftar periode',['Bulan','Pengisian','ACC Kepala Divisi','Status','Tindakan'],[['November 2026','1–5 Desember','10 Desember','Aktif','Ubah'],['Oktober 2026','1–5 November','10 November','Ditutup','Lihat']],y=180,target=frames[(role,'period-form')])
    elif key in ['nilai','pengajuan','persetujuan','rekap','nilai-kepala']:
        if role=='hc':
            rows=[['Staf Unit IT','IT','Final','92','Lihat'],['Kepala Unit IT','IT','Final','90','Lihat']]
            target=frames[(role,'result-form')]
        elif role=='ku':
            rows=([['Staf IT 1','IT','Dikembalikan','84','Perbaiki'],['Staf IT 2','IT','Belum diisi','-','Isi nilai']] if key=='nilai'
                  else [['Staf IT 3','IT','Diajukan','88','Lihat'],['Staf IT 4','IT','Final','92','Lihat']])
            target=frames[(role,'assessment-form' if key=='nilai' else 'receipt-form')]
        else:
            rows=([['Kepala Unit IT','IT','Belum diisi','-','Isi nilai'],['Kepala Unit Logistik','Logistik','Belum diisi','-','Isi nilai']] if key=='nilai-kepala'
                  else [['Staf Unit IT','IT','Diajukan','88','Tinjau'],['Staf Unit Logistik','Logistik','Diajukan','86','Tinjau']])
            target=frames[(role,'head-form' if key=='nilai-kepala' else 'review-form')]
        table(id,title,['Nama','Unit','Status','Nilai','Tindakan'],rows,y=180,target=target)
        text(id,'Keputusan akhir berada pada Kepala Divisi. Hasil Final hanya dapat dibaca.',280,630,1040,12,'muted')
    elif key in ['struktur','akun','tim','divisi','unit','jabatan','staff']:
        form_key = {'akun':'account-form','struktur':'division-form','divisi':'division-form','unit':'unit-form','jabatan':'position-form','staff':'staff-form'}.get(key,'unit-form')
        if role=='hc':
            button(id,'+ Tambah data',1250,87,162,frames[(role,form_key)],True)
            if key!='akun':
                for j,(sub,label) in enumerate([('divisi','Divisi'),('unit','Unit'),('jabatan','Jabatan'),('staff','Staf')]):
                    button(id,label,260+j*136,164,124,frames[(role,sub)],key==sub)
        if role=='hc':
            table(id,title,['Nama','Jabatan / kepala','Penempatan','Status','Tindakan'],[['Unit IT','Kepala Unit IT','Umum & SDM','Aktif','Ubah'],['Staf IT','Staf','Unit IT','Aktif','Ubah']],y=220,target=frames[('hc',form_key)])
        else:
            table(id,title,['Nama','Jabatan','Unit','Status'],[['Staf IT 1','Staf IT','IT','Aktif'],['Staf IT 2','Staf IT','IT','Aktif']],y=220)
    elif key=='periode':
        table(id,'Pilih bulan penilaian',['Bulan','Status','Jadwal','Tindakan'],[['November 2026','Aktif','1–15 Desember','Pilih'],['Oktober 2026','Ditutup','1–15 November','Lihat']],y=180,target=frames[(role,'dashboard')])
    elif key=='profil':
        c=rect(id,'Profil / data diri',260,180,1152,500,border=True)
        for j,(label,value) in enumerate([('Nama & jabatan',ROLES[role]),('Penempatan','Sesuai akun yang login'),('Keamanan','Kata sandi minimal 12 karakter, mengandung huruf dan angka'),('Pemberitahuan','Atur preferensi notifikasi')]):
            field(c,label,value,22,22+j*100,1000)
    elif key=='panduan':
        c=rect(id,'Panduan sesuai role',260,180,1152,440,border=True)
        for j,t in enumerate(['1. Pilih periode penilaian','2. '+('Kelola struktur, akun dan KPI' if role=='hc' else 'Lengkapi nilai staf' if role=='ku' else 'Tinjau staf dan nilai Kepala Unit'), '3. '+('Pantau hasil Final' if role=='hc' else 'Kirim kepada Kepala Divisi' if role=='ku' else 'ACC atau kembalikan dengan alasan')]):
            text(c,t,24,34+j*100,1060,16,bold=True)
    else:
        table(id,title,['Aktivitas','Pelaku','Waktu','Status'],[['Penilaian diajukan','Kepala Unit','November 2026','Diajukan'],['Penilaian disetujui','Kepala Divisi','November 2026','Final']],y=180)
    nodes[str(id)]['annotations']=[{'label':'Layout mengikuti referensi pengguna, warna hijau ABprove dipertahankan. Dashboard menjadi menu pertama, tanpa Beranda. Chart sesuai kebutuhan role; tidak memakai pie/donut yang mengulang KPI card. Data desain adalah ilustrasi. Finalisasi tetap Kepala Divisi. Form dan tabel daftar berada di layar berbeda.'}]

# Native FigCraft page order and prototype commands; no raster artifacts.
doc['pages']=new_pages+old_pages
doc['current_page']=pages['hc']
doc['next_id']=counter
doc['name']='ABprove / Simple Dashboard / Redesign dari 8 November'
OUT.joinpath('document.json').write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
commands=[]
for id,dest,action in links:
    commands.append({'command':'proto.interaction.add','params':{'id':id,'trigger':{'type':'onClick'},'action':{'type':action,'dest':dest},'transition':{'type':'dissolve'},'durationMs':150,'easing':'easeOut'}})
for role,p in pages.items():
    commands.append({'command':'page.select','params':{'id':p}})
    commands.append({'command':'proto.flow.add','params':{'start':frames[(role,'login')],'name':ROLES[role]}})
commands.append({'command':'page.select','params':{'id':pages['hc']}})
OUT.joinpath('interactions.json').write_text(json.dumps(commands),encoding='utf-8')
OUT.joinpath('manifest.json').write_text(json.dumps({'source':str(BASE),'source_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'pages':pages,'screens':[{'role':r,'page':k,'id':v} for (r,k),v in frames.items()], 'interactions':len(links),'images_generated':0,'font':'Inter (built into FigCraft; web retains the existing Figtree fonts)','style':C},indent=2),encoding='utf-8')
print(json.dumps({'screens':len(frames),'interactions':len(links),'new_pages':len(new_pages),'nodes':len(nodes),'images_generated':0}))
