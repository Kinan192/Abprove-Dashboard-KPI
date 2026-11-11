<?php

// Vite filenames contain their content hash, so each build has a distinct cache key.
$extension = pathinfo($file, PATHINFO_EXTENSION);
$types = ['js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'woff2' => 'font/woff2', 'svg' => 'image/svg+xml'];
$etag = 'W/"'.basename($file).'-'.filesize($file).'"';
header('Content-Type: '.$types[$extension]);
header('Cache-Control: public, max-age=31536000, immutable');
header('ETag: '.$etag);
header('Last-Modified: '.gmdate('D, d M Y H:i:s', filemtime($file)).' GMT');
header('Vary: Accept-Encoding');
if (in_array($etag, array_map('trim', explode(',', $_SERVER['HTTP_IF_NONE_MATCH'] ?? '')), true)) {
    http_response_code(304);

    return;
}
$content = file_get_contents($file);
$encodings = array_map('trim', explode(',', $_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''));
$gzip = false;
foreach ($encodings as $encoding) {
    if (preg_match('/^gzip(?:\s*;\s*q=([0-9.]+))?$/iD', $encoding, $match) && (! isset($match[1]) || (float) $match[1] > 0)) {
        $gzip = true;
    }
}
if ($gzip && in_array($extension, ['js', 'css', 'svg'], true) && function_exists('gzencode') && (int) ini_get('zlib.output_compression') === 0) {
    $compressed = gzencode($content, 4);
    if ($compressed !== false && strlen($compressed) < strlen($content)) {
        $content = $compressed;
        header('Content-Encoding: gzip');
    }
}
header('Content-Length: '.strlen($content));
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
    echo $content;
}
