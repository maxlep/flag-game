#!/usr/bin/env python3
"""Derive the claude.ai artifact fragment from index.html.

The artifact host wraps pages in its own <!doctype>/<head>/<body> skeleton and
wants only the head tags, markup and script tags. This strips the document
wrapper and the skeleton styles that the host supplies itself, and adds the
host's side-gutter meta.

Usage: tools/artifact_fragment.py index.html > /path/to/fragment.html
"""
import re, sys

src = open(sys.argv[1]).read()
head = src[src.index('<head>') + 6:src.index('</head>')]
body = src[src.index('<body>') + 6:src.index('</body>')]
# drop charset/viewport/description metas and the skeleton <style> block: the host provides them
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
head = re.sub(r'<meta name="description"[^>]*>\s*', '', head)
head = re.sub(r'<style>.*?</style>\s*', '', head, flags=re.S)
head = head.strip()
title_end = head.index('\n') + 1
head = head[:title_end] + '<meta name="claude:viewport-fit-sides" content="cover">\n' + head[title_end:]
sys.stdout.write(head + '\n\n' + body.strip() + '\n')
