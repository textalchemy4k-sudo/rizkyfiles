// Shorts 17 "rumble strips": the full animation, 56.5 s at 30 fps. window.renderFrame(f) is a pure function of f.
// Shots follow the approved storyboard; inside a shot the camera never stops (toon-camera rules), FADE beats cross-dissolve
// (render the old shot, snapshot it, render the new one, lay the snapshot over it), impacts shake what is hit and the camera.
import { W, H, V, renderer, scene, townScene, camera, world, town, RX, LANE_R, T, heroTruck, railTruck, stateTruck, crashCar, driftCar, signCrash, inspCar, passA, passB, thermos, spillG, saw, sparks, sawDust, sign, hammer, ladder, cones, glint, debris, crashDust, armCard, drawArms, sunDir, seat, resetRoad, makeCar, THREE, features, CX, EYE, PITCH, P, RC, GX, LANE, EDGE, RAIL, MOON_DIR } from './setup.js';
const FPS = 30, DUR = 56.54, FRAMES = Math.ceil(DUR * FPS);
const GSTEP = 0.305;
// ---------------------------------------------------------------- overlay canvas for dissolves
const glc = renderer.domElement; glc.style.position = 'absolute'; glc.style.left = glc.style.top = '0';
const uiC = document.createElement('canvas'); uiC.width = W; uiC.height = H; uiC.style.position = 'absolute'; uiC.style.left = uiC.style.top = '0'; document.body.appendChild(uiC); const ui = uiC.getContext('2d');
const snap = document.createElement('canvas'); snap.width = W; snap.height = H; const sg = snap.getContext('2d');
document.body.style.margin = '0'; document.body.style.background = '#000';
// ---------------------------------------------------------------- helpers
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const K = (keys, t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const [t0, a] = keys[i], [t1, b] = keys[i + 1]; const u = cl((t - t0) / (t1 - t0)), s = u * u * (3 - 2 * u); return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * s) : a + (b - a) * s; };
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const emo = (E, t) => { const o = {}; for (const k in E) o[k] = K(E[k], t); return o; };
const blinkAt = (t, list) => { let b = 0; for (const x of list) { const d = Math.abs(t - x); if (d < 0.08) b = Math.max(b, 1 - d / 0.08); } return b; };
const life = (t, blinks, hold = 0) => ({ blink: Math.max(hold, blinkAt(t, blinks)), browJit: 0.008 * Math.sin(t * 6.3) + 0.005 * Math.sin(t * 11.7) });
const jolt = (t, js) => { let s = 0; for (const [t0, a] of js) { const d = t - t0; if (d > 0 && d < 0.8) s += a * Math.exp(-d * 6) * Math.sin(d * 19); } return s; };
// decaying shake from impacts [{t0, a (m), f (Hz)}]: camera offset + roll
const shakeAt = (t, evs) => { const o = V(0, 0, 0); let r = 0; for (const e of evs) { const d = t - e.t0; if (d < 0 || d > 1.5) continue; const k = e.a * Math.exp(-d * (e.k || 5)); o.x += k * Math.sin(d * e.f * 6.28 + 1); o.y += k * Math.sin(d * e.f * 5.1 + 2.3) * 0.8; r += k * 0.25 * Math.sin(d * e.f * 4.3); } return { o, r }; };
// continuous rumble (on the strips): fast jitter of the given amplitude
const rumble = (t, a) => ({ o: V(a * (Math.sin(t * 71) + 0.6 * Math.sin(t * 113 + 1)), a * (Math.sin(t * 83 + 2) + 0.5 * Math.sin(t * 131)), 0), r: a * 0.6 * Math.sin(t * 97 + 0.5) });
// camera track: [t, pos, tgt, fov, roll], Catmull-Rom through the keys so it never stops, with a slight handheld drift
function track(keys) {
  // the path goes through every key (Catmull-Rom); along it the camera moves at an even speed inside each stretch between
  // keys (distance proportional to time), and changes of speed at a key are blurred over 0.6 s, so nothing snaps
  if (keys.length < 2) keys = [keys[0], [keys[0][0] + 1, ...keys[0].slice(1)]];
  const n = keys.length, T0 = keys.map((k) => k[0]), N = 300 * (n - 1);
  const prep = (j) => { const C = new THREE.CatmullRomCurve3(keys.map((k) => V(...k[j])), false, 'centripetal'); C.arcLengthDivisions = N; const L = C.getLengths(N); return { C, tot: L[N], at: keys.map((k, i) => L[Math.round((i / (n - 1)) * N)]) }; };
  const P = prep(1), Q = prep(2);
  const lin = (arr, t) => { if (t <= T0[0]) return arr[0]; if (t >= T0[n - 1]) return arr[n - 1]; let i = 0; while (t > T0[i + 1]) i++; const f = (t - T0[i]) / (T0[i + 1] - T0[i] || 1); return arr[i] + (arr[i + 1] - arr[i]) * f; };
  const blur = (arr, t) => { let v = 0; for (let k = -6; k <= 6; k++) v += lin(arr, t + k * 0.05); return v / 13; };
  const pt = (S, t) => (S.tot < 1e-5 ? S.C.getPoint(0) : S.C.getPointAt(cl(blur(S.at, t) / S.tot)));
  const fovs = keys.map((k) => k[3]), rolls = keys.map((k) => k[4] || 0);
  return (t) => ({ p: pt(P, t), q: pt(Q, t), fov: blur(fovs, t), roll: blur(rolls, t) });
}
function setCam(c, t, sh = null, drift = 1) {
  if (window.EDIT && window.EDIT.free) return;   // the editor flies the camera itself
  drift *= CAMS.drift ?? 0;
  const p = c.p.clone().add(V(Math.sin(t * 0.9) * 0.025, Math.sin(t * 1.3 + 1) * 0.018, Math.sin(t * 0.7 + 2) * 0.02).multiplyScalar(drift));
  camera.position.copy(p); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(c.q); camera.rotateZ(c.roll + (sh ? sh.r : 0));
  if (sh) { camera.translateX(sh.o.x); camera.translateY(sh.o.y); } camera.updateMatrixWorld();
}
// ---------------------------------------------------------------- editable cameras
// cameras.json: { "drift": 0, "s1": [[t, [px,py,pz], [tx,ty,tz], fov, roll], ...], ... } in each shot's own frame
const CAMS = await fetch('cameras.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const memo = new Map(), trackOf = (keys) => { const k = JSON.stringify(keys); if (!memo.has(k)) memo.set(k, track(keys)); return memo.get(k); };
const calm = (keys) => { const a = keys[0], b = keys[keys.length - 1]; return [[a[0], a[1], a[2], a[3], 0], [b[0], b[1], b[2], b[3], 0]]; };
const WORLD = { to: (v) => v.clone(), from: (v) => v.clone() };
const carFrame = (c) => ({ to: (v) => c.L(v.x, v.y, v.z), from: (v) => c.body.group.worldToLocal(v.clone()) });
const offFrame = (x, z) => ({ to: (v) => V(v.x + x, v.y, v.z + z), from: (v) => V(v.x - x, v.y, v.z - z) });
const keysOf = (s) => { const k = CAMS[s.id] || (s.keep ? s.keys : calm(s.keys)); return k.length === 1 ? [k[0], [k[0][0] + 1, k[0][1], k[0][2], k[0][3], k[0][4]]] : k; };   // one key = a still camera
function shotCam(s, t, F = WORLD) { s.F = F; const c = trackOf(keysOf(s))(t); return { p: F.to(c.p), q: F.to(c.q), fov: c.fov, roll: c.roll }; }
// car-frame keys: positions/targets given in a car's body frame
const inCar = (car, c) => ({ p: car.L(c.p.x, c.p.y, c.p.z), q: car.L(c.q.x, c.q.y, c.q.z), fov: c.fov, roll: c.roll });
// strip and rails rebuild only when they change
let stripKey = '', railKey = '';
function strip(z0, z1) { const g = world.grooves, key = [z0.toFixed(2), z1.toFixed(2), g.length, g.length ? g[0].z.toFixed(2) : 0, g.length ? g[g.length - 1].z.toFixed(2) : 0, g.reduce((s, x) => s + x.p * 3 + x.fresh, 0).toFixed(3)].join('|'); if (key !== stripKey) { world.setStripWindow(z0, z1); stripKey = key; } }
function rails() { const key = JSON.stringify([world.rails[1].dents, world.rails[-1].dents]); if (key !== railKey) { world.rebuildRails(); railKey = key; } }
const grooveZ = (k) => (k + 0.5) * GSTEP;   // groove k sits on the grid used by cutGrooves
const drive = (c, x, z, yaw, dist, steer = 0, roll = 0, pitch = 0) => { c.place(x, z, yaw, roll, pitch); c.body.update(dist, steer); };
const tailOff = (c) => { for (const o of c.body.tail) if (o.isSprite) o.visible = false; };
// a damaged twin for each crash car, crumpled once at load (so frames stay pure functions of time)
const crashD = crashCar; P.crumple(crashD.body.group, crashD.place(0, 0, 0).L(CX + 0.75, 0.7, -2.9), V(-0.6, 0, 1), 0.8, 0.24, 7); crashD.rig.visible = false;
const signD = makeCar('car', '#3a5a7a', {}); P.crumple(signD.body.group, signD.place(0, 0, 0).L(CX + 0.8, 0.7, -2.9), V(-0.6, 0, 1), 0.75, 0.22, 3); signD.rig.visible = false;
const drift2 = makeCar('car', '#5a6a3a', { cabin: true, seat: '#3a3c42' }), drift2D = makeCar('car', '#5a6a3a', {}); P.crumple(drift2D.body.group, drift2D.place(0, 0, 0).L(CX + 0.75, 0.7, -2.9), V(-0.6, 0, 1), 0.7, 0.2, 5); drift2D.rig.visible = false;
const night2 = makeCar('car', '#7a7a80', {});   // traffic in the timelapses
// debris burst from an impact at p0 (world), t since impact
function burst(p0, dt) { debris.visible = dt > 0; debris.position.set(0, 0, 0); debris.children.forEach((m, i) => { const a = hash(i) * 6.28, sp = 2 + hash(i + 9) * 4, up = 1 + hash(i + 3) * 3.5, d = Math.min(dt, 1.2), y = Math.max(0.02, 0.3 + up * d - 4.9 * d * d);
  m.position.set(p0.x + Math.cos(a) * sp * d * 0.6 - 0.8 * d, y, p0.z + Math.sin(a) * sp * d * 0.6); m.rotation.set(i + dt * 9, i * 2 + dt * 7, 0); }); }
// ---------------------------------------------------------------- the hero cutting grooves: one cycle per groove
// cut 0-1.3 (saw slides across the shoulder, groove p 0->1), lift 1.3-1.5, rise and shuffle one groove forward 1.5-1.85, kneel 1.85-2.0
function heroCut(t, k0, period = 2.0, E0 = {}, top = null) {
  const n = Math.floor(t / period), c = t - n * period, k = k0 - n, hz = grooveZ(k);
  if (top !== null) world.cutGrooves(top, hz + 0.01);   // every groove already finished behind him
  const cut = cl(c / 1.3), lift = sm(1.3, 1.5, c) * (1 - sm(1.85, 2.0, c)), shift = sm(1.5, 1.85, c);
  for (const g of world.grooves) if (g.z > hz + 0.01) g.fresh = Math.max(g.fresh, 0.5);
  world.grooves.push({ z: hz, p: Math.max(0.02, cut), fresh: cut });
  const plunge = sm(0, 0.15, c) * (1 - lift), slide = sm(0.1, 1.25, c), vib = c < 1.3 ? 0.004 : 0;
  saw.group.visible = true; saw.group.position.set(GX + 0.24 + 0.16 - 0.32 * slide + vib * Math.sin(t * 173), 0.1 - 0.13 * plunge + 0.14 * lift + vib * Math.sin(t * 211), hz - 0.175 - GSTEP * shift);
  saw.group.rotation.set(-0.35 * lift + 0.08 * (1 - plunge) * (1 - lift), -Math.PI / 2, 0, 'YXZ'); saw.update({ bladeAngle: t * 260, trigger: c < 1.35 ? 1 : 0.2, interlock: 1 }); saw.group.updateMatrixWorld(true);
  const rear = saw.group.localToWorld(saw.grips.rear.position.clone()), front = saw.group.localToWorld(saw.grips.front.position.clone());
  const rz = hz - 0.1 - GSTEP * shift, root = V(GX + 0.84 - 0.16 * slide * (1 - lift), 0, rz), yaw = -Math.PI / 2 + 0.12, crouch = 0.9 - 0.45 * sm(1.4, 1.6, c) * (1 - sm(1.8, 1.97, c)), bend = 0.72 - 0.3 * lift;
  const stepL = sm(1.55, 1.75, c), stepR = sm(1.65, 1.85, c), zL = hz - 0.16 - GSTEP * stepL, zR = hz + 0.12 - GSTEP * stepR;
  const feet = { L: { pos: V(root.x - 0.36, 0.02 + 0.08 * Math.sin(Math.PI * stepL), zL), yaw }, R: { pos: V(root.x + 0.44, 0.05 + 0.06 * Math.sin(Math.PI * stepR), zR), yaw } };
  const E = { effort: 0.65 * (1 - lift) + (E0.effort || 0), joy: 0.35 * sm(1.25, 1.4, c) * (1 - sm(1.8, 2.0, c)), doubt: E0.doubt || 0 };
  T.hero.pose({ root, yaw, crouch, bend, feet, kneePoles: { R: V(0, -1, 0.3), L: V(-1, 0.4, 0) }, hand: { L: { pos: front, w: 1 }, R: { pos: rear, w: 1 } }, lookAt: saw.group.localToWorld(saw.contactLocal(0)),
    face: features(E, life(t, [0.62 + n * period, 1.92 + n * period])), sun: sunDir(), t, armsFront: true, bounce: jolt(c, [[1.95, 0.07], [0.02, 0.04]]) + vib * 2 * Math.sin(t * 90), bob: 0 });
  T.hero.group.visible = true;
  return { hit: saw.group.localToWorld(saw.contactLocal(0)), cutting: c < 1.3, hz };
}
// ---------------------------------------------------------------- shots
const SH = [];
// 1-3  0.0-6.3  day: cutting grooves; camera wide -> push in on the blade -> pull out over the row of grooves and the truck -> aerial
{ const K0 = Math.floor(0.3 / GSTEP), keys = ([
    [0.0, [GX - 3.4, 0.65, 4.2], [GX + 0.6, 0.6, 0.0], 46, 0.0], [1.0, [GX - 1.75, 0.55, 1.6], [GX + 0.1, 0.18, 0.2], 37, 0.02], [2.0, [GX - 2.5, 1.5, -2.4], [GX + 0.6, 0.5, 0.4], 44, -0.02],
    [3.2, [GX + 7.5, 7.5, 2.5], [GX + 0.3, 0.3, 0.0], 50, 0.0], [4.6, [RC + 3, 22, 28], [RC, 0, -80], 56, 0.0], [6.3, [RC, 48, 60], [RC, 0, -230], 62, 0.0]]);
  SH.push({ id: 's1', keys, a: 0, b: 6.3, set(t) {
    resetRoad(0); const h = heroCut(t, K0, 2.0, {}, 40); heroTruck.place(GX + 1.55, 13, 0.02);
    passA.place(RC - LANE / 2, -150 + 26 * t, Math.PI); passA.body.update(26 * t); passA.dust.update((x) => V(RC - LANE / 2, 0, -150 + 26 * x - 2.6), t, { strength: 0.35 });
    setCam(shotCam(this, t), t); T.hero.draw(camera); sparks.update(h.hit, V(0.25, 0, -1).normalize(), t, camera, h.cutting ? 1 : 0);
    sawDust.update((x) => h.hit.clone().add(V(0.25 * (t - x), 0, 0.5 * (t - x))), t, { rate: 9, life: 1.3, strength: h.cutting ? 0.045 : 0.02, halfW: 0.04 });
    strip(h.hz + 6, h.hz - 4); rails(); world.placeLight(V(GX, 0, h.hz)); } });
}
// 4  6.0-10.1  FADE to night, same aerial; flies in as a car drifts into the guardrail
const TI = 8.75, ZI = -78;
const crashState = (t) => { if (t < TI) { const z = -20 - 21 * (t - 6), x = LANE_R + (RX - 1.15 - LANE_R) * Math.pow(sm(7.3, TI, t), 1.4); return { x: Math.min(x, RX - 1.15), z: Math.max(z, ZI), yaw: -0.24 * sm(7.3, 8.4, t), pre: true }; }
  const d = t - TI; return { x: RX - 1.28, z: ZI - 3.2 * (1 - Math.exp(-d * 4)), yaw: -0.24 - 0.22 * (1 - Math.exp(-d * 6)), pre: false, d, roll: 0.05 * Math.exp(-d * 4) * Math.sin(d * 25), pitch: 0.04 * Math.exp(-d * 5) * Math.sin(d * 21 + 1) }; };
const crashSetup = (t) => {
  world.rails[1].dents = t < TI ? [] : [{ z: ZI - 0.4, len: 2.4, out: 0.55 * (1 - Math.exp(-(t - TI) * 18)) + 0.06 * Math.exp(-(t - TI) * 5) * Math.sin((t - TI) * 30), drop: 0.12 * sm(TI, TI + 0.2, t), twist: 0.6 * sm(TI, TI + 0.15, t) }];
  const s = crashState(t), car = s.pre ? driftCar : crashD; (s.pre ? crashD : driftCar).rig.visible = false;
  drive(car, s.x, s.z, s.yaw, 21 * Math.min(t, TI) - 120, s.pre ? -0.12 * sm(7.4, 8.4, t) : 0.3, s.roll || 0, s.pitch || 0); car.night(true);
  if (!s.pre) { burst(car.L(CX + 0.8, 0.5, -2.6), t - TI); crashDust.update((x) => car.L(CX + 0.6, 0, -2.4 + (t - x) * 0.6), t, { rate: 16, life: 1.6, strength: 0.4, halfW: 0.5, night: 1 }); }
  else car.dust.update((x) => { const q = crashState(x); return V(q.x, 0, q.z + 2.6); }, t, { strength: 0.18, night: 1 });
  return { car, s };
};
{ const keys = ([[6.0, [RC, 48, 60], [RC, 0, -230], 62, 0], [7.2, [RC + 3, 26, -6], [LANE_R, 0, -70], 52, 0.0], [8.3, [RC + 5, 10, -50], [RX - 2, 0.4, -78], 46, 0.02], [9.2, [RC + 6.4, 4.8, -66], [RX - 1.4, 0.6, -80], 42, -0.02], [10.2, [RC + 7.0, 3.6, -70], [RX - 1.3, 0.8, -81], 40, 0]]);
  SH.push({ id: 's4', keys, a: 6.0, b: 10.0, fade: true, set(t) {
    resetRoad(1); const { car } = crashSetup(t);
    seat(T.driver, car, { E: t < TI ? { tired: 0.9 } : { surprise: 1, fear: 0.6 }, life: { blink: t < TI ? 1 : 0 }, bend: t < TI ? 0.22 : 0.0 }); T.driver.p.bounce = jolt(t, [[TI, 0.12]]);
    setCam(shotCam(this, t), t, shakeAt(t, [{ t0: TI, a: 0.35, f: 9 }])); if (T.driver.group.visible) T.driver.draw(camera); strip(-60, -80); rails(); world.placeLight(V(RX, 0, ZI)); } });
}
// 5  10.0-11.0  the driver's face in the crashed car: "Nobody's drunk"
{ SH.push({ id: 's5', keys: [[10.0, [-1.95, 1.36, -1.32], [0.08, 1.2, 0.05], 34, 0], [11.0, [-1.8, 1.36, -1.22], [0.08, 1.2, 0.05], 32, 0]], a: 10.0, b: 11.0, set(t) {
    resetRoad(1); const { car } = crashSetup(t); crashD.night(true);
    crashD.rig.visible = true; const dc = crashD;
    const u = t - 10.0;
    seat(T.driver, dc, { E: emo({ surprise: [[0, 1], [0.35, 0.8], [0.5, 0.2], [1, 0.1]], doubt: [[0, 0], [0.45, 0], [0.55, 0.75], [1, 0.8]], fear: [[0, 0.5], [0.5, 0.2], [1, 0.1]] }, u), life: life(u, [0.5]),
      lookAt: dc.L(-1.8, 1.32, -1.25), hand: { L: { pos: dc.cabin.wheel.localToWorld(dc.cabin.gripLocal(-1)), w: 1 } }, bend: 0.1 + 0.04 * Math.sin(u * 3) });
    T.driver.p.bounce = jolt(u, [[0.0, 0.08], [0.52, 0.06]]);
    setCam(shotCam(this, t, carFrame(dc)), t, shakeAt(t, [{ t0: 10.0, a: 0.01, f: 6 }])); T.driver.draw(camera); strip(-60, -80); rails(); world.placeLight(V(RX, 0, ZI)); void car; } });
}
// 6  11.0-13.2  fly-down to a low angle on the empty road
{ const keys = ([[11.0, [RC + 1.0, 9, -92], [RC, 0, -300], 50, 0], [12.0, [RC + 1.4, 2.4, -108], [RC - 0.1, 0.4, -380], 44, 0.02], [13.2, [RC + 1.2, 0.6, -122], [RC - 0.2, 0.15, -500], 40, 0]]);
  SH.push({ id: 's6', keys, a: 11.0, b: 13.2, set(t) { resetRoad(1); setCam(shotCam(this, t), t); strip(-100, -120); rails(); world.placeLight(V(RC, 0, -130)); } });
}
// 7  12.9-15.45  FADE: rear chase of another car rolling slowly off the edge into the rail
const TI7 = 15.05, Z7 = -440;
const s7 = (t) => { const z = Z7 + 18 * (TI7 - Math.min(t, TI7)) - (t > TI7 ? 2.4 * (1 - Math.exp(-(t - TI7) * 4)) : 0), d = sm(13.1, TI7, t), x = LANE_R + (RX - 1.15 - LANE_R) * Math.pow(d, 1.3); return { x: Math.min(x, RX - 1.2), z, yaw: -0.1 * sm(13.2, 14.6, t) - (t > TI7 ? 0.3 * (1 - Math.exp(-(t - TI7) * 6)) : 0) }; };
{ SH.push({ id: 's7', keys: [[12.9, [-1.5, 1.7, 9.5], [0.6, 0.6, -7], 46, 0], [15.45, [-0.9, 1.2, 7.0], [0.6, 0.6, -7], 42, 0]], a: 12.9, b: 15.45, fade: true, set(t) {
    resetRoad(1); const s = s7(t), pre = t < TI7, car = pre ? drift2 : drift2D; (pre ? drift2D : drift2).rig.visible = false;
    world.rails[1].dents = pre ? [] : [{ z: Z7 - 1.0, len: 2.2, out: 0.5 * (1 - Math.exp(-(t - TI7) * 18)), drop: 0.1, twist: 0.5 }];
    const dd = t - TI7; drive(car, s.x, s.z, s.yaw, 18 * t, -0.05, pre ? 0 : 0.05 * Math.exp(-dd * 4) * Math.sin(dd * 25), pre ? 0 : 0.04 * Math.exp(-dd * 5) * Math.sin(dd * 21)); car.night(true);
    if (pre) { seat(T.driver, drift2, { E: { tired: 1 }, life: { blink: 1 }, bend: 0.22 }); drift2.dust.update((x) => { const q = s7(x); return V(q.x, 0, q.z + 2.6); }, t, { strength: 0.2, night: 1 }); }
    else { burst(car.L(CX + 0.8, 0.5, -2.6), dd); crashDust.update((x) => car.L(CX + 0.6, 0, -2.4), t, { rate: 16, life: 1.4, strength: 0.4, halfW: 0.5, night: 1 }); }
    setCam(shotCam(this, t, offFrame(s.x, s.z)), t, shakeAt(t, [{ t0: TI7, a: 0.25, f: 9 }])); if (pre) T.driver.draw(camera); strip(Z7 + 10, Z7 - 10); rails(); world.placeLight(V(LANE_R, 0, s.z)); } });
}
// 8  15.15-17.8  FADE to day: the state worker hammers the sign's post bracket; the sign shakes at every blow
const HITS = [15.8, 16.5, 17.2];
const signShake = (t) => { let r = 0; for (const h of HITS) { const d = t - h; if (d > 0 && d < 1.2) r += 0.014 * Math.exp(-d * 5) * Math.sin(d * 70); } return r; };
// in the timelapse only the world speeds up: he stands back admiring his sign at normal speed, then the crash knocks him over
function workerAdmire(t) {
  const yaw = SIGN_ROT + Math.PI * 0.85, root = sign.localToWorld(V(-2.6, 0, 1.4)), rt = V(Math.cos(yaw), 0, -Math.sin(yaw)), fw = V(Math.sin(yaw), 0, Math.cos(yaw));
  const fall = sm(TI9 + 0.04, TI9 + 0.45, t), jump = Math.sin(Math.PI * sm(TI9 + 0.02, TI9 + 0.25, t)), br = Math.sin(t * 2.1) * 0.02;
  const r = root.clone().add(V(0, 0.12 * jump - 0.42 * fall, 0)).addScaledVector(fw, -0.25 * fall);
  T.stateman.pose({ root: r, yaw, crouch: 0.05 + 0.75 * fall, bend: br - 0.45 * fall, feet: { L: { pos: root.clone().addScaledVector(rt, -0.13).addScaledVector(fw, 0.35 * fall).add(V(0, 0.02 + 0.18 * fall, 0)), yaw }, R: { pos: root.clone().addScaledVector(rt, 0.13).addScaledVector(fw, 0.5 * fall).add(V(0, 0.02 + 0.3 * fall, 0)), yaw } },
    hand: fall > 0.02 ? { L: { pos: r.clone().add(V(0, 1.9, 0)).addScaledVector(rt, -0.45), w: 1 }, R: { pos: r.clone().add(V(0, 1.95, 0)).addScaledVector(rt, 0.45), w: 1 } } : { L: { pos: root.clone().add(V(0, 0.95, 0)).addScaledVector(rt, -0.22), w: 1 }, R: { pos: root.clone().add(V(0, 0.95, 0)).addScaledVector(rt, 0.22), w: 1 } },
    lookAt: t < TI9 - 0.15 ? sign.localToWorld(V(0, 3.2, 1)) : V(RX - 1.3, 0.8, Z9), face: features(t < TI9 ? { joy: 0.8 } : { surprise: 1, fear: 0.8 }, life(t, [18.3, 18.9, TI9 + 0.03])), sun: sunDir(), t, armsFront: true, bounce: jolt(t, [[TI9 + 0.05, 0.12], [TI9 + 0.45, 0.08]]) });
  T.stateman.group.visible = true; hammer.visible = false;
}
function stateWorker(t, timelapse = 0) {
  const post = sign.localToWorld(V(-1.65, 1.45, 0.05)), yaw = sign.rotation.y + Math.PI / 4, root = sign.localToWorld(V(-2.25, 0, 0.45)), rt = V(Math.cos(yaw), 0, -Math.sin(yaw));
  let ph = 0; for (const h of HITS) { const d = t - h; if (d > -0.45 && d < 0.25) ph = d < 0 ? sm(-0.45, -0.12, d) * (1 - sm(-0.12, 0, d)) : 0; }   // 1 = wound up high, 0 = down on the bracket
  const toCam = camera.position.clone().sub(root).setY(0).normalize();   // keep the hammer arm on the camera side of him
  const hand = post.clone().add(V(0, 0.02, 0)).addScaledVector(rt, 0.1).addScaledVector(toCam, 0.12).lerp(root.clone().add(V(0, 1.95, 0)).addScaledVector(rt, 0.5).addScaledVector(toCam, 0.45), ph);
  const E = timelapse ? { joy: 0.8 } : { effort: 0.3 + 0.5 * ph, joy: 0.2 + 0.3 * (1 - ph) };
  const fy = timelapse ? yaw - 0.6 : yaw;
  T.stateman.pose({ root, yaw: fy, crouch: 0.08 + 0.12 * (1 - ph), bend: 0.05 + 0.2 * (1 - ph) - 0.12 * ph, feet: { L: { pos: root.clone().addScaledVector(rt, -0.13).setY(0.02), yaw: fy }, R: { pos: root.clone().addScaledVector(rt, 0.13).add(V(0.05, 0.02, 0)), yaw: fy } },
    hand: timelapse ? { L: { pos: root.clone().add(V(0, 0.95, 0)).addScaledVector(rt, -0.22), w: 1 }, R: { pos: root.clone().add(V(0, 0.95, 0)).addScaledVector(rt, 0.22), w: 1 } } : { R: { pos: hand, w: 1 }, L: { pos: post.clone().add(V(0, -0.15, 0)), w: 1 } },
    lookAt: timelapse ? sign.localToWorld(V(0, 3.2, 1)) : post, face: features(E, life(t, [15.5, 16.9, 18.2])), sun: sunDir(), t, armsFront: true, bounce: jolt(t, HITS.map((h) => [h, 0.05])) });
  T.stateman.group.visible = true;
  hammer.visible = !timelapse; if (!timelapse) { hammer.position.copy(hand).add(V(0, -0.03, 0)); hammer.rotation.set(0, yaw - Math.PI / 2, 0.35 + 1.4 * ph); }
}
const SIGN_ROT = sign.rotation.y;
{ const L = (x, y, z) => sign.localToWorld(V(x, y, z)).toArray(), keys = ([[15.15, L(-6.5, 0.7, 12.5), L(-0.8, 2.6, 0), 50, 0], [16.3, L(-3.9, 1.0, 3.4), L(-1.9, 1.5, 0.2), 40, 0.02], [17.8, L(-1.2, 2.4, 4.8), L(-1.5, 1.9, 0), 42, -0.01]]);
  SH.push({ id: 's8', keys, a: 15.15, b: 17.8, fade: true, set(t) {
    resetRoad(0.08); world.rails[1].dents = [{ z: -10, len: 2, out: 0.4, drop: 0.1, twist: 0.4 }, { z: -55, len: 2.2, out: 0.5, drop: 0.12, twist: 0.5 }];
    sign.rotation.set(signShake(t) * 0.5, SIGN_ROT, signShake(t)); stateTruck.place(RC + EDGE + 0.9, -8, 0.03); ladder.visible = true; ladder.position.copy(sign.localToWorld(V(1.2, 0, -0.75))); ladder.rotation.set(0.22, SIGN_ROT + Math.PI, 0);
    cones.forEach((c, i) => { c.visible = true; c.position.set(RC + LANE + 0.35, 0, -14 - i * 5); });
    setCam(shotCam(this, t), t, shakeAt(t, HITS.map((h) => ({ t0: h, a: 0.012, f: 8 })))); stateWorker(t); T.stateman.draw(camera); strip(-20, -40); rails(); world.placeLight(V(RX, 0, -30)); } });
}
// 9  17.8-19.55  timelapse day -> night, zooming out; at night a car crashes into the rail beside the sign
const TI9 = 19.05, Z9 = -34;
const s9 = (t) => { const z = Z9 + 25 * (TI9 - Math.min(t, TI9)) - (t > TI9 ? 2.6 * (1 - Math.exp(-(t - TI9) * 4)) : 0), d = sm(18.35, TI9, t); return { x: LANE_R + (RX - 1.3 - LANE_R) * d, z, yaw: -0.2 * sm(18.4, 18.9, t) - (t > TI9 ? 0.3 * (1 - Math.exp(-(t - TI9) * 6)) : 0) }; };
{ const L = (x, y, z) => sign.localToWorld(V(x, y, z)).toArray(), keys = ([[17.8, L(-1.2, 2.4, 4.8), L(-1.5, 1.9, 0), 42, 0], [18.6, [RC + 3.4, 3.0, -12], [RX + 0.4, 1.8, -32], 48, 0], [19.6, [RC + 2.0, 3.6, -2], [RX + 0.6, 1.4, -33], 54, 0]]);
  SH.push({ id: 's9', keys, a: 17.8, b: 19.55, set(t) {
    const k = sm(17.85, 18.95, t) * 0.95; resetRoad(k); sign.rotation.set(0, SIGN_ROT, 0);
    world.rails[1].dents = [{ z: -10, len: 2, out: 0.4, drop: 0.1, twist: 0.4 }, { z: -55, len: 2.2, out: 0.5, drop: 0.12, twist: 0.5 }]; if (t > TI9) world.rails[1].dents.push({ z: Z9 - 0.6, len: 2.4, out: 0.6 * (1 - Math.exp(-(t - TI9) * 18)), drop: 0.14, twist: 0.6 });
    stateTruck.place(RC + EDGE + 0.9, -8, 0.03); ladder.visible = true; ladder.position.copy(sign.localToWorld(V(1.2, 0, -0.75))); ladder.rotation.set(0.22, SIGN_ROT + Math.PI, 0); cones.forEach((c, i) => { c.visible = true; c.position.set(RC + LANE + 0.35, 0, -14 - i * 5); });
    if (t > 18.3) { const s = s9(t), pre = t < TI9, car = pre ? signCrash : signD; drive(car, s.x, s.z, s.yaw, 25 * t, -0.1); car.night(true); if (!pre) { const dd = t - TI9; car.place(s.x, s.z, s.yaw, 0.05 * Math.exp(-dd * 4) * Math.sin(dd * 25), 0.04 * Math.exp(-dd * 5) * Math.sin(dd * 21)); burst(car.L(CX + 0.8, 0.5, -2.6), dd); crashDust.update((x) => car.L(CX + 0.6, 0, -2.4), t, { rate: 16, life: 1.4, strength: 0.35, halfW: 0.5, night: 0.7 }); } else car.dust.update((x) => { const q = s9(x); return V(q.x, 0, q.z + 2.6); }, t, { strength: 0.2, night: 0.6 }); }
    // traffic racing through the timelapse
    for (const [c, z0, dir] of [[passA, -200, 1], [night2, 120, -1]]) { const z = z0 + dir * 300 * cl((t - 17.85) / 0.9); if (t > 17.85 && t < 18.75) { drive(c, dir > 0 ? RC - LANE / 2 : LANE_R, z, dir > 0 ? Math.PI : 0, 300 * t); c.night(k > 0.5); } }
    setCam(shotCam(this, t), t, shakeAt(t, [{ t0: TI9, a: 0.12, f: 9 }])); workerAdmire(t); T.stateman.draw(camera); strip(-20, -40); rails(); world.placeLight(V(RX, 0, -30)); } });
}
// 10  19.3-23.65  FADE: the guardrail company man grins by his loaded pickup, then the camera cranes up over all the dented rails
const DENTS10 = [-6, -38, -61, -95, -130, -170, -215, -260].map((z, i) => ({ z, len: 1.8 + (i % 3) * 0.3, out: 0.35 + (i % 4) * 0.08, drop: 0.1, twist: 0.5 }));
{ const keys = ([[19.3, [RX - 4.3, 1.55, 10.8], [RX - 2.0, 1.0, 3.4], 44, 0], [20.6, [RX - 4.4, 1.5, 8.8], [RX - 2.5, 1.2, 3.8], 40, 0.02], [21.9, [RX - 3.5, 4.2, 9.5], [RX - 1.0, 0.5, -18], 46, -0.01], [23.65, [RX - 3.8, 7.4, 6.5], [RX - 0.5, 0.3, -60], 50, 0]]);
  SH.push({ id: 's10', keys, a: 19.3, b: 23.65, fade: true, set(t) {
    resetRoad(0.05); world.rails[1].dents = DENTS10.map((d) => ({ ...d })); railTruck.place(RX - 1.75, 2, 0.02); railTruck.body.update(0, 0, 0, 1, 0);
    const b = railTruck.L(CX + 0.75, 0, railTruck.body.bed.z1 + 0.6), root = V(b.x - 2.35, 0, b.z - 0.2), yaw = -0.75, rt = V(Math.cos(yaw), 0, -Math.sin(yaw));
    const pat = t < 20.6 ? Math.abs(Math.sin((t - 19.5) * Math.PI * 2.2)) * sm(19.45, 19.6, t) : 0, thumb = sm(20.65, 20.95, t) * (1 - sm(21.6, 21.8, t)), wave = sm(21.8, 22.0, t);
    const bedHand = railTruck.L(CX - 1.04, 0.98 + 0.12 * pat, railTruck.body.bed.z1 - 0.3);
    const rHand = bedHand.clone().lerp(root.clone().add(V(0, 1.75, 0)).addScaledVector(rt, 0.42), thumb).lerp(root.clone().add(V(0, 2.0 + 0.08 * Math.sin(t * 14), 0)).addScaledVector(rt, 0.5 + 0.12 * Math.sin(t * 9)), wave);
    T.railman.pose({ root, yaw, crouch: 0.06 + 0.04 * Math.sin(t * 7), bend: 0.06, feet: { L: { pos: root.clone().addScaledVector(rt, -0.12).setY(0.02), yaw }, R: { pos: root.clone().addScaledVector(rt, 0.12).setY(0.02), yaw } },
      hand: { R: { pos: rHand, w: 1 }, L: { pos: root.clone().add(V(0, 0.95, 0)).addScaledVector(rt, -0.2), w: 0.8 } }, lookAt: camera.position.clone(), face: features({ joy: 1, surprise: 0.2 * thumb }, life(t, [20.2, 21.3, 22.7])), sun: sunDir(), t, armsFront: true, bounce: jolt(t, [[20.65, 0.07], [21.8, 0.05]]) + 0.015 * pat });
    T.railman.group.visible = true; world.rails[1].dents.forEach((d) => (d.out += 0));
    setCam(shotCam(this, t), t); T.railman.pose({ ...T.railman.p, lookAt: camera.position.clone() }); T.railman.draw(camera); strip(0, -10); rails(); world.placeLight(V(RX, 0, -10)); } });
}
// 11  23.45-25.5  FADE, same angle on the dented rails: the pickup rolls in and parks, the door opens, he hops out
// already holding the saw and lifts it; the blade glints on "machine"
const PARK = 24.3, ZP = -14, GLINT = 24.85;
function heroHoldSaw(root, yaw, lift, scale = 1) {   // saw held in front at hip height (lift 0) up to chest height (lift 1), nose toward the road
  const f = V(Math.sin(yaw), 0, Math.cos(yaw)), r = V(Math.cos(yaw), 0, -Math.sin(yaw));
  saw.group.visible = true; saw.group.scale.setScalar(Math.min(1, 0.4 + scale * 0.6));
  saw.group.position.copy(root).addScaledVector(f, 0.42 * scale).addScaledVector(r, 0.1).add(V(0, (0.5 + 0.35 * lift) * scale, 0));
  saw.group.rotation.set(-0.12 - 0.15 * lift, yaw, 0, 'YXZ'); saw.update({ bladeAngle: 0, trigger: 0, interlock: 0 }); saw.group.updateMatrixWorld(true);
  return { rear: saw.group.localToWorld(saw.grips.rear.position.clone()), front: saw.group.localToWorld(saw.grips.front.position.clone()) };
}
{ const keys = ([[23.45, [RX - 3.8, 7.4, 6.5], [RX - 1.5, 0.4, -22], 50, 0], [24.5, [RX - 6.0, 2.2, -7.0], [RC + EDGE + 1 - 1.4, 0.9, ZP - 0.6], 44, 0], [25.5, [RC + EDGE + 1 - 4.1, 1.4, ZP + 2.6], [RC + EDGE + 1 - 1.45, 0.95, ZP - 0.7], 42, 0]]);
  SH.push({ id: 's11', keep: true, keys, a: 23.45, b: 25.5, fade: true, set(t) {
    resetRoad(0.05); world.rails[1].dents = DENTS10.map((d) => ({ ...d })); saw.group.scale.setScalar(1);
    const dz = Math.max(0, PARK - t), z = ZP + 7 * dz * dz + 4 * dz, x = RC + EDGE + 1.0 - 0.4 * sm(0, 0.8, dz); heroTruck.place(x, z, 0.02 + 0.03 * Math.sin(dz * 3)); heroTruck.body.update(-z, 0, { FL: sm(24.35, 24.6, t) }, 0, 0);
    heroTruck.dust.update((q) => { const d2 = Math.max(0, PARK - q); return V(x, 0, ZP + 7 * d2 * d2 + 4 * d2 + 2.6); }, t, { strength: 0.3 });
    if (t > 24.4) {
      const out = sm(24.45, 24.85, t), yaw = heroTruck.rig.rotation.y - Math.PI / 2 - 0.35 - 0.25 * sm(24.9, 25.3, t), inRoot = heroTruck.L(-0.35, 0.3, -0.25), outRoot = heroTruck.L(CX - 1.5, 0, -0.45), root = inRoot.clone().lerp(outRoot, out); root.y += Math.sin(Math.PI * out) * 0.18;
      const sc = 0.8 + 0.2 * out, lift = sm(24.75, 25.0, t), g = heroHoldSaw(root, yaw, lift, sc);
      T.hero.pose({ scale: sc, root, yaw, crouch: 0.55 - 0.45 * out + 0.15 * sm(24.8, 24.9, t) * (1 - sm(24.9, 25.05, t)), bend: 0.2 - 0.12 * lift, feet: { L: { pos: heroTruck.L(CX - 0.98, 0.52, -0.42).lerp(root.clone().add(V(0, 0.02, 0)).addScaledVector(V(Math.cos(yaw), 0, -Math.sin(yaw)), -0.12), sm(24.6, 24.85, t)), yaw }, R: { pos: heroTruck.L(CX - 1.25, 0.3, -0.3).lerp(root.clone().add(V(0, 0.02, 0)).addScaledVector(V(Math.cos(yaw), 0, -Math.sin(yaw)), 0.12), sm(24.55, 24.8, t)), yaw } },
        hand: { L: { pos: g.front, w: 1 }, R: { pos: g.rear, w: 1 } }, lookAt: t < 24.9 ? heroTruck.L(CX - 4, 0.6, -2) : camera.position.clone(), face: features({ joy: 0.4 + 0.5 * lift }, life(t, [24.6, 25.35])), sun: sunDir(), t, armsFront: true, bounce: jolt(t, [[24.85, 0.08], [25.0, 0.05]]) });
      T.hero.group.visible = true;
      glint.visible = t > GLINT - 0.05 && t < GLINT + 0.6; if (glint.visible) { const gg = Math.sin(Math.PI * sm(GLINT - 0.05, GLINT + 0.6, t)); glint.position.copy(saw.group.localToWorld(saw.contactLocal(0.28))).add(V(0, 0.08, 0)); glint.scale.set(0.35 * gg, 0.35 * gg, 1); glint.material.rotation = t * 0.8; }
    }
    setCam(shotCam(this, t), t); if (T.hero.group.visible) T.hero.draw(camera); strip(ZP, ZP - 10); rails(); world.placeLight(V(RX, 0, ZP)); } });
}
// 12  25.5-27.32  cut on "grinding": he's kneeling at the edge, cutting, sparks and dust
const K12 = Math.floor(-24.95 / GSTEP);
{ const keys = ([[25.5, [GX - 2.7, 0.9, -21.8], [GX + 0.6, 0.45, -25.0], 42, 0], [27.32, [GX - 2.1, 0.75, -22.6], [GX + 0.6, 0.42, -25.3], 40, 0]]);
  SH.push({ id: 's12', keys, a: 25.5, b: 27.32, set(t) {
    resetRoad(0.05); world.rails[1].dents = DENTS10.map((d) => ({ ...d })); heroTruck.place(RC + EDGE + 1.0, ZP, 0.02); heroTruck.body.update(0, 0, { FL: 1 }, 0, 0);
    const h = heroCut(t - 25.5 + 0.2, K12, 2.0, {}, -20);
    setCam(shotCam(this, t), t); T.hero.draw(camera); sparks.update(h.hit, V(0.25, 0, -1).normalize(), t, camera, h.cutting ? 1 : 0);
    sawDust.update((x) => h.hit.clone().add(V(0.25 * (t - x), 0, 0.5 * (t - x))), t, { rate: 9, life: 1.3, strength: h.cutting ? 0.045 : 0.02, halfW: 0.04 });
    strip(h.hz + 6, h.hz - 4); rails(); world.placeLight(V(GX, 0, h.hz)); } });
}
// 13  27.32-28.84  timelapse "mile after mile": grooves race down the road behind him; the truck stays parked where he left it
{ SH.push({ id: 's13', keys: [[27.32, [GX + 6.5, 7.5, 22], [GX - 1, 0, -18], 48, 0], [28.84, [GX + 6.2, 7.2, 20], [GX - 1, 0, -18], 48, 0]], a: 27.32, b: 28.84, set(t) {
    const u = (t - 27.32) / 1.52; resetRoad(0.05 + 0.25 * u); world.rails[1].dents = DENTS10.map((d) => ({ ...d }));
    const k0 = K12 - 3, kNow = k0 - Math.floor(u * 420); world.cutGrooves(-20, grooveZ(kNow + 1) + 0.01); world.grooves.forEach((g) => (g.fresh = g.z < grooveZ(kNow) + 6 ? 1 : 0.3));
    const h = heroCut((t * 7) % 2.0 < 1.3 ? (t * 7) % 2.0 : 1.2, kNow, 2.0, {}, null); heroTruck.place(RC + EDGE + 1.0, ZP, 0.02); heroTruck.body.update(0, 0, { FL: 1 }, 0, 0);
    for (const [c, ph, dir] of [[passA, 0, -1], [passB, 0.37, 1], [night2, 0.71, -1]]) { const q = ((u * 3 + ph) % 1), z = grooveZ(kNow) + (dir < 0 ? 140 - 280 * q : -140 + 280 * q), x = dir < 0 ? LANE_R : RC - LANE / 2; drive(c, x, z, dir < 0 ? 0 : Math.PI, z); c.dust.update((s2) => V(x, 0, z - dir * 2.6 + dir * 40 * (t - s2)), t, { strength: 0.4 }); }
    const hzN = grooveZ(kNow);
    setCam(shotCam(this, t, offFrame(0, hzN)), t); T.hero.draw(camera); sparks.update(h.hit, V(0.25, 0, -1).normalize(), t, camera, 1); strip(hzN + 6, hzN - 4); rails(); world.placeLight(V(GX, 0, hzN)); } });
}
// 14  28.84-31.25  creative angle: skimming low along the ruined edge
{ SH.push({ id: 's14', keys: [[28.84, [GX + 0.75, 0.42, 2.4], [GX - 0.1, 0.0, -6], 48, 0], [31.25, [GX + 0.5, 0.32, -2.2], [GX - 0.1, 0.0, -11], 48, 0]], a: 28.84, b: 31.25, set(t) {
    const u = (t - 28.84) / 2.41; resetRoad(0.18); world.cutGrooves(60, -300); world.grooves.forEach((g, i) => (g.fresh = (i % 7) / 12));
    sawDust.update((x) => V(GX + 0.2, 0, -4 - 22 * (t - x)), t, { rate: 8, life: 2.2, strength: 0.12, halfW: 0.3 });
    setCam(shotCam(this, t), t); strip(4 - 5.5 * u, -9 - 5.5 * u); rails(); world.placeLight(V(GX, 0, -5)); } });
}
// 15  31.0-34.95  FADE to town: the inspector in his parked car, seen through the side window
const TOWNZ = 8, TOWNX = ROADW() - 1.2;
function ROADW() { return 5.6; }
{ SH.push({ id: 's15', keys: [[31.0, [CX - 2.9, 1.42, -2.4], [0.12, 1.15, 0.15], 42, 0.0], [33.0, [CX - 2.35, 1.48, -1.4], [0.12, 1.18, 0.2], 38, 0.02], [34.95, [CX - 2.1, 1.5, -0.6], [0.1, 1.18, 0.2], 36, 0]], a: 31.0, b: 34.95, fade: true, scene: 'town', set(t) {
    resetRoad(0); for (const c of town.cars) c.car.group.visible = !(c.s > 0 && Math.abs(c.z - TOWNZ) < 4);
    townScene.add(inspCar.rig); inspCar.place(TOWNX, TOWNZ, 0); inspCar.night(false); inspCar.body.update(0, 0, 0, 0, 0); thermos.visible = true; spillG.visible = false;
    townScene.add(T.inspector.group); const u = t - 31.0, glasses = sm(32.9, 33.15, t) * (1 - sm(33.45, 33.7, t));
    const head = inspCar.L(0.08, 1.2, 0.0), grip = (sd) => inspCar.cabin.wheel.localToWorld(inspCar.cabin.gripLocal(sd));
    seat(T.inspector, inspCar, { E: emo({ doubt: [[0, 0.45], [1.1, 0.5], [1.4, 0.8], [3.9, 0.85]], joy: [[0, 0.05], [2.4, 0.05], [2.7, 0.3], [3.9, 0.25]], anger: [[0, 0], [1.2, 0.1], [3.9, 0.1]] }, u), life: life(t, [31.8, 32.95, 34.3]),
      turn: 0.25 + 0.3 * sm(31.6, 32.1, t), lookAt: t < 31.8 ? inspCar.L(0.3, 1.2, -6) : camera.position.clone(), sun: town.sunDir,
      hand: { R: { pos: grip(1), w: 1 }, L: { pos: grip(-1).lerp(head.clone().add(V(0.0, 0.08, -0.12)), glasses), w: 1 } } });
    T.inspector.p.bounce = jolt(t, [[32.0, 0.05], [33.1, 0.04]]);
    setCam(shotCam(this, t, carFrame(inspCar)), t); T.inspector.draw(camera); town.placeLight(V(TOWNX, 0, TOWNZ)); } });
}
// 16  34.7-36.3  FADE: the same side-window angle at 3 am, driving
const SPEED = 24, carZ = (t) => -400 - SPEED * (t - 34.7);
{ SH.push({ id: 's16', keys: [[34.7, [CX - 2.1, 1.5, -0.6], [0.1, 1.18, 0.2], 36, 0], [36.3, [CX - 2.4, 1.5, -1.2], [0.1, 1.18, 0.2], 39, 0]], a: 34.7, b: 36.3, fade: true, set(t) {
    resetRoad(1); const z = carZ(t); inspCar.place(LANE_R, z, 0.004 * Math.sin(t * 1.7)); inspCar.body.update(SPEED * t, 0.01 * Math.sin(t)); inspCar.night(true); thermos.visible = true; spillG.visible = false;
    const yawn = sm(35.3, 35.55, t) * (1 - sm(35.95, 36.2, t));
    seat(T.inspector, inspCar, { E: { tired: 0.5 + 0.3 * yawn, surprise: 0.7 * yawn }, life: life(t, [35.1], yawn * 0.9), sun: MOON_DIR, bend: 0.14 - 0.08 * yawn }); T.inspector.p.bounce = 0.01 * Math.sin(t * 5);
    inspCar.dust.update((x) => V(LANE_R, 0, carZ(x) + 2.6), t, { strength: 0.12, night: 1 });
    setCam(shotCam(this, t, carFrame(inspCar)), t); T.inspector.draw(camera); strip(z + 10, z - 10); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// POV camera inside the inspector's car: look direction (yaw right +, pitch), slight sway
// the POV hands show only while the camera looks roughly ahead from the driver's seat
function lookingAhead() { const f = V(0, 0, -1).applyQuaternion(camera.quaternion), a = inspCar.L(0, 0, -1).sub(inspCar.L(0, 0, 0)); return f.dot(a) > 0.82 && camera.position.distanceTo(inspCar.L(EYE.x, EYE.y, EYE.z)) < 0.25; }
function pov(t, yawR = 0, pitch = 0, fov = 66, sh = null) {
  const e = EYE.clone(), d = V(Math.sin(yawR), Math.sin(PITCH + pitch), -Math.cos(yawR)), c = { p: e, q: e.clone().addScaledVector(d, 10), fov, roll: 0 };
  setCam(inCar(inspCar, c), t, sh, 0.15);
}
// 17  36.3-38.7  POV: he glances right at the thermos on the leather seat, then back to the road
{ SH.push({ id: 's17', pov: true, keys: [[36.3, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0], [38.7, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0]], a: 36.3, b: 38.7, set(t) {
    resetRoad(1); const z = carZ(t); inspCar.place(LANE_R, z, 0.004 * Math.sin(t * 1.7)); inspCar.body.update(SPEED * t); inspCar.cabin.update(t, 52, 2.4, 0.03 * Math.sin(t)); inspCar.night(true); thermos.visible = true;
    const look = sm(36.8, 37.4, t) * (1 - sm(37.95, 38.55, t)); if (CAMS[this.id]) setCam(shotCam(this, t, carFrame(inspCar)), t); else pov(t, 1.45 * look, -0.6 * look, 66 - 8 * look); this.F = carFrame(inspCar); drawArms(inspCar, lookingAhead()); strip(z + 10, z - 10); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// 18-19  38.7-42.8  outside: the car drifts to the edge; then it hits the strips and the whole car shakes; he jolts awake
const ZS = -720, TS = 40.6;
const s18 = (t) => { const z = ZS + SPEED * (TS - t), d = sm(38.7, TS, t); return { x: LANE_R + (GX - 0.87 - LANE_R) * d, z, yaw: -0.05 * sm(38.8, 39.8, t) * (1 - sm(40.3, 40.9, t)) }; };
{ const keys18 = [[38.7, [4.45, 0.85, -13], [0, 0.7, 0], 42, 0], [40.65, [3.9, 0.7, -9.0], [0, 0.7, -0.4], 40, 0]], keys19 = [[40.65, [3.45, 0.55, -6.6], [0.4, 0.6, 0.3], 44, 0], [42.8, [3.2, 0.7, -5.6], [0.3, 0.8, 0.4], 42, 0]];
  for (const [id, a, b, keys] of [['s18', 38.7, 40.65, keys18], ['s19', 40.65, 42.8, keys19]]) SH.push({ id, keys, a, b, set(t) {
    resetRoad(1); world.cutGrooves(ZS + 60, ZS - 120); const s = s18(t), on = t > TS, rb = on ? rumble(t, 0.012) : null;
    inspCar.place(s.x, s.z, s.yaw, on ? rb.r * 1.2 : 0, on ? 0.006 * Math.sin(t * 77) : 0); inspCar.body.update(SPEED * t, -0.03); inspCar.night(true); thermos.visible = true; thermos.position.x = 0.69 + (on ? 0.004 * Math.sin(t * 90) : 0);
    const wake = sm(TS + 0.05, TS + 0.25, t);
    seat(T.inspector, inspCar, { E: wake > 0 ? { surprise: wake, fear: 0.6 * wake, tired: 1 - wake } : { tired: 1 }, life: { blink: wake > 0.5 ? 0 : 1 }, bend: 0.22 - 0.3 * wake }); T.inspector.p.bounce = on ? 0.02 * Math.sin(t * 60) + jolt(t, [[TS + 0.1, 0.12]]) : 0;
    inspCar.dust.update((x) => { const q = s18(x); return V(q.x, 0, q.z + 2.6); }, t, { strength: 0.15, night: 1 });
    if (on) sawDust.update((x) => { const q = s18(x); return V(GX, 0, q.z + 1.5); }, t, { rate: 18, life: 1.1, strength: 0.35, halfW: 0.1, night: 0.6 });
    setCam(shotCam(this, t, offFrame(s.x, s.z)), t, on ? rumble(t, 0.02) : null); T.inspector.draw(camera); strip(s.z + 8, s.z - 8); rails(); world.placeLight(V(LANE_R, 0, s.z)); } });
}
// 20  42.8-44.6  POV: still shaking, he yanks the wheel back to the lane
{ SH.push({ id: 's20', pov: true, keys: [[42.8, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0], [44.6, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0]], a: 42.8, b: 44.6, set(t) {
    resetRoad(1); world.cutGrooves(ZS + 60, ZS - 160); const yank = sm(43.1, 43.35, t) - 0.7 * sm(43.7, 44.3, t), z = ZS + SPEED * (TS - t), on = t < 43.45;
    const x = GX - 0.87 - 1.6 * sm(43.2, 44.4, t), yaw = 0.16 * sm(43.2, 43.6, t) * (1 - sm(43.9, 44.5, t)); inspCar.place(x, z, yaw, on ? 0.012 * Math.sin(t * 97) : 0.02 * Math.sin((t - 43.3) * 8) * Math.exp(-(t - 43.3) * 3), 0);
    inspCar.body.update(SPEED * t, 0.3 * yank); inspCar.cabin.update(t, 52, 2.6, 1.3 * yank); inspCar.night(true); thermos.visible = true; thermos.rotation.z = -0.5 * sm(43.2, 43.5, t);
    const sh20 = on ? rumble(t, 0.025) : shakeAt(t, [{ t0: 43.3, a: 0.03, f: 5 }]); if (CAMS[this.id]) setCam(shotCam(this, t, carFrame(inspCar)), t, sh20); else pov(t, -0.08 * yank, 0, 66, sh20); this.F = carFrame(inspCar); drawArms(inspCar, lookingAhead()); strip(z + 8, z - 8); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// 21  44.6-48.15  the thermos flies off the seat, coffee everywhere; "So, why do they work?" (no transition)
{ const spl = spillG.children.filter((c) => c.children && c.children.length > 20)[0];
  const drops = spl ? spl.children.map((m, i) => ({ m, v: V((hash(i) - 0.5) * 1.2 - 0.8, 0.5 + hash(i + 2) * 1.4, (hash(i + 4) - 0.5) * 1.0) })) : [];
  SH.push({ id: 's21', keys: [[44.6, [1.02, 1.56, -0.8], [0.42, 0.82, 0.1], 60, 0], [48.15, [1.0, 1.58, -0.8], [0.3, 0.95, 0.1], 60, 0]], a: 44.6, b: 48.15, set(t) {
    resetRoad(1); const z = ZS - 120 - SPEED * (t - 44.6); inspCar.place(LANE_R + 0.4, z, 0.06 * Math.exp(-(t - 44.6) * 2) * Math.sin((t - 44.6) * 6), 0.015 * Math.exp(-(t - 44.6) * 3) * Math.sin((t - 44.6) * 9), 0); inspCar.body.update(SPEED * t, 0.1); inspCar.cabin.update(t, 50, 2.4, 0.4 * Math.exp(-(t - 44.6) * 2)); inspCar.night(true);
    const tip = sm(44.6, 44.95, t), u = t - 44.7; thermos.visible = tip < 1; spillG.visible = t > 44.95;
    thermos.position.set(0.69 + 0.08 * tip, 0.6 + 0.05 * tip, 0.06 + 0.05 * tip); thermos.rotation.set(-0.06, 0.4, -1.5 * tip * tip);
    spillG.children.forEach((c) => { if (c === spl) return; if (c.isGroup && c.userData.cup) return; c.scale.setScalar(0.2 + 0.8 * sm(44.95, 45.8, t)); });
    drops.forEach(({ m, v }, i) => { const d = Math.max(0, u - hash(i + 7) * 0.25); m.visible = u > 0 && d < 1.2; m.position.set(0.0 + v.x * d * 0.5, 0.0 + v.y * d - 4.9 * d * d * 0.5, v.z * d * 0.5); if (m.position.y < -0.2) m.visible = false; });
    seat(T.inspector, inspCar, { E: emo({ surprise: [[44.6, 0.3], [44.8, 1], [45.6, 0.8], [46.3, 0.1], [48.2, 0]], fear: [[44.6, 0.2], [44.9, 0.7], [45.8, 0.4], [46.3, 0], [48.2, 0]], doubt: [[46.2, 0], [46.5, 0.8], [48.2, 0.8]], anger: [[46.0, 0], [46.6, 0.25], [48.2, 0.2]] }, t), life: life(t, [46.35, 47.6]),
      lookAt: t < 46.3 ? inspCar.L(0.7, 0.62, 0.15) : camera.position.clone(), turn: -0.3 + 0.3 * sm(46.2, 46.6, t) }); T.inspector.p.bounce = jolt(t, [[44.8, 0.1], [46.35, 0.05]]);
    tailOff(inspCar); setCam(shotCam(this, t, carFrame(inspCar)), t, shakeAt(t, [{ t0: 44.62, a: 0.02, f: 6 }])); T.inspector.draw(camera); strip(z + 8, z - 8); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// 22  47.9-50.0  FADE: night close-up of the ruined edge, the inspector's car driving away into the distance
{ SH.push({ id: 's22', keys: [[47.9, [GX + 0.45, 0.17, -952], [GX - 0.3, 0.2, -1040], 46, 0], [50.0, [GX + 0.45, 0.22, -954.2], [GX - 0.3, 0.2, -1040], 42, 0]], a: 47.9, b: 50.0, fade: true, set(t) {
    resetRoad(1); world.cutGrooves(-900, -1300); const u = (t - 47.9) / 2.1, z = -958 - 14 * u - 20 * (t - 47.9); inspCar.place(LANE_R, z - 18, 0); inspCar.body.update(SPEED * t); inspCar.night(true);
    setCam(shotCam(this, t), t); strip(-955 - 2 * u, -975); rails(); world.placeLight(V(GX, 0, -960)); } });
}
// 23  49.85-52.55  through the windshield: the inspector asleep at the wheel, nodding
{ SH.push({ id: 's23', keys: [[49.85, [CX - 0.2, 1.95, -3.0], [0.08, 1.15, 0.1], 38, 0], [52.55, [CX - 0.2, 1.85, -2.6], [0.08, 1.15, 0.1], 35, 0]], a: 49.85, b: 52.55, set(t) {
    resetRoad(1); const z = -1100 - SPEED * (t - 49.85); inspCar.place(LANE_R + 0.2, z, -0.01); inspCar.body.update(SPEED * t); inspCar.night(true); tailOff(inspCar);
    const nod = 0.1 * Math.max(0, Math.sin((t - 49.85) * 2.2)) + 0.12 * sm(49.85, 51.5, t);
    seat(T.inspector, inspCar, { E: { tired: 1 }, life: { blink: 1 }, bend: 0.14 + nod, lookAt: inspCar.L(0.3, 0.4, -2) }); T.inspector.p.bounce = 0.02 * Math.sin((t - 49.85) * 2.2);
    setCam(shotCam(this, t, carFrame(inspCar)), t); T.inspector.draw(camera); strip(z + 8, z - 8); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// 24  52.5-54.2  FADE to POV: the giant sign coming up on the right, a slow zoom; it does nothing
{ SH.push({ id: 's24', pov: true, keys: [[52.5, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0], [54.2, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0]], a: 52.5, b: 54.2, fade: true, set(t) {
    resetRoad(1); world.rails[1].dents = [{ z: -34, len: 2.4, out: 0.6, drop: 0.14, twist: 0.6 }]; const z = 40 - SPEED * (t - 52.5); inspCar.place(LANE_R, z, 0); inspCar.body.update(SPEED * t); inspCar.cabin.update(t, 52, 2.4, 0.02); inspCar.night(true);
    const s = sign.position, e = inspCar.L(EYE.x, EYE.y, EYE.z), d = s.clone().add(V(0, 3.4, 0)).sub(e).normalize(), yawR = Math.atan2(d.x, -d.z) * 0.55, u = (t - 52.5) / 1.7;
    if (CAMS[this.id]) setCam(shotCam(this, t, carFrame(inspCar)), t); else pov(t, yawR, 0.06 * u, 60 - 18 * u); this.F = carFrame(inspCar); drawArms(inspCar, lookingAhead()); strip(z + 8, z - 8); rails(); world.placeLight(V(RX, 0, z)); } });
}
// 25  54.15-56.6  POV: the hands ease the wheel right, onto the strips: the whole car shakes
{ SH.push({ id: 's25', pov: true, keys: [[54.15, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0], [56.6, [0.08, 1.25, 0.12], [0.08, 0.17, -9.9], 66, 0]], a: 54.15, b: 56.6, set(t) {
    resetRoad(1); world.cutGrooves(-1200, -1400); const z = -1240 - SPEED * (t - 54.15), on = t > 55.0, x = LANE_R + (GX - 0.95 - LANE_R) * sm(54.3, 55.0, t);
    inspCar.place(x, z, -0.05 * sm(54.3, 54.7, t) * (1 - sm(54.8, 55.2, t)), on ? 0.014 * Math.sin(t * 97) : 0, on ? 0.007 * Math.sin(t * 79) : 0); inspCar.body.update(SPEED * t, -0.06 * sm(54.3, 54.6, t)); inspCar.cabin.update(t, 52, 2.4, -0.25 * sm(54.3, 54.6, t) * (1 - sm(54.9, 55.3, t)) + (on ? 0.03 * Math.sin(t * 60) : 0)); inspCar.night(true);
    if (CAMS[this.id]) setCam(shotCam(this, t, carFrame(inspCar)), t, on ? rumble(t, 0.03) : null); else pov(t, 0.25 * sm(54.3, 55.0, t), 0, 66, on ? rumble(t, 0.03) : null); this.F = carFrame(inspCar); drawArms(inspCar, lookingAhead()); strip(z + 8, z - 8); rails(); world.placeLight(V(LANE_R, 0, z)); } });
}
// ---------------------------------------------------------------- frame
async function stage(s, t) {
  if (s.scene !== 'town') { scene.add(inspCar.rig); for (const c of town.cars) c.car.group.visible = true; }
  for (const c of [crashD, signD, drift2D, drift2, night2]) c.rig.visible = false;
  sign.rotation.set(0, SIGN_ROT, 0); saw.group.scale.setScalar(1); thermos.position.set(0.69, 0.6, 0.06); thermos.rotation.set(-0.06, 0.4, 0); armCard.visible = false;
  s.set(t); sign.visible = t >= 15.0; if (world.grass.userData.time) world.grass.userData.time.value = t; if (world.wheat.userData.time) world.wheat.userData.time.value = t;
  await renderer.renderAsync(s.scene === 'town' ? townScene : scene, camera);
}
window.renderFrame = async (f) => {
  const t = Math.min(f / FPS, DUR - 0.001), on = SH.filter((q) => t >= q.a && t < q.b); ui.clearRect(0, 0, W, H);
  if (on.length > 1 && on[1].fade) { await stage(on[0], t); sg.clearRect(0, 0, W, H); sg.drawImage(glc, 0, 0, W, H); await new Promise((r) => requestAnimationFrame(r)); const u = cl((t - on[1].a) / (on[0].b - on[1].a)); await stage(on[1], t); ui.globalAlpha = 1 - u * u * (3 - 2 * u); ui.drawImage(snap, 0, 0); ui.globalAlpha = 1; }
  else await stage(on[on.length - 1] || SH[SH.length - 1], t);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.SCENE = { fps: FPS, frames: FRAMES, width: W, height: H };
window.SHOTS = SH.map((s) => [s.a, s.b, !!s.fade, s.scene || 'road']);
window.ANIM = { SH, stage, CAMS, keysOf, calm, camera, renderer, FPS, DUR, ui };
await window.renderFrame(0); window.ready = true;
