<?php

namespace App\Services\KpiMaster;

use Illuminate\Validation\ValidationException;

final class KpiFormula
{
    private array $tokens = [];

    private int $position = 0;

    public function compile(string $source): array
    {
        if ($source === '' || strlen($source) > 1200) {
            $this->invalid('Formula wajib diisi, maksimal 1200 karakter.');
        }
        $this->tokens = [];
        $this->position = 0;
        $depth = 0;
        while ($source !== '') {
            if (! preg_match('/\A\s*(\d+(?:\.\d*)?|\.\d+|[A-Za-z_]\w*|>=|<=|==|!=|[+\-*\/^(),<>])/', $source, $match)) {
                if (trim($source) === '') {
                    break;
                }
                $this->invalid('Karakter formula tidak valid.');
            }
            $token = strtoupper($match[1]);
            if ($token === '(' && ++$depth > 40) {
                $this->invalid('Formula terlalu dalam.');
            }
            if ($token === ')') {
                $depth--;
            }
            $this->tokens[] = $token;
            $source = substr($source, strlen($match[0]));
        }
        $tree = $this->expression();
        if ($this->position !== count($this->tokens)) {
            $this->invalid('Formula tidak lengkap.');
        }

        return $tree;
    }

    public function variables(array $tree): array
    {
        if ($tree[0] === 'variable') {
            return [$tree[1]];
        }
        $variables = [];
        foreach (array_slice($tree, 1) as $child) {
            if (is_array($child)) {
                $variables = array_merge($variables, $this->variables($child));
            }
        }

        return array_values(array_unique($variables));
    }

    private function expression(int $minimum = 0, int $depth = 0): array
    {
        if ($depth > 80) {
            $this->invalid('Formula terlalu dalam.');
        }
        $token = $this->tokens[$this->position++] ?? null;
        if ($token === null) {
            $this->invalid('Formula tidak lengkap.');
        }
        if (is_numeric($token)) {
            $left = ['number', (float) $token];
        } elseif ($token === '+' || $token === '-') {
            $left = ['unary', $token, $this->expression(5, $depth + 1)];
        } elseif ($token === '(') {
            $left = $this->expression(0, $depth + 1);
            $this->consume(')');
        } elseif (preg_match('/^[A-Z_]\w*$/D', $token)) {
            if (($this->tokens[$this->position] ?? null) === '(') {
                if (! in_array($token, ['MIN', 'MAX', 'ABS', 'ROUND', 'IF'], true)) {
                    $this->invalid('Fungsi formula tidak dikenal.');
                }
                $this->position++;
                $arguments = [];
                if (($this->tokens[$this->position] ?? null) !== ')') {
                    do {
                        $arguments[] = $this->expression(0, $depth + 1);
                        if (($this->tokens[$this->position] ?? null) !== ',') {
                            break;
                        }
                        $this->position++;
                    } while (true);
                }
                $this->consume(')');
                $count = count($arguments);
                if ($count === 0 || ($token === 'IF' && $count !== 3) || ($token === 'ABS' && $count !== 1) || ($token === 'ROUND' && $count > 2)) {
                    $this->invalid('Jumlah argumen formula tidak sesuai.');
                }
                $left = ['call', $token, ...$arguments];
            } else {
                $left = ['variable', $token];
            }
        } else {
            $this->invalid('Token formula tidak valid.');
        }
        $precedence = ['>' => 1, '<' => 1, '>=' => 1, '<=' => 1, '==' => 1, '!=' => 1, '+' => 2, '-' => 2, '*' => 3, '/' => 3, '^' => 4];
        while (isset($precedence[$operator = $this->tokens[$this->position] ?? '']) && $precedence[$operator] >= $minimum) {
            $this->position++;
            $left = ['binary', $operator, $left, $this->expression($precedence[$operator] + ($operator === '^' ? 0 : 1), $depth + 1)];
        }

        return $left;
    }

    private function consume(string $token): void
    {
        if (($this->tokens[$this->position++] ?? null) !== $token) {
            $this->invalid('Tanda kurung formula tidak lengkap.');
        }
    }

    private function evaluate(array $node, array $values): float
    {
        if ($node[0] === 'number') {
            return $node[1];
        }
        if ($node[0] === 'variable') {
            if (! array_key_exists($node[1], $values)) {
                $this->invalid('Variabel formula belum diisi.');
            }

            return $values[$node[1]];
        }
        if ($node[0] === 'unary') {
            return ($node[1] === '-' ? -1 : 1) * $this->evaluate($node[2], $values);
        }
        if ($node[0] === 'call') {
            if ($node[1] === 'IF') {
                return $this->evaluate($node[$this->evaluate($node[2], $values) ? 3 : 4], $values);
            }
            $args = array_map(fn ($n) => $this->evaluate($n, $values), array_slice($node, 2));

            return match ($node[1]) {
                'MIN' => min($args), 'MAX' => max($args), 'ABS' => abs($args[0]),
                'ROUND' => round($args[0], max(-12, min(12, (int) ($args[1] ?? 0))), PHP_ROUND_HALF_UP),
            };
        }
        $a = $this->evaluate($node[2], $values);
        $b = $this->evaluate($node[3], $values);
        if ($node[1] === '/' && $b == 0) {
            $this->invalid('Pembagian dengan nol.');
        }

        return match ($node[1]) {
            '+' => $a + $b, '-' => $a - $b, '*' => $a * $b, '/' => $a / $b, '^' => $a ** $b,
            '>' => (float) ($a > $b), '<' => (float) ($a < $b), '>=' => (float) ($a >= $b), '<=' => (float) ($a <= $b), '==' => (float) ($a == $b), '!=' => (float) ($a != $b),
        };
    }

    public function score(array $definition, array $input): array
    {
        $scope = [];
        $clean = [];
        foreach ($definition['variables'] ?? [] as $variable) {
            $raw = ($variable['source'] ?? 'manual') === 'fixed' ? ($variable['value'] ?? null) : ($input['variable_'.$variable['key']] ?? null);
            if (! is_numeric($raw) || ! is_finite((float) $raw)) {
                $this->invalid('Lengkapi angka '.$variable['label'].'.');
            }
            $scope[$variable['key']] = (float) $raw;
            $clean['variable_'.$variable['key']] = (float) $raw;
        }
        $measurement = $this->evaluate($this->compile($definition['formula']), $scope);
        $target = (float) $definition['target'];
        $policy = $definition['policy'];
        $min = (float) $policy['min'];
        $max = (float) $policy['max'];
        if ($target == 0) {
            if (($policy['zeroRule'] ?? '') !== 'zero-pass') {
                $this->invalid('Aturan target nol belum ditentukan.');
            }
            $score = $measurement == 0 ? $max : $min;
        } elseif ($definition['direction'] === 'lower') {
            if ($measurement <= 0) {
                $this->invalid('Realisasi menurun harus lebih dari nol.');
            }
            $score = $target / $measurement * $max;
        } else {
            $score = $measurement / $target * $max;
        }
        if (! is_finite($measurement) || ! is_finite($score)) {
            $this->invalid('Hasil formula bukan angka valid.');
        }

        return ['score' => round(max($min, min($max, $score)), 6), 'inputs' => $clean];
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['formula' => $message]);
    }
}
