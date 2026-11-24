---
name: toon-storyboard-review
description: The storyboard-first and review workflow for cartoon shorts - turn a script and voice into a timed brief, one beat per voice line, render one still per beat into a storyboard sheet, get approval before any animation, then review every round with stills, close-ups, contact sheets, cut detection and fresh-eyes critics, and never send a known defect. Use when starting a new short, making or fixing a storyboard, or checking work before sending it.
---

# Storyboard first, then review every round

Read `GUIDE.md`. It is the full workflow with the checklists. Worked examples from Rumble Strips are in `examples/`:
`BRIEF_example.md`, `beats.json`, and the two storyboard sheets (`storyboard_1.jpg`, `storyboard_2.jpg`).

## Files
- `templates/BRIEF.md`: fill this in first.
- `templates/board_template.js`: the storyboard page pattern (a `BEATS` list; frame n renders beat n).
- `tools/capture.js`: renders stills of a page (`PAGE=board.html node tools/capture.js 0 1 2 ...`).
- `tools/sheet.html` + `tools/shot.js`: the storyboard sheet (5 per row, with time, transition tag and voice line).
- Review commands (contact sheet, cut detector, crops) are in `GUIDE.md`.

Works with the engine in `cartoon-shorts-complete` (copy these files into that project: `tools/` into `tools/`,
`sheet.html` and `beats.json` into `cook/`).
