"""Validate the static dictionary; never reads user configuration or uses the network."""
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
path = root / 'mods/cc-ru/dict.json'
duplicates = []

def pairs(items):
    out = {}
    for key, value in items:
        if key in out:
            duplicates.append(key)
        out[key] = value
    return out

data = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=pairs)
errors = [f'Duplicate key: {k}' for k in duplicates]
placeholder = re.compile(r'\$\{[^}]*\}|\$\d+|%(?:\d+\$)?[sdif]')
for key, value in data['exact'].items():
    if not isinstance(value, str) or not value.strip():
        errors.append(f'Empty/non-string value: {key}')
        continue
    if sorted(placeholder.findall(key)) != sorted(placeholder.findall(value)):
        errors.append(f'Placeholder mismatch: {key}')
    if re.search('[\u3400-\u9fff]', value):
        errors.append(f'Unexpected Chinese translation: {key}')
    if '\ufffd' in value:
        errors.append(f'Invalid Unicode replacement character: {key}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'OK: {len(data["exact"])} entries; placeholders, Unicode and unique keys verified.')
