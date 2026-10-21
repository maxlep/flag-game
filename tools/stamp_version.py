#!/usr/bin/env python3
"""Write js/version.js with the commit time. The page compares this timestamp with the one on GitHub to spot a stale copy.

Run before every commit: tools/stamp_version.py && git add js/version.js
"""
import datetime, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
(root / 'js' / 'version.js').write_text(f'// Written by tools/stamp_version.py before each commit.\nconst VERSION={{at:"{now}"}};\n')
print(f'stamped {now}')
