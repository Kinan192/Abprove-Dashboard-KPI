@extends('layouts.app')
@section('content')
@php($roles = \App\Services\Admin\AccountService::ROLE_LABELS)
<div class="page-content page-stack admin-page" data-admin-logs data-panel-group data-default-panel="audit">
    <div class="toolbar"><div class="compact-heading"><h2 class="lead">Log sistem</h2><p class="mt-2 text-sm text-muted">Seluruh log hanya dapat dibaca. Waktu ditampilkan dalam WIB.</p></div></div>
    <x-abprove.tabs :items="['audit'=>'Aktivitas','login'=>'Login & keluar','email'=>'Email pengingat']" active="audit" label="Jenis log"/>
    @foreach(['audit'=>['Waktu','Pelaku','Role','Tindakan','Objek / alasan','Rincian'],'login'=>['Waktu','Akun','Identitas yang dipakai','Kejadian','Alamat IP','Perangkat'],'email'=>['Dibuat','Penerima','Periode','Subjek','Status','Dikirim oleh']] as $type=>$columns)
    <section class="card table-card" data-panel="{{ $type }}" data-log-panel="{{ $type }}" @unless($loop->first) hidden @endunless>
        <div class="card-toolbar">
            <div class="table-tools">
                @if($type==='login')
                    <label class="inline-filter"><span>Kejadian</span><select class="field" data-filter="event"><option value="">Semua</option><option value="login">Login berhasil</option><option value="failed">Login gagal</option><option value="logout">Keluar</option></select></label>
                @elseif($type==='email')
                    <label class="inline-filter"><span>Status</span><select class="field" data-filter="status"><option value="">Semua</option><option value="sent">Terkirim</option><option value="failed">Gagal</option><option value="queued">Antre</option></select></label>
                @endif
                <label class="inline-filter"><span>Role</span><select class="field" data-filter="role"><option value="">Semua role</option>@foreach($roles as $key=>$label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</select></label>
                <label class="inline-filter"><span>Dari</span><input class="field" type="date" data-filter="from"></label>
                <label class="inline-filter"><span>Sampai</span><input class="field" type="date" data-filter="to"></label>
                <input class="field" type="search" data-filter="search" placeholder="{{ ['audit'=>'Cari pelaku, tindakan atau alasan','login'=>'Cari akun, identitas atau IP','email'=>'Cari penerima atau subjek'][$type] }}" aria-label="Cari log">
            </div>
        </div>
        <div class="table-wrap"><table class="data-table"><thead><tr>@foreach($columns as $column)<th>{{ $column }}</th>@endforeach</tr></thead><tbody data-log-rows></tbody></table></div>
        <div data-log-pager></div>
    </section>
    @endforeach
</div>
@push('dialogs')
<x-abprove.dialog id="audit-detail-dialog" title="Rincian aktivitas"><div data-audit-detail></div><x-slot:footer><button class="btn" data-dialog-close type="button">Tutup</button></x-slot:footer></x-abprove.dialog>
@endpush
@endsection
