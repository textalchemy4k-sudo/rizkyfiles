# Storyboard and review guide

The rule behind everything: **nothing gets animated until the storyboard is approved, and nothing gets sent with a
defect you can see.** Fixing a still takes minutes. Fixing an animated, rendered and mixed shot takes hours.

---

## Part 1: from script to brief

1. **Get the word timings.** Run `python -I tools/transcribe.py audio/voice.mp3 words.json`, then fix every misheard
   word against the script.
2. **Split the voice into beats.** Make one beat per phrase, about 1.5 to 4 s each. A 55 s short has about 20 to 25
   beats. The beat changes where the voice changes idea, never in the middle of a word.
3. **Write `cook/BRIEF.md`** (template in `templates/BRIEF.md`):
   - Inputs: voice, script, references with exact times ("the aerial at 6 to 9 s").
   - Must-haves for every beat: style, world, objects, cars, lighting, framing, transitions.
   - One line per beat: number, voice time, the words in quotes, the transition into it (open, cut, continuous move,
     FADE, timelapse), and exactly what we see (who, where, doing what, camera, day or night).
   - The cast: a new set of characters for every story, with their clothes, hats and hair. Never name them on screen.
4. **Copy the user's words exactly** when they describe a shot. If they wrote "a creative slight zoom", the beat
   says "a creative slight zoom".

## Part 2: the storyboard

1. **The board page** (`board.html` + `src/board.js`, pattern in `templates/board_template.js`):
   - It has a `BEATS` list with `{ t, vo, tr, set() }`.
   - `renderFrame(n)` builds beat n+1: it resets the world, places the cars and props, poses each character and sets
     the camera.
   - Each still is the most telling moment of its beat, usually the middle of the action.
2. **Render the stills**: `PAGE=board.html node tools/capture.js 0 1 2 ... 24`. Copy them to `cook/board/`, and resize
   them to `s000.jpg ...` (540 wide).
3. **Write `cook/beats.json`** from the BEATS list (`n, t, vo, tr`).
4. **Make the sheet**: `node tools/shot.js cook/sheet.html "?a=0&b=15&title=My%20short" cook/storyboard_1.jpg`, then
   `?a=15&b=25` for the second sheet.
5. **Check every panel at full size before sending.** Use the panel checklist (Part 4).
6. **Send the sheets and wait for approval.** Write the user's changes into `cook/NEXT_FIXES.md` word for word, fix
   all of them, and send again. Only an explicit OK starts the animation.

## Part 3: the review loop (every round of animation)

Each round has the same steps:
1. **Fix**: start with the user's feedback first, then the worst problem you found.
2. **Stills**: render frames across every shot, at the start, middle and end of each one, plus the middle of every
   dissolve and every camera move.
3. **Look at them full size**. Crop and zoom on faces, hands, feet, wheels, door edges, signs, grass far away.
4. **Contact sheet** of the whole clip (one frame per second):
   `ffmpeg -i out/clean.mp4 -vf "fps=1,scale=216:-1,tile=10x6" -frames:v 1 cook/contact.jpg`
5. **Cut detector**, which catches jumps, teleports and the camera passing through things:
   `ffmpeg -i out/clean.mp4 -vf "select='gt(scene,0.3)',showinfo" -an -f null - 2>&1 | grep pts_time`
   Every flagged time must be a planned cut or dissolve. Look at any other.
6. **Fresh-eyes critic** (every few rounds): a new agent that sees only the stills and the brief, scores each part
   0 to 10 and lists problems as blocker, major or minor. Check each claim yourself, because critics misread.
7. **Log** the round in `cook/ROUNDS.md`: what changed, where the evidence is, what is still wrong.
8. **Send** stills with a short note. Don't stop to wait: keep improving until the user answers.

## Part 4: the checklists

**Every panel and every still**
- Feet on the ground (no floating, no sinking). Seated characters have their knees bent and hips on the seat.
- Hands really hold the prop or wheel (fingers wrap it). Nothing passes through anything else.
- Faces: both eyes are the same type, the expression matches the line, and the face is white even at night. A back
  view shows no face.
- Characters are a good size in the frame, not too small and not cut off. Nothing blocks the camera.
- The world is full: objects, grass to the horizon, textures on every surface. There are no flat slabs or empty
  areas.
- Light: shadows fall the right way, night is dark blue, headlights make a soft wash, and tail lights glow.
- Cars: real wheels on the road, open doors show thick trim, and interiors are visible through glass.
- The camera angle is not flat, and it differs from the shot before.

**Every motion check**
- Each camera move is calm and even, with no snap at a key. A push-in goes toward what the voice names.
- Nobody teleports: every position change is walked or driven. Feet stay planted while weight shifts.
- Face changes happen inside a blink. Impacts shake the camera.
- Dissolves: the mid-frame looks good, with no double character standing in one spot.

**Before sending a final**
- The frame count matches the voice length × fps. The duration is right.
- Subtitles match the script word for word.
- Loudness: voice, sound effects, music and final measured (final about -14 LUFS).
- Contact sheet, plus close-ups of the key moments.
- Say plainly what was **not** checked (audio is measured, not heard; motion seen as stills).

## Part 5: feedback that works

- Feedback gets logged word for word, then each item is fixed and shown with a still. Nothing gets dropped.
- A correction that applies to every video becomes a rule (in `rules/`), so it never has to be said twice.
