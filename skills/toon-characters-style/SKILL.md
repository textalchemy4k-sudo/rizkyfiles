---
name: toon-characters-style
description: Rules and a working engine for 2D cartoon characters that live in a 3D three.js WebGPU world - an invisible 3D skeleton posed every frame (IK arms/legs, planted feet, sitting, kneeling, grabbing), the 2D drawing redrawn every frame from it, emotion-driven faces, clothes wrapped round a round invisible form, hats/hair that follow the head, and light-following cel shading that keeps faces white at night. Use whenever a character must be designed, walk, sit, kneel, hold a prop, react or be lit.
---

# Toon characters: characters, movement, lighting, design

Read `rules/characters.md` first: it is the full rule set. The engine in `engine/` is a complete, approved 10 s test
(a character walks to a bomb, squats, picks it up, the fuse lights, he panics, blows it out, relief) - copy it to start.

## Setup
`npm install` in `engine/`, then `node tools/capture.js 0 60 120` writes stills to `cook/stills/cur/`. Every frame is
`window.renderFrame(f)`, a pure function of the frame number.

## Files
- `src/toon2d.js` — the rig and the drawing (skeleton(), pose(), draw(camera)). `src/toon2d_v2.js` is the later version
  with outfits (tee, hi-vis vest, shirt+tie, polo), hard hat, hair caps, glasses, `scale`, `kneePoles`, `cardOff`.
- `src/face2d.js` — face from emotions: `features({ surprise, fear, anger, joy, sad, effort, doubt, tired, blow }, { blink })`.
- `src/refface.js` — head outline, sweat drop. `src/unTone.js` — card material that inverts ACES so white stays white.
- `src/cast.js` — example cast definitions. `src/main.js` — the test scene: footsteps planned as world positions,
  monotone body glide, emotion tracks, blinks, head bounce, hat spring, tree shade on the character.
- Props in the test: `tree.js` (procedural oak with sway and dappled shade), `bomb.js`.

## How to direct a character
- Pose inputs per frame: `root, yaw, crouch, bend, feet {L,R: {pos, yaw}}, hand {L,R: {pos, w}}, lookAt, face, sun,
  armsFront, scale, kneePoles, cardOff, bounce, hatSpring`.
- Plan footsteps as world positions; blend hand targets in with weights; never snap.
- Drive the face with emotion curves over time; let a blink hide each eye-type change; jolt the head on each change.
- Seated: scale ~0.68 for a car cabin, hips on the cushion, feet by the pedals, knees bent, hands on the rim grips.

## Checks
Face white ~253 when measured; largest per-frame joint jump small; nothing clipping; back view shows no face;
look at faces at full size; contact sheet across the clip. Say what was not checked.
