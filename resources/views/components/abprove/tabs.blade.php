@props(['items'=>[], 'active'=>null, 'label'=>'Bagian halaman'])
<nav class="seg workspace-tabs" role="tablist" aria-label="{{ $label }}">
@foreach($items as $key=>$title)<button type="button" role="tab" data-panel-tab="{{ $key }}" aria-selected="{{ ($active??array_key_first($items))===$key?'true':'false' }}" tabindex="{{ ($active??array_key_first($items))===$key?'0':'-1' }}" @class(['active'=>($active??array_key_first($items))===$key])>{{ $title }}</button>@endforeach
</nav>
