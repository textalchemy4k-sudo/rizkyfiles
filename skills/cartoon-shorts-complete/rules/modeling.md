# Modelling techniques that worked (cars, wheels, tools). Code is in engine/src (cruiser.js, wheel.js, saw.js, car.js, grass.js, surfaces.js)

## Workflow (do not skip)
1. **Analyse the reference first.** Extract frames with ffmpeg and look at them full size. Measure colours with
   `tools/regions.py` (mean RGB per named region) and motion with `tools/shake.py` (phase correlation). Look up real
   dimensions (for example a Tahoe PPV is 5.18 m long, 2.04 m wide, 2.95 m wheelbase, 275/55R20 tyres).
2. **Build an inspection page** (`carview.js`, `view.js`) with fixed views: 3/4 front and rear, side, top, and close-ups
   of the wheel, underside, roof, rear corner and every moving part in its moved state. Render all of them after every
   change and look at each at full size. Fix every defect before sending (memory: no-known-defects).
3. **Check every patch.** After each patch run `tools/brackets.py` on the file; a stray `//` comment once ate the rest
   of a line.

## Surfaces (never plain boxes)
- `grid(us, vs, pos(u,v), pick(i,j,centre,u,v) -> material key | null, outward)`: one parametric surface split into
  several meshes by material. That is how stripes, lamps, glass and frames come out of the same surface.
- **Body side skin:** a profile in height (v) swept along z.
  - It rolls under at the rocker and gets a top fillet.
  - It bulges slightly, with a shoulder crease and a lower body line. The bulge fades out near the ends, so the panels meet flush.
  - The bottom follows the wheel-arch curve exactly (`archTop(z)`), so there are no stair-step cut-outs.
- **Doors, hood and tailgate** are cut from the same surface with 3-6 mm gaps (extra grid rows at the gap lines), with a
  dark liner behind so the shut lines read. Each hangs on its real hinge pivot. The inner group offset cancels the
  pivot, so geometry stays in car coordinates.
- **Rounded rear corners:** stop the side skin RC short of the end and sweep a quarter-round corner surface along the
  side's own cross-section. The rear face then narrows to `xs(y) - RC` at every height.
- **Greenhouse:**
  - tumblehome sides, with virtual stations remapped per row (`gmap`) so the pillar bands are exact rows with straight edges;
  - the roof edge in body colour and a crowned roof whose edges roll down;
  - accessories seated on `roofY(x)`, never floating.
- **Superellipsoid shells** for moulded plastic housings (exponent 0.4-0.55), deformed with shear and taper.
- **Lathe profiles** for anything round: tyres, rims, flanges, knobs, caps, lamps, exhaust tips, cones and buckets.
- **Tubes** (centripetal Catmull-Rom) for handles, hoses and rails. Rubber sleeves get rounded collar rings at both ends, never raw cut edges.
- **ExtrudeGeometry with bevels** for flat shaped parts: spokes, triggers, blade segments, spoilers as an airfoil
  bent to the roof crown, and brake calipers.

## Wheels (wheel.js): a real wheel, never a flat disc
- **Tyre carcass:** a lathe of the bead, a bulging sidewall, the shoulder and the crown.
- **Tread:** separate bevelled tread blocks, instanced in staggered rows.
- **Rim:** the rim barrel is a lathe of the flanges, bead seats and drop centre, with a polished rolled outer lip.
- **Spokes:** bevelled and tapered, dished in toward the hub.
- **Hub:** domed, with hex lug nuts and a chrome cap.
- **Brakes:** behind the spokes, a vented disc (two plates with vanes between) and a caliper that doesn't spin.
- **Wheel wells:** half-tube liners over the top of the wheel plus an inner wall. The floor pan is notched around the wheel wells and tucked inside the sills.

## Underbody (never hollow)
A closed floor pan for the full length, frame rails and cross members, an engine and gearbox, both axles, a
differential and drive shaft, a fuel tank, and the exhaust run with a muffler out to the tips.

## Materials
- **Car paint:** MeshPhysical with clearcoat 1, an orange-peel normal map on the clearcoat, and a grime roughness map.
- **Rubber:** a knurl normal map. **Leather:** a pebbled normal map. **Cast metal:** a grain normal map.
- **Glass:**
  - side and rear glass tinted at about 0.62 opacity, so the interior shows;
  - the windshield is an unlit faint tint, because moonlight on physical glass made a sharp dot.
- **Lamps:** ribbed emissive lens textures. Tail lights get a glare sprite, a short flare streak, and a red spot light on the road.
- **Night headlights:** a soft wash, not a ray. Several wide spots aimed at increasing distances, with intensity
  about proportional to d^3 so each band lights the road about evenly, and the last bands tapered so the light fades out.

## Characters with props and vehicles
- Grip points are Object3Ds on the prop (`saw.grips.rear` / `saw.grips.front`), and `pose.hand.L/R = { pos, w: 1 }`.
- Seated characters: pass `scale` (about 0.68 in the cruiser) and put the hips on the seat cushion. From behind, the
  rig draws the back of the head (`hd.back`).
- Wheel grips use `car.gripLocal(sd)` through `wheel.localToWorld`.

## Doors and interior (user rule, 2026-11-20)
- **Opening doors have real depth:** a thick door shell, an inner trim panel in leather or dashboard material, an
  armrest, a pull handle, a speaker grille, the window frame and the glass inside the door top.
- **The interior is visible from outside:**
  - seats with stitched panels and a pleated or perforated centre insert, plus bolsters and headrests;
  - a full dash with vents, cluster and centre stack;
  - a console with the gear lever;
  - brake and gas pedals with rubber or metal texture in the footwell;
  - carpet.
