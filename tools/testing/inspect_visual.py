"""Read-only screenshot/token checks; writes evidence, never edits UI sources."""
import json
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/frontend'
FAMILIES = {
    'dominant': ['#FFFFFF', '#F8FAFA'],
    'supporting': ['#EDF8F6', '#D2EFEA', '#F1F4F4'],
    'accent': ['#076C63', '#087F73', '#075A53'],
}


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def luminance(value):
    channels = [x / 255 for x in rgb(value)]
    linear = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in channels]
    return sum(a * b for a, b in zip(linear, [.2126, .7152, .0722]))


def contrast(text, surface):
    a, b = sorted([luminance(text), luminance(surface)])
    return round((b + .05) / (a + .05), 3)


pairs = [
    ('body', '#162833', '#FFFFFF'),
    ('secondary', '#52616B', '#FFFFFF'),
    ('secondary on workspace', '#52616B', '#EDF8F6'),
    ('secondary on selection', '#52616B', '#D2EFEA'),
    ('primary link', '#076C63', '#FFFFFF'),
    ('primary action/navbar', '#FFFFFF', '#076C63'),
    ('hover action', '#FFFFFF', '#075A53'),
    ('mint action/summary', '#076C63', '#D2EFEA'),
    ('deep heading', '#0D3D39', '#EDF8F6'),
    ('submitted', '#2359B8', '#EEF4FF'),
    ('returned', '#905700', '#FFF7E8'),
    ('final', '#5141A4', '#F1EEFB'),
    ('success', '#196D4B', '#EAF7EF'),
    ('error', '#B42332', '#FFF1F2'),
    ('draft', '#52616B', '#F1F4F4'),
]
report = {
    'method': 'WCAG sRGB luminance of source text/background tokens; disabled controls excluded. '
              'Ratios use exact solid family pixels, excluding text, borders, antialias and semantic colors; '
              'this is a composition measurement, not full automated WCAG certification.',
    'contrast': [dict(label=label, text=text, surface=surface, ratio=contrast(text, surface),
                      AA_normal=contrast(text, surface) >= 4.5) for label, text, surface in pairs],
    'screenshots': {},
}
for name in ['unit-dashboard-desktop', 'hc-dashboard-desktop']:
    path = OUT / 'screenshots' / f'{name}.png'
    picture = Image.open(path).convert('RGB')
    counts = Counter(picture.getdata())
    families = {key: sum(counts[rgb(c)] for c in colors) for key, colors in FAMILIES.items()}
    total = sum(families.values())
    report['screenshots'][name] = {
        'viewport': picture.size,
        'classifiedSolidPixels': total,
        'percentageOfClassifiedPixels': {key: round(count / total * 100, 2) for key, count in families.items()},
    }
for name in ['unit-dashboard-tablet', 'unit-dashboard-mobile', 'score-desktop', 'score-tablet', 'score-mobile']:
    picture = Image.open(OUT / 'screenshots' / f'{name}.png')
    report['screenshots'][name] = {'viewport': picture.size}

inspection = json.loads((OUT / 'figcraft-inspection.json').read_text(encoding='utf-8'))


def walk(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk(value)


nodes = list(walk(inspection))
report['figcraft'] = {
    'topLevelFrames': sum(child.get('type') == 'FRAME' for page in inspection.get('pages', []) for child in page.get('children', [])),
    'allFramesIncludingNestedComponents': sum(node.get('type') == 'FRAME' for node in nodes),
    'pages': [node.get('name') for node in nodes if node.get('type') == 'PAGE'],
    'documentPath': inspection.get('path'),
}
report['allTextTokenPairsPassAA'] = all(row['AA_normal'] for row in report['contrast'])
(OUT / 'visual-qa.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
