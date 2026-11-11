@props(['person'])
<span class="flex min-w-0 items-center gap-3"><span class="avatar">{{ \App\ViewModels\AbproveDesign::initials($person['name']) }}</span><span class="min-w-0"><strong class="block text-sm font-semibold">{{ $person['name'] }}</strong><span class="block text-xs text-muted">{{ $person['job'] }}, {{ $person['unitName'] }}</span></span></span>
