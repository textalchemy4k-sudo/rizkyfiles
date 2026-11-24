---
name: toon-camera-lighting
description: Camera work and lighting for cartoon shorts in three.js - calm, smooth, even-speed camera moves that push in on whatever the voice names and ease back out, creative angles, impact shakes and rumble, a camera editor with the voice/waveform/words for keying shots, plus the lighting rules and code (sun + sky + cloud shadows, day->dusk->night, dark nights with soft headlight washes, tail-light glare, white faces at night). Use when planning or animating a camera, keying shots, or lighting a scene.
---

# Camera work and lighting

Read `rules/camera_lighting.md` for the full rules.

## Camera engine (`engine/camera.js`)
- `track(keys)` — keys `[[t, [px,py,pz], [tx,ty,tz], fov, roll], ...]`. The path passes through every key; the camera
  moves at an even speed between keys (arc length) and speed changes are blurred over ~0.6 s, so nothing snaps.
  One key = a still camera; two = one smooth move.
- `setCam(camera, sample, shake)`, `shakeAt(t, [{t0, a, f}])` (decaying impact shake), `rumble(t, a)` (rumble strips).
- Frames: `WORLD`, `carFrame(group)` (keys inside a moving car), `offFrame(x, z)` (keys that follow a moving point).
- Planning: list the beats and what each line names; one calm move per shot (open wide, push in on the named object,
  ease out); vary height/side between shots; check every frame of the path, not only the keys (open doors!).

## Camera editor (`engine/editor/`)
- `node tools/editor_server.js 5179`, open http://localhost:5179. It loads the project's `src/anim.js` (shots with
  `id` + `keys`, exposed through `window.ANIM`) and the mix `out/editor_audio.m4a`.
- Waveform with words and keys, click a word to jump, Play shot with sound, scrub blips. Fly the camera (drag orbit,
  right-drag pan, wheel dolly, WASD/QE), Add key / Select + Replace (keeps time) / Copy here / Delete / Reset, Save ->
  `cameras.json`, which the render uses (keys are smoothed, never moved).
- `music.html` + `music_options.py` — the background-music picker (tracks over the rendered video, live volume, Save
  as final -> `music_choice.json`).

## Lighting (`engine/lighting_reference.js` = the code from the full engine)
- Sun: shadowed directional light following the camera focus (`placeLight`); hemisphere sky fill; the sky as env map.
- `setTime(k)` blends day (blue dome, white cumulus, cloud shadows on) -> dusk (pink clouds, purple horizon) -> night
  (dark blue, moon light, purple-blue fog, cloud shadows off).
- Headlights: several wide spot lights aimed at increasing distances, intensity ~ d^3, fading out; never a ray.
  Tail lights: emissive lenses + glare sprite + flare + red spot on the road. A night cabin light keeps faces readable.
- Characters: cards are un-tone-mapped so faces stay white; their cel shading uses the scene's light direction.
