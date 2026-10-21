# Flag Game

A quiz for learning the flags of the world. Every answer shows what the flag's colours and symbols mean, look-alike flags are drilled against each other, and progress is saved in your browser. Master all 197 and you're the Flag Lord.

Built by prompting Claude: the ideas, testing and bug reports are mine; the code is Claude's.

Flag images from [flag-icons](https://github.com/lipis/flag-icons) (MIT) and, for official proportions, [svg-country-flags](https://github.com/hampusborgos/country-flags) (public domain).

## Layout

- `index.html` – markup and script tags
- `css/app.css` – styles
- `js/app.js` – state, quiz logic, views
- `js/data/flags.js` – every flag: code, name, set, capital, description
- `js/data/groups.js` – look-alike sets and their hints
- `js/data/names.js` – typed-answer aliases, Wikipedia title overrides, official proportions, adoption years
- `js/version.js` – commit time, written by `tools/stamp_version.py` before each commit
- `flags/` – 4:3 artwork; `flags-true/` – official proportions
- `tools/` – SVG edge snapping and the claude.ai artifact fragment generator

Working conventions are in CLAUDE.md.
