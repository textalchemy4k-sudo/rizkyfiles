// Shared scene setup for the rumble-strips episode (storyboard and animation): world, town, cast, cars, props, helpers.
import * as THREE from 'three/webgpu';
import { buildWorld, RC, GX, LANE, EDGE, RAIL, SUN_DAY, MOON_DIR } from './world.js';
import { buildTown, ROADW } from './town.js';
import { Toon2D } from './toon2d.js';
import { features } from './face2d.js';
import { CAST } from './cast.js';
import { CutoffSaw } from './saw.js';
import { CarBody, CX } from './cruiser.js';
import { PickupBody } from './pickup.js';
import { CarInterior, EYE, PITCH } from './car.js';
import { unTonedCardMaterial } from './unTone.js';
import * as P from './props.js';

const W = 1080, H = 1920, V = (x, y, z) => new THREE.Vector3(x, y, z);
const renderer = new THREE.WebGPURenderer({ antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement); await renderer.init();
const scene = new THREE.Scene(), townScene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, W / H, 0.03, 9000);
const world = buildWorld(scene), town = buildTown(townScene, world.envDay);
const RX = RC + RAIL;                       // right guardrail face x
const LANE_R = RC + LANE / 2;               // right lane centre (traffic goes toward -z)
// ---------------------------------------------------------------- cast
const T = Object.fromEntries(Object.keys(CAST).map((k) => [k, new Toon2D(CAST[k])]));
for (const t of Object.values(T)) scene.add(t.group);
// ---------------------------------------------------------------- cars: a rig per car (rig origin = car centre on the ground, nose toward -z)
const cars = [];
function makeCar(kind, color, o = {}) {
  const rig = new THREE.Group(); scene.add(rig);
  const body = kind === 'pickup' ? new PickupBody(world.envDay) : new CarBody(world.envDay); body.setLivery(color); body.setTail(0); body.group.position.x = -CX; rig.add(body.group);
  let cabin = null; if (o.cabin) { cabin = new CarInterior(kind === 'pickup' ? { cabEnd: 0.93, rear: false, seat: o.seat } : { seat: o.seat }); body.group.add(cabin.group); cabin.attachDoorTrims(body, CX); }
  const heads = new THREE.Group(); body.group.add(heads); heads.visible = false;
  for (const [d, k] of [[5, 0.05], [9, 0.12], [15, 0.4], [23, 0.55], [33, 0.45], [46, 0.25]]) { const s = new THREE.SpotLight('#fff1dc', 0.05 * k * d * d * d / 0.8, 0, Math.min(1.0, 4 / d + 0.15), 1.0, 2); s.position.set(CX, 1.0, -1.2); s.target.position.set(CX - 0.3, 0, -2.9 - d); heads.add(s, s.target); }
  const cab = new THREE.Group(); body.group.add(cab); cab.visible = false;   // night cabin light: dash glow and moon fill (a soft light so the cabin reads)
  for (const [c, i, dd, p] of [['#d8dde8', 2.2, 2.6, [0.3, 1.52, -0.15]], ['#c8d0e0', 1.2, 1.6, [0.3, 0.6, -0.1]], ['#ff9a4a', 0.5, 0.9, [0.1, 0.98, -0.55]], ['#a8b8e0', 1.8, 2.6, [-0.2, 1.5, -0.4]]]) { const l = new THREE.PointLight(c, i, dd, 2); l.position.set(...p); cab.add(l); }
  const c = { rig, body, cabin, heads, cab, L: (x, y, z) => body.group.localToWorld(V(x, y, z)), dust: new P.DustTrail(scene, 36) };
  c.place = (x, z, yaw = 0, roll = 0, pitch = 0) => { rig.position.set(x, 0, z); rig.rotation.set(pitch, yaw, roll, 'YXZ'); rig.visible = true; rig.updateMatrixWorld(true); return c; };
  c.night = (on) => { heads.visible = on; body.setTail(on ? 1 : 0); cab.visible = on && !!cabin; };
  cars.push(c); return c;
}
const heroTruck = makeCar('pickup', '#2c5a8c', { cabin: true, seat: '#3a3c42' });
const railTruck = makeCar('pickup', '#e8e4d6', { cabin: true, seat: '#3a3c42' });
const stateTruck = makeCar('pickup', '#e0761a', {});
const crashCar = makeCar('car', '#8a2a24', { cabin: true, seat: '#3a3c42' });        // damaged version
const driftCar = makeCar('car', '#8a2a24', { cabin: true, seat: '#3a3c42' });        // the same car before the crash
const signCrash = makeCar('car', '#3a5a7a', {});                                      // crashes by the sign
const inspCar = makeCar('car', '#b4b9c0', { cabin: true, seat: '#7a4e30' });          // state inspector's sedan, tan leather
const passA = makeCar('car', '#c8a24a', {}), passB = makeCar('pickup', '#5a6a5a', {});
// bed loads
{ const b = heroTruck.body.bed, g = heroTruck.body.group;
  const tank = P.makeTank(); tank.position.set((b.x0 + b.x1) / 2 + 0.35, b.y, b.z0 + 0.5); g.add(tank);
  const tb = P.makeToolbox(b.x1 - b.x0 - 0.05); tb.position.set((b.x0 + b.x1) / 2, b.y + 0.32, b.z0 - 0.02); tb.rotation.y = Math.PI; g.add(tb);
  for (let k = 0; k < 3; k++) { const c = P.makeCone(); c.position.set(b.x0 + 0.3, b.y + k * 0.07, b.z1 - 0.35); g.add(c); }
  const jc = P.makeJerryCan(); jc.position.set(b.x0 + 0.35, b.y, b.z0 + 0.4); g.add(jc); }
{ const b = railTruck.body.bed, g = railTruck.body.group;
  const parts = P.makeRailParts(b); parts.position.x = (b.x0 + b.x1) / 2; g.add(parts);
  const rack = P.makeRack(b, 1.74); g.add(rack);
  const bc = P.makeBeacon(); bc.position.set(CX - 0.4, 1.77, -0.2); g.add(bc);
  const logo = P.decal ? null : null; void logo;
  const lt = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#1e5a3a'; x.font = 'bold 92px Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RAILCO', 256, 62); x.font = 'bold 34px Arial'; x.fillStyle = '#c89a12'; x.fillText('GUARDRAIL & REPAIR', 256, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const d of railTruck.body.doors.filter((q) => q.name === 'F')) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.24), new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(CX + d.side * 1.026, 0.82, -0.5); m.rotation.y = d.side * Math.PI / 2; d.inner.add(m); } }
{ const lt = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#1e3a6a'; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill(); x.strokeStyle = '#d8b84a'; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.stroke(); x.fillStyle = '#f2f2f2'; x.font = 'bold 44px Arial'; x.textAlign = 'center'; x.fillText('STATE', 128, 112); x.font = 'bold 30px Arial'; x.fillText('DEPT. OF', 128, 148); x.fillText('TRANSPORT', 128, 182); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const d of inspCar.body.doors.filter((q) => q.name === 'F')) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(CX + d.side * 1.026, 0.82, -0.5); m.rotation.y = d.side * Math.PI / 2; d.inner.add(m); } }
// the thermos on the inspector's passenger seat, and the knocked-over version with the spill
const thermos = P.makeThermos(); thermos.position.set(0.69, 0.6, 0.06); thermos.rotation.set(-0.06, 0.4, 0); inspCar.body.group.add(thermos);
const spillG = new THREE.Group(); inspCar.body.group.add(spillG); spillG.visible = false;
{ const t2 = P.makeThermos(); t2.rotation.set(0, 0.3, Math.PI / 2 - 0.05); t2.position.set(0.78, 0.655, 0.12); t2.userData.cup.position.set(0.06, 0.32, 0.1); t2.userData.cup.rotation.set(0.6, 0, -1.3); spillG.add(t2);
  const sp = P.makeSpill(0.62, 4); sp.position.set(0.7, 0.616, 0.06); sp.rotation.x = 0.13; spillG.add(sp);
  const sp2 = P.makeSpill(0.3, 9); sp2.position.set(0.69, 0.368, -0.45); spillG.add(sp2);
  const sp3 = P.makeSpill(0.22, 11); sp3.position.set(0.5, 0.996, -0.95); sp3.scale.set(1.4, 1, 0.6); spillG.add(sp3);
  const spl = P.makeSplash(55, 6); spl.position.set(0.62, 0.78, -0.12); spillG.add(spl); }
// ---------------------------------------------------------------- props on the road
const saw = new CutoffSaw(world.envDay); scene.add(saw.group);
const sparks = new P.Sparks(scene), sawDust = new P.DustTrail(scene, 30, '#e0d8c8');
const sign = P.makeSign(); sign.position.set(RX + 3.2, 0, -30); sign.rotation.y = -0.3; scene.add(sign);
const hammer = P.makeHammer(); scene.add(hammer);
const ladder = P.makeLadder(3.4); scene.add(ladder);
const cones = [0, 1, 2, 3].map(() => { const c = P.makeCone(); scene.add(c); return c; });
const glint = (() => { const t = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.08, 'rgba(255,250,230,0.8)'); g.addColorStop(0.3, 'rgba(255,240,200,0.12)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(0, 126, 256, 4); x.fillRect(126, 0, 4, 256); const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace; return tt; })(); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(s); return s; })();
const debris = new THREE.Group(); scene.add(debris);
{ const r = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); const ms = [new THREE.MeshStandardMaterial({ color: '#8a2a24', roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 0.05, transparent: true, opacity: 0.7 }), new THREE.MeshStandardMaterial({ color: '#1a1a1a' })];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.02 + r() * 0.05), ms[i % 3]); m.position.set((r() - 0.5) * 3, r() < 0.6 ? 0.02 : 0.2 + r() * 1.2, (r() - 0.5) * 3); m.rotation.set(r() * 6, r() * 6, r() * 6); m.castShadow = true; debris.add(m); } }
const crashDust = new P.DustTrail(scene, 30, '#b8aa90');
// ---------------------------------------------------------------- POV arms (thin ink arms, ball hands), drawn on a card in front of the lens
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cg = cv.getContext('2d'); const armTex = new THREE.CanvasTexture(cv); armTex.colorSpace = THREE.SRGBColorSpace;
const armCard = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), unTonedCardMaterial(armTex, 1)); if (location.search.includes('dbgarm')) armCard.material = new THREE.MeshBasicMaterial({ map: armTex, transparent: true, depthTest: false, depthWrite: false }); armCard.renderOrder = 100; armCard.material.depthTest = false; armCard.material.depthWrite = false; armCard.material.transparent = true; scene.add(armCard);
function drawArms(car, on) {
  armCard.visible = on; if (!on) return;
  const W2 = car.cabin.wheel, R = 0.2, A0 = 0.63, rim = (sd, da) => W2.localToWorld(V(sd * R * Math.cos(A0 + da), R * Math.sin(A0 + da), 0.0)).project(camera), px = (v) => [(v.x * 0.5 + 0.5) * W, (0.5 - v.y * 0.5) * H];
  cg.clearRect(0, 0, W, H); cg.lineCap = 'round'; cg.lineJoin = 'round'; const INK = '#2a2230';
  for (const k of [-1, 1]) {
    const [hx, hy] = px(rim(k, 0)), [ax, ay] = px(rim(k, -0.09)), [bx, by] = px(rim(k, 0.09)), tx = bx - ax, ty = by - ay, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    const sx = k < 0 ? -170 : W + 170, sy = hy + (k < 0 ? 270 : 330), cx = (sx + hx) / 2, cy = (sy + hy) / 2 + 18;
    cg.strokeStyle = INK; cg.lineWidth = 46; cg.beginPath(); cg.moveTo(sx, sy); cg.quadraticCurveTo(cx, cy, hx, hy); cg.stroke();
    cg.strokeStyle = '#4c4560'; cg.lineWidth = 12; cg.beginPath(); cg.moveTo(sx + 4, sy - 14); cg.quadraticCurveTo(cx + 4, cy - 14, hx - k * 10, hy - 12); cg.stroke();   // soft lit stripe along the arm (shading, not an outline)
    cg.fillStyle = INK; cg.beginPath(); cg.ellipse(hx, hy, 60, 52, Math.atan2(uy, ux), 0, 7); cg.fill();                              // palm behind the rim
    cg.strokeStyle = '#3e4046'; cg.lineWidth = 24; cg.lineCap = 'butt'; cg.beginPath(); cg.moveTo(hx - ux * 70, hy - uy * 70); cg.lineTo(hx + ux * 70, hy + uy * 70); cg.stroke();   // the rim passing through the fist
    cg.strokeStyle = '#6a6c74'; cg.lineWidth = 4; cg.beginPath(); cg.moveTo(hx - ux * 70 - uy * 10, hy - uy * 70 + ux * 10); cg.lineTo(hx + ux * 70 - uy * 10, hy + uy * 70 + ux * 10); cg.stroke(); cg.lineCap = 'round';
    const nx = -uy * k, ny = ux * k;                                                                                                     // toward the camera side of the rim
    for (let f = -1.5; f <= 1.5; f += 1) { const fx = hx + ux * f * 22 + nx * 6, fy = hy + uy * f * 22 + ny * 6; cg.fillStyle = INK; cg.beginPath(); cg.ellipse(fx, fy, 13, 19, Math.atan2(uy, ux) + Math.PI / 2, 0, 7); cg.fill(); }   // fingers wrapped over
    cg.strokeStyle = 'rgba(255,255,255,0.18)'; cg.lineWidth = 3; for (let f = -1; f <= 1; f += 1) { const fx = hx + ux * f * 22 + nx * 6, fy = hy + uy * f * 22 + ny * 6; cg.beginPath(); cg.moveTo(fx - nx * 12, fy - ny * 12); cg.lineTo(fx + nx * 12, fy + ny * 12); cg.stroke(); }
    const thx = hx - ux * 40 * k - nx * 18, thy = hy - uy * 40 * k - ny * 18; cg.fillStyle = INK; cg.beginPath(); cg.ellipse(thx, thy, 14, 22, Math.atan2(uy, ux), 0, 7); cg.fill();   // thumb round the back
  }
  armTex.needsUpdate = true; const d = 0.06, hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d, ww = hh * camera.aspect;
  armCard.position.copy(camera.position).add(V(0, 0, -d).applyQuaternion(camera.quaternion)); armCard.quaternion.copy(camera.quaternion); armCard.scale.set(ww * 2, hh * 2, 1);
}
// ---------------------------------------------------------------- helpers
const look = (p, t, fov = 45, roll = 0) => { camera.position.copy(p); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(t); camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
const sunDir = () => world.sunDir || SUN_DAY;
const stand = (t, x, z, yaw, o = {}) => { const f = V(Math.sin(yaw), 0, Math.cos(yaw)), rt = V(Math.cos(yaw), 0, -Math.sin(yaw)); const root = V(x, o.y || 0, z);
  t.pose({ root, yaw, crouch: o.crouch ?? 0.05, bend: o.bend ?? 0.02, feet: o.feet || { L: { pos: root.clone().addScaledVector(rt, -0.11).addScaledVector(f, o.stepL || 0).setY((o.y || 0) + 0.02), yaw }, R: { pos: root.clone().addScaledVector(rt, 0.11).addScaledVector(f, o.stepR || 0).setY((o.y || 0) + 0.02), yaw } }, kneePoles: o.kneePoles,
    hand: o.hand || {}, lookAt: o.lookAt || camera.position.clone(), face: features(o.E || {}, o.life || {}), sun: o.sun || sunDir(), t: o.t || 0, armsFront: o.armsFront, scale: o.scale }); t.group.visible = true; };
const seat = (t, car, o = {}) => { const yaw = Math.PI + car.rig.rotation.y, L = car.L, grip = (sd) => car.cabin.wheel.localToWorld(car.cabin.gripLocal(sd));
  t.pose({ scale: 0.68, root: L(0.08, 0.38, 0.02), yaw: yaw + (o.turn || 0), crouch: 1, bend: o.bend ?? 0.14, bob: 0, feet: { L: { pos: L(-0.02, 0.37, -0.17), yaw }, R: { pos: L(0.18, 0.37, -0.19), yaw } }, kneePoles: { L: L(0.08, 2.0, -1.0).sub(L(0.08, 0.6, 0)).normalize(), R: L(0.08, 2.0, -1.0).sub(L(0.08, 0.6, 0)).normalize() }, cardOff: 0.2,
    hand: o.hand || { L: { pos: grip(-1), w: 1 }, R: { pos: grip(1), w: 1 } }, lookAt: o.lookAt || L(0.08, 1.2, -30), face: features(o.E || {}, o.life || {}), sun: o.sun || MOON_DIR, t: 0, armsFront: false }); t.group.visible = true; };
function resetRoad(k) {
  world.setTime(k); world.grooves.length = 0; for (const s of [-1, 1]) world.rails[s].dents = [];
  for (const c of cars) { c.rig.visible = false; c.night(false); c.body.update(0, 0, 0, 0, 0); c.dust.update(() => V(0, 0, 0), -99); }
  for (const t of Object.values(T)) { t.group.visible = false; if (t.group.parent !== scene) scene.add(t.group); }
  saw.group.visible = false; sparks.update(V(0, 0, 0), V(0, 0, 1), 0, camera, 0); sawDust.update(() => V(0, 0, 0), -99); crashDust.update(() => V(0, 0, 0), -99);
  hammer.visible = ladder.visible = glint.visible = debris.visible = false; cones.forEach((c) => (c.visible = false)); sign.visible = true; spillG.visible = false; world.roadMat.roughness = 1.5; thermos.visible = true; armCard.visible = false;
}
const finish = (stripZ, focus) => { world.setStripWindow(stripZ + 10, stripZ - 10); world.rebuildRails(); world.placeLight(focus); };
const heroAtGroove = (hz, E = { effort: 0.5 }) => {   // the hero kneels on the outer edge of the shoulder, facing the road; the saw's nose points at the road, blade across the shoulder
  saw.group.visible = true; saw.group.position.set(GX + 0.24, -0.03, hz - 0.175); saw.group.rotation.set(0, -Math.PI / 2, -0.06); saw.update({ bladeAngle: 3, trigger: 1, interlock: 1 }); saw.group.updateMatrixWorld(true);
  const rear = saw.group.localToWorld(saw.grips.rear.position.clone()), front = saw.group.localToWorld(saw.grips.front.position.clone()), root = V(GX + 0.84, 0, hz - 0.1), yaw = -Math.PI / 2 + 0.12;
  T.hero.pose({ root, yaw, crouch: 0.9, bend: 0.72, feet: { L: { pos: V(root.x - 0.36, 0.02, root.z - 0.16), yaw }, R: { pos: V(root.x + 0.44, 0.05, root.z + 0.12), yaw } }, kneePoles: { R: V(0, -1, 0.3), L: V(-1, 0.4, 0) },
    hand: { L: { pos: front, w: 1 }, R: { pos: rear, w: 1 } }, lookAt: saw.group.localToWorld(saw.contactLocal(0)), face: features(E), sun: sunDir(), t: 0, armsFront: true }); T.hero.group.visible = true;
  const hit = saw.group.localToWorld(saw.contactLocal(0)); return hit;
};
// ---------------------------------------------------------------- the beats: { t, vo, tr (transition into it), set() }
export { W, H, V, renderer, scene, townScene, camera, world, town, RX, LANE_R, T, cars, makeCar, heroTruck, railTruck, stateTruck, crashCar, driftCar, signCrash, inspCar, passA, passB, thermos, spillG, saw, sparks, sawDust, sign, hammer, ladder, cones, glint, debris, crashDust, cv, cg, armTex, armCard, drawArms, look, sunDir, stand, seat, resetRoad, finish, heroAtGroove };
export { THREE, features, CX, EYE, PITCH, P, RC, GX, LANE, EDGE, RAIL, SUN_DAY, MOON_DIR, ROADW };
