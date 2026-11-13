"""Validate native FigCraft structure and prototype routes without raster output."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / 'output/design-review/simple-dashboard'
manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
path = root / 'design/prototypes/KPI-Kinerja-UIUX-Simple-Dashboard.figcraft'
doc = json.loads(zipfile.ZipFile(path).read('document.json'))
nodes = doc['nodes']
screens = {row['id']: row for row in manifest['screens']}
info = json.loads((folder / 'native-info.json').read_text(encoding='utf-8-sig'))
errors = []


def owning_screen(id):
    visited = set()
    while id is not None:
        if id in visited:
            errors.append(f'Ancestor cycle at node {id}')
            return None
        visited.add(id)
        if id in screens:
            return id
        id = nodes[str(id)].get('parent')
    return None


interactions = 0
for row in manifest['screens']:
    frame = nodes[str(row['id'])]
    if (frame.get('width'), frame.get('height')) != (1440, 900):
        errors.append(f'Screen dimensions: {row}')
    if row['page'] != 'login':
        children = [nodes[str(id)] for id in frame.get('children', [])]
        if not any(n.get('name') == 'Sidebar tetap / 232 px' and n['width'] == 232 for n in children):
            errors.append(f'Sidebar dimensions: {row}')
        if not any(n.get('name') == 'Navbar tetap / 64 px' and n['height'] == 64 for n in children):
            errors.append(f'Navbar dimensions: {row}')
        sidebar = next(n for n in children if n.get('name') == 'Sidebar tetap / 232 px')
        navigation = [nodes[str(id)]['name'] for id in sidebar.get('children', []) if nodes[str(id)]['name'].startswith('Navigasi / ')]
        if not navigation or not navigation[0].startswith('Navigasi / Dashboard') or any('Beranda' in label for label in navigation):
            errors.append(f'Navigation order: {row}')
    if row['page'] == 'beranda':
        errors.append('Retired home screen is still present')

for key, n in nodes.items():
    owner = owning_screen(int(key))
    if owner is None:
        continue
    for child in n.get('children', []):
        if nodes[str(child)].get('parent') != n['id']:
            errors.append(f'Parent mismatch at {child}')
    for interaction in n.get('interactions', []):
        interactions += 1
        if interaction.get('trigger', {}).get('type') != 'onClick':
            errors.append(f'Unexpected trigger at {key}')
        for action in interaction.get('actions', []):
            if action.get('type') == 'navigate':
                target = action.get('dest')
                if target not in screens:
                    errors.append(f'Broken destination at {key}: {target}')
                elif screens[target]['role'] != screens[owner]['role']:
                    errors.append(f'Cross-role navigation at {key}')
    if n.get('parent') == owner and n['type'] == 'frame':
        x, y = n.get('transform', [1, 0, 0, 1, 0, 0])[4:]
        if x < 0 or y < 0 or x+n.get('width', 0) > 1440.1 or y+n.get('height', 0) > 900.1:
            errors.append(f'Top-level content escapes screen: {n["name"]} on {screens[owner]["page"]}')

flows = []
for role, id in manifest['pages'].items():
    page = nodes[str(id)]
    flows += page.get('flows', [])
    if len(page.get('flows', [])) != 1:
        errors.append(f'Missing role flow: {role}')
if interactions != manifest['interactions']:
    errors.append('Serialized interaction count differs from source commands')
if info.get('missingFonts'):
    errors.append('Native document has unavailable fonts')
if info.get('images') != 0:
    errors.append('Unexpected image assets')
source_sha = hashlib.sha256(Path(manifest['source']).read_bytes()).hexdigest()
if source_sha != manifest['source_sha256']:
    errors.append('Source document has changed')
raw_log = (folder/'native-cli-log.jsonl').read_bytes()
log = raw_log.decode('utf-16' if raw_log.startswith(b'\xff\xfe') else 'utf-8-sig')
cli = [json.loads(line) for line in log.splitlines() if line.strip()]
if any(not row.get('ok') for row in cli):
    errors.append('Official FigCraft command failed')
report = {
    'status': 'PASS' if not errors else 'FAIL',
    'document': str(path.relative_to(root)),
    'sourceUnchanged': source_sha == manifest['source_sha256'],
    'screens': len(screens), 'rolePages': len(manifest['pages']),
    'onClickInteractions': interactions, 'flowStartingPoints': len(flows),
    'dimensions': '1440x900', 'sidebar': 232, 'navbar': 64,
    'missingFonts': info.get('missingFonts'), 'imageAssets': info.get('images'),
    'officialEngineCommands': len(cli),
    'errors': errors,
}
(folder / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(bool(errors))
