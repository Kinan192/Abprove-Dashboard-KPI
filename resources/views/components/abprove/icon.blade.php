@props(['name' => 'grid'])
@php
$paths = [
 'home' => 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
 'edit' => 'M16 3l5 5 M4 20l4-1L21 6l-5-5L3 14l-1 7z',
 'inbox' => 'M4 4h16l2 12v5H2v-5z M2 14h6l2 4h4l2-4h6',
 'grid' => 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 'clipboard' => 'M9 4H5v17h14V4h-4 M9 2h6v4H9z M8 11h8 M8 15h8',
 'upload' => 'M12 16V3 M6 9l6-6 6 6 M4 15v6h16v-6',
 'clock' => 'M12 8v5l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 'table' => 'M3 3h18v18H3z M3 9h18 M9 3v18',
 'users' => 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 'check' => 'M21 11v10H3V3h13 M8 11l4 4L22 5',
 'chart' => 'M3 3v18h18 M6 15l4-5 5 3 6-9',
 'settings' => 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
 'help' => 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 'bell' => 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
 'search' => 'M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 'chevron' => 'M6 9l6 6 6-6', 'close' => 'M6 6l12 12 M6 18L18 6', 'menu' => 'M3 6h18 M3 12h18 M3 18h18',
 'lock' => 'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4', 'eye' => 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 'plus' => 'M12 5v14 M5 12h14', 'back' => 'M19 12H5 M11 6l-6 6 6 6', 'trash' => 'M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
 'user' => 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 'download' => 'M12 3v12 M6 9l6 6 6-6 M3 16v5h18v-5', 'refresh' => 'M21 3v6h-6 M3 21v-6h6 M5 8a8 8 0 0 1 13-3l3 4 M3 15l3 4a8 8 0 0 0 13-3',
 'calendar' => 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4',
];
@endphp
<svg {{ $attributes->class(['icon']) }} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{ $paths[$name] ?? $paths['grid'] }}"/></svg>
