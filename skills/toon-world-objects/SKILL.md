---
name: toon-world-objects
description: Realistic procedural backgrounds and objects for cartoon shorts in three.js WebGPU - miles of terrain with wheat strips and grass to the horizon, textured roads with real damage (rumble-strip grooves, bending guardrails, crumpled cars), a filled town street, cars with real wheels, opening thick doors and full interiors, and props (signs, tools, thermos, cones...) built part by part from code with inspection pages. Use when a scene, background, vehicle or prop must be modelled or a place must be filled with objects.
---

# Realistic backgrounds and objects

Read `rules/world.md` (what the world must look like) and `rules/modeling.md` (how every object is built). Every
object is procedural and part-addressable: built from parameters, each part its own node that can move.

## Setup
`npm install` in `engine/`. Inspect with the pages: `carview.html` (views 0-14; `?pickup`, `?plain`, `&fill`),
`ptest.html` (props), `wtest.html` (world, day/dusk/night), `ttest.html` (town). Stills:
`PAGE=carview.html Q='?pickup' node tools/capture.js 0 2 5 12 13`.

## Files
- `src/world.js` — `buildWorld(scene)`: skies (day/dusk/night domes, shaded cumulus, moon, cloud shadows), terrain
  (wheat strips, crop rows), grass and wheat (instanced, to the horizon), asphalt, lines, shoulders, rumble strip
  (`cutGrooves(zFrom, zTo)`, `setStripWindow(z0, z1)`: deep irregular grooves on the road's own material), guardrails
  (`rails[s].dents.push({ z, len, out, drop, twist }); rebuildRails()`), power lines, fence, `setTime(k)`.
- `src/surfaces.js` (asphalt, shoulder textures), `src/grass.js` (TSL grass), `src/geo.js` (rbox, I-beam).
- `src/cruiser.js`, `src/pickup.js` — car bodies from parametric surfaces (`grid()`), doors/hood/tailgate on hinges
  with liners and sill plates, lamps with glare, `setLivery`, `setTail`, `update(dist, steer, doors, tailgate, hood)`.
- `src/wheel.js` — real wheels (tyre carcass, tread blocks, rim barrel, dished spokes, hub, brake disc + caliper).
- `src/car.js` — `CarInterior({ cabEnd, rear, seat })`: dash, cluster, wheel, centre stack, console, pedals, mats,
  slanted stitched/perforated seats; `attachDoorTrims(body)` gives every door a thick trim panel.
- `src/props.js` — sign, thermos, spill/splash, cone, W-beam parts, beacon, rack, toolbox, tank, jerry can, ladder,
  hammer, `DustTrail`, `Sparks`, `crumple(group, point, dir, radius, depth)` for car damage.
- `src/town.js` — `buildTown(scene, env)`: shopfronts with interiors behind glass, awnings, signs, lamps, trees,
  benches, hydrants, mailboxes, meters, traffic light, water tower, parked cars.
- `src/saw.js` — petrol cut-off saw with grips, `contactLocal`, spinning blade.
- Tools: `capture.js`, `eval.js`, `regions.py` (colour per region), `brackets.py` + `swallow.py` (run after every patch:
  a `//` comment in the middle of a line silently eats code).

## Method for any new object
1. Real photo + real dimensions. 2. Part list. 3. Build with surfaces/lathes/extrusions/tubes, bevelled, textured.
4. Moving parts on pivots. 5. Inspection views at full size (every side, close-ups, moved states). 6. Fix every defect.
7. Save the approved model for reuse.
