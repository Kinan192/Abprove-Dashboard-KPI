<?php

/*
 * Email palette (inline styles only: mail clients ignore stylesheets and CSS variables).
 * Mirrors the app tokens in resources/css/app.css: RS Awal Bros tosca brand, cool slate neutrals,
 * semantic amber/red/green for deadlines and outcomes.
 */
return [
    'font' => "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    'canvas' => '#f4f7f7',
    'paper' => '#ffffff',
    'subtle' => '#f0f5f5',
    'line' => '#e2e9ea',
    'ink' => '#0f1a1c',
    'body' => '#33464a',
    'muted' => '#5c6b6e',
    'faint' => '#8a979a',
    'brand' => '#07818e',
    'brand_dark' => '#0b6670',
    'brand_fill' => '#03b1c0',
    'brand_soft' => '#eefeff',
    'brand_line' => '#cff7fa',
    'logo_red' => '#dc2626',
    'tones' => [
        'brand' => ['bg' => '#eefeff', 'line' => '#cff7fa', 'label' => '#0b6670', 'text' => '#0d545c'],
        'warn' => ['bg' => '#fdf3e2', 'line' => '#f4d9a8', 'label' => '#a15c07', 'text' => '#7a4605'],
        'danger' => ['bg' => '#fdeeec', 'line' => '#f6c9c4', 'label' => '#c0261b', 'text' => '#8f1c14'],
        'success' => ['bg' => '#e6f6ed', 'line' => '#bfe5cf', 'label' => '#12804f', 'text' => '#0d5e3a'],
        'neutral' => ['bg' => '#f0f5f5', 'line' => '#e2e9ea', 'label' => '#5c6b6e', 'text' => '#0f1a1c'],
    ],
];
