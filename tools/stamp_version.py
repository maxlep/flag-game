#!/usr/bin/env python3
"""Write js/version.js with the commit time, and put the same stamp on the asset links in index.html.

The page compares its own stamp with the one the site serves to spot a stale copy. The stamped links
(css/app.css?v=..., js/ui/viewer.js?v=..., and so on) mean a freshly fetched index.html always loads matching assets,
however long a browser or CDN has cached the old ones.

Run before every commit: tools/stamp_version.py && git add js/version.js index.html
"""
import datetime, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
now = datetime.datetime.now(datetime.timezone.utc)
stamp = now.strftime('%Y-%m-%d %H:%M UTC')
v = now.strftime('%Y%m%d%H%M')
(root / 'js' / 'version.js').write_text(f'// Written by tools/stamp_version.py before each commit.\nconst VERSION={{at:"{stamp}"}};\n')
html = (root / 'index.html').read_text()
html = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+)(?:\?v=\d+)?"', lambda m: f'{m.group(1)}?v={v}"', html)
(root / 'index.html').write_text(html)
print(f'stamped {stamp}')
