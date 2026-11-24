# Backgrounds and objects (realistic, procedural)

## Principle
- Claude builds every object and the whole world from code: nothing downloaded or pasted in. Every model is
  procedural and part-addressable: each part is its own node that can move every frame (doors open, wheels turn,
  blades spin, rails bend, branches sway).
- Semi-realistic, a little cartoony. Look up a real photo and the real dimensions of every object before modelling.
- No flat slabs, perfect boxes or plain cubes: rounded bevels, real parts, texture and relief on everything.
- Nothing clips through anything. Inspect every part at full size from fixed inspection views before using it.
  Full techniques: modeling.md.

## The world
- Terrain stretches for miles; the horizon blurs into the sky (fog).
- Grass renders at every distance (no distance cut-off, no flat green far away), never on the road; darker green.
- Fields: long strips along the road with visible crop rows and soft transitions; no square patches.
- Roads: asphalt texture with aggregate, cracks, sealed cracks, wheel tracks, lane lines; dry (no glossy patches).
  Grass verges beside the road; guardrails on I-beam posts standing on the grass.
- Damage is real geometry: deep, irregular rumble-strip grooves (each a different shape, chipped edges, fresh-cut
  floor, dark walls) on the road's own material; guardrails dent (push out, drop, twist, scrapes, tilted posts);
  cars crumple at the impact point; dust and sparks.
- Many objects in every scene (town: shops with interiors behind glass, awnings, signs, lamps, trees, benches,
  hydrants, mailboxes, meters, traffic light, parked cars); the open road is the exception (fields fill it).
- Cars: real wheels (tyre carcass + tread blocks, rim barrel, dished spokes, hub, brake disc + caliper), closed
  underbody, doors/hood/tailgate cut from the body on hinges, thick doors with trim (leather insert, armrest, pull,
  speaker, pocket), full interior visible from outside (stitched perforated seats, dash with vents/cluster/stack,
  console + gear lever, pedals, mats, carpet). Dust behind every moving car.
- Props as examples: giant warning sign (textured face, bolts, Z-bars, I-beam posts, footings), thermos (hammertone,
  steel bands, cup lid, handle), coffee spill and splash, traffic cone, W-beam rail parts, beacon, ladder rack,
  diamond-plate toolbox, water tank, jerry can, ladder, hammer, petrol cut-off saw with grips.

## Sky and outdoor light (shared with camera-lighting)
- Day: blue sky, shaded cumulus (lit tops, grey-blue bellies, colour variation), cloud shadows drifting over the
  ground. Dusk: pink clouds, purple-blue horizon. Night: dark blue, moon never under clouds, purple-blue horizon,
  never white haze.
