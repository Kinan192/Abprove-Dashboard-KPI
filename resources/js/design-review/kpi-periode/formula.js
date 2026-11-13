// Parser formula diadaptasi dari dgshfgs.html milik pengguna; tanpa eval.
export const Formula = (() => {
    const FUNCS = {
        MIN: { fn: (...a) => Math.min(...a), min: 1 },
        MAX: { fn: (...a) => Math.max(...a), min: 1 },
        ABS: { fn: (x) => Math.abs(x), min: 1, max: 1 },
        ROUND: {
            fn: (x, d = 0) => {
                const p = 10 ** d;
                return Math.round(x * p) / p;
            },
            min: 1,
            max: 2,
        },
        IF: { fn: null, min: 3, max: 3 }, // dievaluasi lazy
    };
    const CMP = new Set(['>', '<', '>=', '<=', '==', '!=']);
    const cache = new Map();

    function tokenize(src) {
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            const c = src[i];
            if (/\s/.test(c)) {
                i++;
                continue;
            }
            if (/[0-9.]/.test(c)) {
                let j = i;
                while (j < src.length && /[0-9.]/.test(src[j])) j++;
                const n = Number(src.slice(i, j));
                if (Number.isNaN(n))
                    throw new Error(`Angka tidak valid: ${src.slice(i, j)}`);
                tokens.push({ t: 'num', v: n });
                i = j;
                continue;
            }
            if (/[A-Za-z_]/.test(c)) {
                let j = i;
                while (j < src.length && /\w/.test(src[j])) j++;
                tokens.push({ t: 'id', v: src.slice(i, j) });
                i = j;
                continue;
            }
            const two = src.slice(i, i + 2);
            if (CMP.has(two)) {
                tokens.push({ t: 'op', v: two });
                i += 2;
                continue;
            }
            if ('+-*/^(),<>'.includes(c)) {
                tokens.push({ t: 'op', v: c });
                i++;
                continue;
            }
            throw new Error(`Karakter tidak dikenal: "${c}"`);
        }
        return tokens;
    }

    function parse(src) {
        const tokens = tokenize(src);
        let pos = 0;
        const peek = () => tokens[pos];
        const isOp = (v) => peek()?.t === 'op' && peek().v === v;
        const expect = (v) => {
            if (!isOp(v)) throw new Error(`Diharapkan "${v}"`);
            pos++;
        };

        const comparison = () => {
            let l = additive();
            while (peek()?.t === 'op' && CMP.has(peek().v)) {
                const op = tokens[pos++].v;
                l = { k: 'bin', op, l, r: additive() };
            }
            return l;
        };
        const additive = () => {
            let l = term();
            while (isOp('+') || isOp('-')) {
                const op = tokens[pos++].v;
                l = { k: 'bin', op, l, r: term() };
            }
            return l;
        };
        const term = () => {
            let l = power();
            while (isOp('*') || isOp('/')) {
                const op = tokens[pos++].v;
                l = { k: 'bin', op, l, r: power() };
            }
            return l;
        };
        const power = () => {
            const b = unary();
            if (isOp('^')) {
                pos++;
                return { k: 'bin', op: '^', l: b, r: power() };
            }
            return b;
        };
        const unary = () => {
            if (isOp('-')) {
                pos++;
                return { k: 'neg', x: unary() };
            }
            if (isOp('+')) {
                pos++;
                return unary();
            }
            return primary();
        };
        const primary = () => {
            const tok = tokens[pos++];
            if (!tok) throw new Error('Formula tidak lengkap');
            if (tok.t === 'num') return { k: 'num', v: tok.v };
            if (tok.t === 'id') {
                if (!isOp('(')) return { k: 'var', name: tok.v.toUpperCase() }; // tidak case-sensitive
                pos++;
                const name = tok.v.toUpperCase(),
                    spec = FUNCS[name];
                if (!spec) throw new Error(`Fungsi tidak dikenal: ${tok.v}`);
                const args = [];
                if (!isOp(')')) {
                    args.push(comparison());
                    while (isOp(',')) {
                        pos++;
                        args.push(comparison());
                    }
                }
                expect(')');
                if (
                    args.length < spec.min ||
                    (spec.max && args.length > spec.max)
                )
                    throw new Error(`Jumlah argumen ${name} tidak sesuai`);
                return { k: 'call', name, args };
            }
            if (tok.v === '(') {
                const e = comparison();
                expect(')');
                return e;
            }
            throw new Error(`Token tidak terduga: "${tok.v}"`);
        };

        if (!tokens.length) throw new Error('Formula kosong');
        const ast = comparison();
        if (pos < tokens.length)
            throw new Error(`Token tidak terduga: "${tokens[pos].v}"`);
        return ast;
    }

    function collectVars(n, out = new Set()) {
        if (n.k === 'var') out.add(n.name);
        else if (n.k === 'bin') {
            collectVars(n.l, out);
            collectVars(n.r, out);
        } else if (n.k === 'neg') collectVars(n.x, out);
        else if (n.k === 'call') n.args.forEach((a) => collectVars(a, out));
        return out;
    }

    function compile(src) {
        if (typeof src !== 'string' || src.length > 1200)
            throw new Error('Formula maksimal 1200 karakter');
        let depth = 0;
        for (const c of src) {
            if (c === '(' && ++depth > 40)
                throw new Error('Formula terlalu dalam');
            if (c === ')') depth--;
        }
        if (!cache.has(src)) {
            if (cache.size > 300) cache.clear();
            const ast = parse(src);
            cache.set(src, { ast, vars: collectVars(ast) });
        }
        return cache.get(src);
    }

    function ev(n, s) {
        switch (n.k) {
            case 'num':
                return n.v;
            case 'var':
                if (!Object.hasOwn(s, n.name))
                    throw new Error(`Variabel tidak dikenal: ${n.name}`);
                return s[n.name];
            case 'neg':
                return -ev(n.x, s);
            case 'call':
                if (n.name === 'IF')
                    return ev(n.args[0], s)
                        ? ev(n.args[1], s)
                        : ev(n.args[2], s);
                return FUNCS[n.name].fn(...n.args.map((a) => ev(a, s)));
            case 'bin': {
                const a = ev(n.l, s),
                    b = ev(n.r, s);
                switch (n.op) {
                    case '+':
                        return a + b;
                    case '-':
                        return a - b;
                    case '*':
                        return a * b;
                    case '/':
                        if (b === 0) throw new Error('Pembagian dengan nol');
                        return a / b;
                    case '^':
                        return a ** b;
                    case '>':
                        return +(a > b);
                    case '<':
                        return +(a < b);
                    case '>=':
                        return +(a >= b);
                    case '<=':
                        return +(a <= b);
                    case '==':
                        return +(a === b);
                    case '!=':
                        return +(a !== b);
                }
            }
        }
        throw new Error('Formula tidak valid');
    }

    function evaluate(src, scope) {
        const v = ev(compile(src).ast, scope);
        if (!Number.isFinite(v)) throw new Error('Hasil bukan angka valid');
        return v;
    }

    return {
        compile,
        evaluate,
        varsOf: (n) => collectVars(n),
        isFunction: (n) => n.toUpperCase() in FUNCS,
    };
})();
