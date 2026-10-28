"""Refresh local asset URLs from their content. Run after map, CSS, or JS edits."""
from pathlib import Path
import hashlib
import re
root=Path(__file__).resolve().parents[1]
def refresh_reference(host, asset):
    file=root/host
    value=root/asset
    if not (file.is_file() and value.is_file()):
        return
    version=hashlib.sha256(value.read_bytes()).hexdigest()[:12]
    file.write_text(re.sub(re.escape(asset)+r'(?:\?v=[0-9a-f]{12})?',asset+'?v='+version,file.read_text()))

refresh_reference('map-style.json','subway-exits.geojson')
refresh_reference('integration.js','map-style.json')

def version(match):
    name=match.group(1)
    file=root/name
    return name+'?v='+hashlib.sha256(file.read_bytes()).hexdigest()[:12] if file.is_file() else match.group()
for name in ['app.html','entry.html','index.html']:
    file=root/name
    text=file.read_text()
    text=re.sub(r'(?<=["\'])([^"\'?<>]+\.(?:css|js))(?:\?v=[^"\'<>]+)?(?=["\'])',version,text)
    file.write_text(text)
