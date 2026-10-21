#!/usr/bin/env python3
"""Add shape-rendering="crispEdges" to axis-aligned rectangles in flag SVGs.

Adjacent stripes otherwise show hairline seams when the browser scales the flag
to a non-integer pixel size. Only shapes made of horizontal/vertical moves are
touched; curves, stars and transformed shapes are left smooth.

Usage: tools/snap_edges.py flags/xx.svg [more.svg ...]
"""
import re, sys

AXIS_ONLY = re.compile(r'[^MmHhVvZz0-9.\s\-]')

def snap(svg: str) -> str:
    def fix(m):
        tag = m.group(0)
        if 'shape-rendering' in tag or 'transform' in tag:
            return tag
        if not tag.startswith('<rect'):
            d = re.search(r'\bd="([^"]*)"', tag)
            if not d or AXIS_ONLY.search(d.group(1)):
                return tag
        if tag.endswith('/>'):
            return tag[:-2].rstrip() + ' shape-rendering="crispEdges"/>'
        return tag[:-1] + ' shape-rendering="crispEdges">'
    return re.sub(r'<(?:path|rect)\b[^>]*>', fix, svg)

if __name__ == '__main__':
    for path in sys.argv[1:]:
        with open(path) as f:
            src = f.read()
        out = snap(src)
        if out != src:
            with open(path, 'w') as f:
                f.write(out)
            print('snapped', path)
