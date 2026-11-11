<?php

$public = realpath(__DIR__.'/public');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if (str_contains($path, "\0")) {
    http_response_code(400);

    return true;
}
$file = realpath($public.$path);
if ($path !== '/' && $file && str_starts_with($file, $public.DIRECTORY_SEPARATOR) && is_file($file)) {
    if (str_starts_with($file, $public.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR)
        && preg_match('/-[a-zA-Z0-9_-]{8,}\.(js|css|woff2|svg)$/D', basename($file))) {
        require __DIR__.'/tools/http/build-asset.php';

        return true;
    }

    return false;
}
require $public.'/index.php';
