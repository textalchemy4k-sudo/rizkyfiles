# Characters, movement, faces, clothes, lighting on characters

## How a character is built (never character sheets)
- No 3D character model and no pre-drawn poses. Every character has an invisible 3D skeleton (hips, chest, head,
  shoulders, elbows, hands, knees, feet) posed every frame: two-bone IK for arms and legs, spine bend, crouch, yaw,
  head look. The 2D drawing is rebuilt from that skeleton on a canvas every single frame (`toon2d.js`).
- Joints are projected along the camera ray onto camera-facing cards, so a drawn hand lands exactly on a 3D prop and
  size follows perspective. Body card ~0.12 m in front of the root; a front card ~0.55 m carries arms that hold things.
- Draw order: far arm/leg always behind the torso; a near limb comes in front only when its joint really is in front.
- Limbs are ink strokes of constant width curving through knee/elbow. Hands are ink balls, feet small ink ovals that
  point the way the foot faces.
- The card faces the camera; pitch toward the camera is clamped to 55 degrees so high/low angles never squash it.
- Back view (body facing away): draw the back of the head (hair, hat), no face.

## Movement
- Planted feet: footsteps are world positions; a foot stays exactly where it landed until its next step (no sliding).
- Normal strides (~0.5 s, 0.35-0.6 m). The body glides between footfalls on a monotone cubic with a slight bob.
  Turning on the spot uses real steps, never a foot swivel.
- No teleporting: every hand target blends in from the rest pose by a weight; feet never snap. Jumps only in a timelapse.
- Movement is creative and slightly exaggerated (bouncy, overshoot, anticipation) with a creative pose per action.
- Kneeling, sitting, crouching, picking up are real IK poses (kneePoles for the knee direction).
- Heavy things are held from below on both palms; hands slide from a side grip to underneath as it lifts.
- Holding a tool: grip points are Object3Ds on the prop (rear handle + top handle of a saw); both hands land on them.
- Anything that gets hit shakes (sign when hammered, guardrail and car in a crash, the camera too).
- A worker on a road stands outside the road on the shoulder, facing the road.

## Sitting in vehicles
- Hips on the right seat cushion, feet on the floor by the pedals, knees bent (thigh forward, shin down), leaning
  slightly toward the wheel. Hands visibly grip the rim (fingers wrap it).
- Scale the character to the cabin (~0.68 for a car) so the head clears the roof and sits just above the headrest.
- Pull the card toward the camera (`cardOff` ~0.2) so seats never cut through the drawing.
- POV arms: ink arms with ball fists wrapped round the rim, no outline.
- Check from outside through the glass at full size.

## Faces (from emotions, never presets)
- Every frame the face is computed from emotion levels: surprise, fear, anger, joy, sadness, effort, doubt,
  tiredness (+ blowing). Any mix gives a face, so new expressions appear that are in no reference.
- Reference faces are references only; never pick a preset face.
- Proportions in head radii R: neutral eyes = solid black dot ovals ~0.08 x 0.12 R at x=+-0.27 R; wide eyes = white
  circles ~0.19 R, thick outline, pupil ~0.075 R; half-lidded = thick flat lid line ~0.075 R wider than the eye;
  strain = thick > < chevrons; blink = short arc.
- Both eyes always the same type. Change eye type outright (never a fade), hidden inside a blink.
- Brows lead, the mouth follows last; the head squashes and bounces on every change of feeling, then a still hold.
- Brows: short thick rounded bars, never level. Default mouth: small imperfect dark bean. Shock: big round mouth with
  red tongue (never the happy D). Teeth: white row with lines (grin / gritted / grimace). Moustache: chunky lobes,
  curled tips, ink outline, soft shine. Sweat drops on the face.
- Characters blink, breathe, glance; each has a temperament (tempo, amplitude).

## Clothes and accessories
- Torso: skinny egg (narrow top under the head, widest 2/3 down, round bottom). Arms attach just below the neck.
- The body outline always faces the camera, but clothes are drawn as if wrapped round a round invisible form: on a
  turn stripes, buttons, tie, pockets slide toward the side and compress at the edge; back views hide front details.
- Hats and hair are 2D and redrawn every frame for the head tilt and look direction: the brim swings to the look side,
  tips forward when looking down (never over the eyes), bounces on a spring driven by head acceleration.
- Hair hugs the head shape (short, slight fringe), never big. Some characters wear hats, some only hair.
- No perfect shapes: every outline point carries a fixed wobble. Base accessories on a real reference.
- New cast for every story; never re-dress an old cast. Never name characters on screen.

## Lighting on characters (the style rule)
- Faces pure white (#ffffff), even at night. Cards use the un-tone-mapped material (`unTone.js` inverts ACES);
  otherwise white renders ~226 grey. Measure a face pixel: ~253.
- Face: cel shaded - one light main tone plus a hard-edged slightly darker crescent on one side, following the
  scene's light direction (so it moves when the light moves or the character turns), plus a thin shine line along
  the edge.
- Body, hat, hair: lighter on one side, darker toward the other, thin white shine lines (~50% opacity) inside the
  outline following the shape's curve, a soft blurred sheen on cloth, subtle fold lines.
- Scene shadows: where a real occluder (tree canopy, roof) blocks the sun, multiply a low-opacity blue-grey layer over
  only the drawn pixels there (rays from the character's real position to the sun). Leaf shade is dappled.
