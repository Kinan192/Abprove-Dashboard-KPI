// Computed text/surface sampling for preview QA, not a WCAG certification.
export function contrastReport() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const parse = (value) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
    };
    const blend = (front, back) => {
        const a = front[3] ?? 1;
        return [0, 1, 2].map((i) => front[i] * a + back[i] * (1 - a)).concat(1);
    };
    const lum = (c) =>
        c
            .slice(0, 3)
            .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const pairs = new Map();
    let skipped = 0;
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
        const node = walker.currentNode,
            el = node.parentElement,
            text = node.textContent.trim();
        if (
            !text ||
            !el ||
            el.closest('script,style,[inert],[aria-hidden="true"],.shot-in') ||
            !el.getClientRects().length
        )
            continue;
        const css = getComputedStyle(el);
        if (css.visibility !== 'visible' || el.closest(':disabled')) continue;
        let current = el,
            stack = [],
            ignore = false;
        while (current) {
            const style = getComputedStyle(current);
            if (Number(style.opacity) < 0.99) {
                ignore = true;
                break;
            }
            if (style.backgroundImage !== 'none') {
                ignore = true;
                break;
            }
            const color = parse(style.backgroundColor);
            stack.push(color);
            if ((color[3] ?? 1) === 1) break;
            current = current.parentElement;
        }
        if (ignore) {
            skipped++;
            continue;
        }
        let bg = [255, 255, 255, 1];
        stack.reverse().forEach((c) => {
            bg = blend(c, bg);
        });
        const fg = blend(
            parse(el.namespaceURI.includes('svg') ? css.fill : css.color),
            bg,
        );
        const l = [lum(fg), lum(bg)].sort((a, b) => a - b),
            ratio = (l[1] + 0.05) / (l[0] + 0.05);
        const large =
            parseFloat(css.fontSize) >= 24 ||
            (parseFloat(css.fontSize) >= 18.66 &&
                Number(css.fontWeight) >= 700);
        const key =
            fg.slice(0, 3).join(',') +
            '/' +
            bg.slice(0, 3).join(',') +
            '/' +
            large;
        if (!pairs.has(key))
            pairs.set(key, {
                text: text.slice(0, 90),
                color: fg.slice(0, 3),
                background: bg.slice(0, 3),
                ratio: Math.round(ratio * 1000) / 1000,
                required: large ? 3 : 4.5,
            });
    }
    const values = [...pairs.values()];
    return {
        sampledPairs: values.length,
        skippedDecorativeOrGradient: skipped,
        issues: values.filter((p) => p.ratio + 0.005 < p.required),
        pairs: values,
    };
}
