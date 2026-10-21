#!/usr/bin/env python3
"""Write js/version.js with the build number this commit will have (git commit count + 1) and the time.

Run before every commit: tools/stamp_version.py && git add js/version.js
"""
import subprocess, datetime, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
count = int(subprocess.check_output(['git', '-C', str(root), 'rev-list', '--count', 'HEAD']).decode().strip())
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
(root / 'js' / 'version.js').write_text(f'// Written by tools/stamp_version.py before each commit.\nconst VERSION={{n:{count + 1},at:"{now}"}};\n')
print(f'build {count + 1} · {now}')
