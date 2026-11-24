# Camera work and lighting

## Camera
- The camera follows the story: whenever the voice names an object or an action, the camera smoothly zooms in on it,
  then eases back out (push in, pull out) in the same move.
- Calm: one smooth move per shot, or a hold. No handheld drift, no tilt, no orbits unless asked.
- Even speed along the path (arc-length parameterisation) with speed changes blurred over ~0.6 s; never a sharp
  turn, snap, or left-right sway on a push-in; the look-at point never passes the camera.
- Never a flat, level, straight-on angle unless asked; prefer slightly from below or above.
- Open wide on the subjects and the place, then move in. Characters mostly full-length; no unintended crop of the
  head or hat. Rule of thirds.
- Creative angles: ground level next to the action, high aerial down the road (centred, symmetric, wide lens so it
  stretches far), through a side window, the driver's own point of view.
- Nothing blocks the lens (open doors, poles, props). Check the path, not only the keys.
- Field of view moves with the move (~34-50 degrees; narrow for push-ins, wide for establishing shots).
- Transitions: cross-dissolve between places or times; continuous moves inside a place; never through black.
- Impacts shake the camera (decaying shake); rumble strips = continuous fast jitter.
- The user can key cameras in the camera editor (keys per shot: time, position, target, fov); respect the keys
  exactly and only smooth them.

## Lighting
- A real sun (directional light with shadows) plus a blue sky fill (hemisphere) and the same sky as the environment
  map for reflections. Everything gets its light from it; objects cast real shadows; clouds cast soft shadows.
- Shiny objects (car paint with clearcoat, metal, hard hats) catch small highlights.
- Time of day blends day -> dusk -> night (domes, clouds, moon, fog, light colours, env maps).
- Night is dark and blue; a light in view (headlights, lamp, fire) makes its pool bright and the surroundings darker;
  with no light in view the moonlight reads clearer. Headlights are a soft wash that fades out (several wide spots at
  increasing distance, intensity ~ d^3), never a ray. Tail lights get a red glare sprite, a short flare and a red
  spot on the road. Never add cars that were not asked for.
- Characters are lit by the same sun (shading direction follows it) but faces stay white and clean at night (see
  characters.md, un-tone-mapped cards).
