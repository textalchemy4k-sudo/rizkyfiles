---
name: cartoon-shorts-complete
description: Everything needed to make vertical 2D-cartoon-characters-in-a-3D-world story shorts at "Rumble Strips" quality - a procedural three.js WebGPU world (roads, fields, towns, cars with interiors, damage), 2D characters redrawn every frame from an invisible 3D skeleton with emotion-driven faces and light-following shading, calm smooth cameras with a camera editor, real sound effects, a music picker, frame-exact rendering, subtitles and the full rule set. Use when the user gives a script + voice and wants a short made, asks for a storyboard, animation, render, mix, the camera editor or the music picker.
---

# Cartoon shorts: the complete pipeline

This skill is a working engine plus every rule that produced the Rumble Strips short. Read the rules before building:
- `rules/characters.md` — skeleton-driven 2D characters, movement, faces, clothes, lighting on characters
- `rules/world.md` — procedural realistic world and objects
- `rules/modeling.md` — how every object is modelled from code (surfaces, lathes, wheels, interiors, materials)
- `rules/camera_lighting.md` — calm smooth cameras, push-ins on what is said, sun/sky/night lighting
- `rules/process.md` — order of work, quality bar, sound

## Setup (once)
1. Node 18+, Python 3, ffmpeg/ffprobe on PATH, Google Chrome (WebGPU). Copy `engine/` to a new project folder.
2. In the project: `npm install` (playwright, ffmpeg-static). For word timings: `pip install faster-whisper`.
3. `.claude/launch.json` starts the camera editor / music picker server (`node tools/editor_server.js 5179`).
4. Put the voice at `audio/voice.mp3`, your sound effects in `sfx/` (`sfx/mine`, `sfx/kenney`, `sfx/bigsoundbank`),
   music in `music/` (see `out/mix.py`). Only CC0 or your own sounds; never AI-generated sound effects.

## Engine map (`engine/`)
- `src/world.js` — road world: sky domes with shaded cumulus, moon, cloud shadows, miles of terrain with wheat strips
  and crop rows, grass to the horizon (`grass.js`), asphalt (`surfaces.js`), damageable rumble strip (`cutGrooves`,
  `setStripWindow`), guardrails with dents (`rails[s].dents`, `rebuildRails`), power lines, fence; `setTime(k)` day->night.
- `src/geo.js` (rbox, I-beams), `src/props.js` (sign, thermos, spill, cones, rail parts, beacon, rack, toolbox, tank,
  ladder, hammer, DustTrail, Sparks, `crumple()`), `src/town.js` (main street), `src/saw.js` (cut-off saw with grips).
- `src/cruiser.js`, `src/pickup.js`, `src/wheel.js`, `src/car.js` — cars from parametric surfaces, opening doors with
  thick trim, real wheels, full interiors (`CarInterior`, `attachDoorTrims`).
- `src/toon2d.js`, `face2d.js`, `refface.js`, `unTone.js`, `cast.js` — the character rig, emotion faces, card material, cast.
- `src/setup.js` — builds the scene once (world, town, cast, cars, props, POV arms) with helpers (`seat`, `stand`, `makeCar`…).
- `src/board.js` (`board.html`) — storyboard: one still per beat. `src/anim.js` (`anim.html`) — the animation: shots
  `{id, keys, a, b, fade, set(t)}`, camera via `shotCam`/`track()` (even speed), `shakeAt`, `rumble`, dissolves.
  These two are the Rumble Strips episode — replace the beats/shots for a new story, keep the rest.
- Inspection pages: `carview.html` (cars, `?pickup`, `&fill`), `ptest.html` (props), `wtest.html` (world), `ttest.html` (town).
- Tools: `tools/capture.js` (stills, `PAGE=`/`Q=`), `tools/eval.js`, `tools/render.js` (frame range -> mp4),
  `out/render_all.sh` (300-frame chunks, verified counts, concat), `tools/shot.js` (storyboard sheet),
  `tools/subs_overlay.js` (word-by-word subtitle overlay), `tools/transcribe.py` (Whisper word timings),
  `out/mix.py` (voice -14 LUFS + SFX + music), `tools/brackets.py` + `tools/swallow.py` (code checks after patches).
- User tools: `editor.html` + `src/editor.js` (camera editor with sound, waveform, words, keys -> `cameras.json`),
  `music.html` + `tools/music_options.py` (music picker with live volume -> `music_choice.json`).

## Companion skills and references
- `face_board.jpg` (and `engine/faceboard.html`) shows every face the engine draws, with the emotion values.
- `tools/mix_cues.py` is a cue-sheet mixer (JSON in, final mix out). Full sound rules are in the `toon-sound-finish`
  skill. The storyboard and review checklists are in `toon-storyboard-review`.

## Order of work (always)
1. Transcribe the voice (`tools/transcribe.py`), fix words against the script. Write `cook/BRIEF.md`: must-haves and
   one beat per line of the voice with times.
2. Study every reference at full size; measure, don't guess.
3. Build/extend models and world; inspect every part from the inspection pages at full size.
4. Storyboard (`board.html`): one still per beat -> sheet -> **get approval before animating**.
5. Animate (`anim.html`): calm smooth camera per shot, creative slightly exaggerated motion, impacts shake,
   no teleporting, push-ins on what the voice names. Test frames across every shot and every dissolve.
6. Render in chunks; check frame counts. Subtitles overlay. Mix. Music: build the picker, let the user choose.
7. Before sending: contact sheet, close-ups, loudness. Say what was not checked.

## Hard rules (summary — full text in rules/)
- Characters: never character sheets; skeleton + 2D redrawn every frame; planted feet; hands truly grip; knees bend
  when seated; faces from emotions (both eyes same type, swap inside a blink, brows lead, mouth last, head bounce);
  clothes wrap a round invisible form; hats/hair redrawn per frame; faces stay white (un-tone-mapped cards);
  cel shading follows the scene light; scene shadows fall on them. New cast every story; never name them on screen.
- World: everything procedural and part-addressable; no slabs/boxes; textures everywhere; grass to the horizon; long
  wheat strips; real damage geometry; real wheels and interiors; dust behind cars; many objects (except open road).
- Camera: calm, one smooth even-speed move per shot or a hold; push in on what is said and ease out; no snaps, no
  blocked views; respect camera-editor keys.
- Lighting: real sun + sky fill + cloud shadows; dark blue nights; headlights as a soft wash; tail-light glare;
  purple-blue dusk/night horizon; moon never under clouds.
- Sound: real recordings on exact moments; music under the voice; final -14 LUFS.
- Never send known defects; storyboard first; every frame a pure function of the frame number.
