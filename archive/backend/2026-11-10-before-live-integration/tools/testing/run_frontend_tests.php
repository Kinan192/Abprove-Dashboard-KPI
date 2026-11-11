<?php

declare(strict_types=1);

// The current frontend audit uses Blade pages and does not seed a database.
chdir(dirname(__DIR__, 2));
$process = proc_open(
    ['node', 'node_modules/@playwright/test/cli.js', 'test', '--config=playwright.blade.config.js'],
    [0 => STDIN, 1 => STDOUT, 2 => STDERR],
    $pipes,
    null,
    null,
    ['bypass_shell' => true]
);
if (! is_resource($process)) {
    fwrite(STDERR, "Unable to start Playwright. Run npm.cmd ci first.\n");
    exit(1);
}
exit(proc_close($process));
