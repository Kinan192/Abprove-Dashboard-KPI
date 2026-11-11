<?php

namespace App\Support;

final class SqlStatements
{
    public static function fromFile(string $path): array
    {
        $delimiter = ';';
        $buffer = '';
        $statements = [];
        foreach (file($path) as $line) {
            if (preg_match('/^\s*--/', $line) || trim($line) === '') {
                continue;
            }
            if (preg_match('/^\s*DELIMITER\s+(\S+)/i', $line, $match)) {
                if (trim($buffer) !== '') {
                    throw new \RuntimeException('Incomplete SQL before delimiter.');
                }
                $delimiter = $match[1];

                continue;
            }
            $buffer .= $line;
            if (str_ends_with(rtrim($buffer), $delimiter)) {
                $statements[] = substr(rtrim($buffer), 0, -strlen($delimiter));
                $buffer = '';
            }
        }
        if (trim($buffer) !== '') {
            throw new \RuntimeException('Incomplete SQL statement.');
        }

        return $statements;
    }
}
