// 5 s test: the RefFolk check-suit man creeps over, squats, picks up an iron bomb, stands and shakes it. three.js r186 WebGPU.
// window.renderFrame(f) is a pure function of the frame (30 fps, 150 frames).
import * as THREE from 'three/webgpu';
import { Toon2D, skeleton } from './toon2d.js';
import { features } from './face2d.js';
import { makeBomb } from './bomb.js';
import { Tree } from './tree.js';
const W = 1080, H = 1920, FPS = 30;
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(renderer.domElement); await renderer.init();
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#cfdbe6', 25, 110);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// ---------------------------------------------------------------- sun: strong warm key from camera-right, high; blue sky fill
const SUN = new THREE.Vector3(0.45, 0.85, 0.28).normalize();
const sun = new THREE.DirectionalLight('#fff0d6', 3.6); sun.position.copy(SUN).multiplyScalar(14); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight('#a8c8f0', '#9a7a52', 1.1));
// ---------------------------------------------------------------- sky dome + clouds; the same sky as an environment map for reflections
const skyCol = (y) => new THREE.Color('#f4ead8').lerp(new THREE.Color('#4a86d4'), Math.pow(Math.max(0, y), 0.3));
{ const g = new THREE.SphereGeometry(300, 48, 24), p = g.attributes.position, c = [];
  for (let i = 0; i < p.count; i++) { const k = skyCol(p.getY(i) / 300); c.push(k.r, k.g, k.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }))); }
{ const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'), r = rnd(5);
  for (let i = 0; i < 26; i++) { const cx = 90 + r() * 330, cy = 150 - r() * 60 + Math.abs(cx - 256) * 0.15, rr = 30 + r() * 45; const gr = x.createRadialGradient(cx, cy - rr * 0.3, rr * 0.1, cx, cy, rr); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(236,240,248,0.75)'); gr.addColorStop(1, 'rgba(200,214,236,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const r2 = rnd(11);
  for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false })); const a = -Math.PI / 2 + (r2() - 0.5) * 2.2; s.position.set(Math.cos(a) * 200, 40 + r2() * 40, Math.sin(a) * 200); s.scale.set(50 + r2() * 30, 24 + r2() * 12, 1); scene.add(s); } }
{ const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const x = cv.getContext('2d');
  for (let j = 0; j < 512; j++) { const el = (0.5 - j / 512) * Math.PI; const c = el > 0 ? skyCol(Math.sin(el)) : new THREE.Color('#8a6a48').lerp(new THREE.Color('#5a4630'), Math.min(1, -el * 2)); x.fillStyle = '#' + c.getHexString(); x.fillRect(0, j, 1024, 1); }
  const az = Math.atan2(SUN.x, -SUN.z), u = ((az / (Math.PI * 2)) + 0.5) * 1024, v = (0.5 - Math.asin(SUN.y) / Math.PI) * 512;
  const gr = x.createRadialGradient(u, v, 2, u, v, 60); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = gr; x.fillRect(u - 60, v - 60, 120, 120);
  const env = new THREE.CanvasTexture(cv); env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace; scene.environment = env; scene.environmentIntensity = 0.9; }
// ---------------------------------------------------------------- ground: sunlit packed dirt, grass beyond
const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#c4986a'; x.fillRect(0, 0, 512, 512); const r = rnd(3);
  for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = v < 0.5 ? `rgba(130,92,56,${0.25 * r()})` : `rgba(232,196,146,${0.25 * r()})`; x.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 2); }
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(100,78,56,${0.4 + 0.3 * r()})`; x.beginPath(); x.ellipse(r() * 512, r() * 512, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.anisotropy = 8; return t; })();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
{ const bg = new THREE.ConeGeometry(0.025, 1, 3); bg.translate(0, 0.5, 0); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const N = 9000, im = new THREE.InstancedMesh(bg, m, N), M = new THREE.Matrix4(), r = rnd(9), col = new THREE.Color();
  for (let i = 0; i < N; i++) { const cx = (r() - 0.5) * 40, cz = -3.8 - r() * 30; M.compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5)), new THREE.Vector3(1, 0.25 + r() * 0.4, 1)); im.setMatrixAt(i, M); im.setColorAt(i, col.setHSL(0.2 + r() * 0.06, 0.45, 0.32 + r() * 0.15)); }
  im.castShadow = true; im.receiveShadow = true; scene.add(im); }
// ---------------------------------------------------------------- props: bench and barrel
const wood = new THREE.MeshStandardMaterial({ color: '#9a6a3c', roughness: 0.8 });
{ const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.45), wood); top.position.set(-0.3, 0.55, -2.4); top.castShadow = top.receiveShadow = true; scene.add(top);
  for (const x of [-1.2, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.38), wood); l.position.set(x, 0.275, -2.4); l.castShadow = true; scene.add(l); }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.95, 24), new THREE.MeshStandardMaterial({ color: '#b27a40', roughness: 0.7 })); barrel.position.set(1.4, 0.475, -2.9); barrel.castShadow = barrel.receiveShadow = true; scene.add(barrel);
  for (const y of [0.18, 0.77]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 32), new THREE.MeshStandardMaterial({ color: '#3a3a40', metalness: 0.6, roughness: 0.4 })); h.rotation.x = Math.PI / 2; h.position.set(1.4, y, -2.9); scene.add(h); } }
// ---------------------------------------------------------------- the bomb and the character
const bomb = makeBomb(); scene.add(bomb);
const tree = new Tree({ base: new THREE.Vector3(1.3, 0, 0.3) }); scene.add(tree.group); window.TREE = tree;
const guy = new Toon2D(); scene.add(guy.group);
const K = (keys, t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const [t0, a] = keys[i], [t1, b] = keys[i + 1]; const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), s = u * u * (3 - 2 * u); return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * s) : a + (b - a) * s; };
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// monotone cubic through keys (no overshoot, no stop at every key): the body glides between footfalls
function mono(keys) {
  const n = keys.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]));
  for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) m[i] = 2 / (1 / d[i - 1] + 1 / d[i]);
  return (t) => { if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1]; let i = 0; while (t > keys[i + 1][0]) i++; const h = keys[i + 1][0] - keys[i][0], u = (t - keys[i][0]) / h, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h * m[i + 1]; };
}
const ROOT_Z = 0.1, WALK_YAW = 1.35, SQUAT_YAW = 0.6, END_YAW = 0.1;
const fwdOf = (y) => new THREE.Vector3(Math.sin(y), 0, Math.cos(y)), rightOf = (y) => new THREE.Vector3(Math.cos(y), 0, -Math.sin(y));
const STOP = new THREE.Vector3(-0.05, 0, ROOT_Z), BOMB0 = STOP.clone().addScaledVector(fwdOf(SQUAT_YAW), 0.36).addScaledVector(rightOf(SQUAT_YAW), -0.08).setY(0.13);
const stance = (side, yaw, w) => ({ pos: STOP.clone().addScaledVector(rightOf(yaw), side * w).setY(0.02), yaw });
const walkPlant = (side, x) => ({ pos: new THREE.Vector3(x, 0.02, ROOT_Z).addScaledVector(rightOf(WALK_YAW), side * 0.1), yaw: WALK_YAW });
// footsteps: each foot stays exactly where it landed until its next step (normal stride, ~0.5 s per step)
const START = { L: walkPlant(-1, -1.25), R: walkPlant(1, -1.25) };
const STEPS = [
  { f: 'R', a: 0.3, b: 0.72, to: walkPlant(1, -1.0) }, { f: 'L', a: 0.8, b: 1.22, to: walkPlant(-1, -0.65) },
  { f: 'R', a: 1.3, b: 1.72, to: walkPlant(1, -0.3) }, { f: 'L', a: 1.8, b: 2.22, to: stance(-1, SQUAT_YAW, 0.14) },
  { f: 'R', a: 2.18, b: 2.52, to: stance(1, SQUAT_YAW, 0.14) },
  { f: 'L', a: 4.0, b: 4.32, to: stance(-1, END_YAW, 0.12) }, { f: 'R', a: 4.3, b: 4.62, to: stance(1, END_YAW, 0.12) },
];
function feetAt(t) {
  const out = {}; let bob = 0;
  for (const f of ['L', 'R']) {
    let cur = START[f], res = null;
    for (const s of STEPS) { if (s.f !== f) continue; if (t >= s.b) { cur = s.to; continue; } if (t > s.a) { const u = (t - s.a) / (s.b - s.a), e = u * u * (3 - 2 * u); res = { pos: cur.pos.clone().lerp(s.to.pos, e).add(new THREE.Vector3(0, Math.sin(u * Math.PI) * 0.09, 0)), yaw: cur.yaw + (s.to.yaw - cur.yaw) * e }; bob = Math.max(bob, Math.sin(u * Math.PI) * 0.025); } break; }
    out[f] = res || cur;
  }
  return { feet: out, bob };
}
const RX = mono([[0, -1.25], [0.3, -1.25], [0.72, -1.09], [1.22, -0.79], [1.72, -0.45], [2.22, -0.17], [2.6, -0.05], [5, -0.05]]);
const CROUCH = [[0, 0.07], [2.2, 0.07], [2.75, 0.9], [3.2, 0.95], [3.95, 0.04], [5, 0.02]];
const BEND = [[0, 0.06], [2.2, 0.1], [2.8, 0.85], [3.2, 0.9], [3.95, -0.07], [5.85, -0.08], [6.05, -0.2], [6.8, -0.16], [7.05, 0.06], [7.8, 0.06], [8.3, -0.04], [10, -0.05]];
const YAW = [[0, WALK_YAW], [1.85, WALK_YAW], [2.4, SQUAT_YAW], [3.3, 0.55], [4.0, 0.15], [5, END_YAW]];
// the bomb: on the ground until both hands have it (3.0), lifted 3.15-4.0 to chest height, then weighed in the hands
const HOLD = STOP.clone().addScaledVector(fwdOf(0.15), 0.4).setY(1.04);
const HOLD_AWAY = HOLD.clone().addScaledVector(fwdOf(END_YAW), 0.16).add(new THREE.Vector3(0.04, 0.06, 0)), HOLD_BLOW = STOP.clone().addScaledVector(fwdOf(END_YAW), 0.42).addScaledVector(rightOf(END_YAW), 0.06).setY(1.3);
const bombAt = (t) => { if (t < 3.0) return BOMB0.clone(); const p = BOMB0.clone().lerp(HOLD, sm(3.15, 4.0, t)); p.y += Math.sin((t - 4.3) * Math.PI * 2 * 1.6) * 0.03 * sm(4.3, 4.55, t) * (1 - sm(5.6, 5.85, t));
  p.lerp(HOLD_AWAY, sm(5.88, 6.12, t) * (1 - sm(6.8, 7.05, t))); p.lerp(HOLD_BLOW, sm(6.8, 7.05, t) * (1 - sm(7.95, 8.5, t))); if (t > 5.88 && t < 6.6) p.x += Math.sin(t * 47) * 0.01 * (1 - (t - 5.88) / 0.72); return p; };
// hands: side grip on the ground, sliding under the bomb as it comes up (it sits on the palms: heavy)
function handsAt(t, yaw, bp) {
  const r = rightOf(yaw), u = sm(3.1, 3.75, t), out = {};
  for (const [f, s, w0, w1] of [['L', -1, 2.3, 2.95], ['R', 1, 2.4, 3.0]]) {
    const side = r.clone().multiplyScalar(s * 0.125).add(new THREE.Vector3(0, 0.03, 0)), under = r.clone().multiplyScalar(s * 0.07).add(new THREE.Vector3(0, -0.11, 0)).addScaledVector(fwdOf(yaw), 0.03);
    out[f] = { pos: bp.clone().add(side.lerp(under, u)), w: sm(w0, w1, t) };
  }
  return out;
}
function inputs(t) {
  const yaw = K(YAW, t), { feet, bob } = feetAt(t), bp = bombAt(t);
  return { root: new THREE.Vector3(RX(t), 0, ROOT_Z), yaw, crouch: K(CROUCH, t), bend: K(BEND, t), feet, bob: -bob * 0.6, hand: handsAt(t, yaw, bp), bp };
}
// cap spring: driven by the head's acceleration, simulated from 0.8 s back so it stays a pure function of t
function hatSpring(t, cr, cu) {
  const dt = 1 / 120, head = (x) => skeleton(inputs(Math.max(0, x))).head; const o = new THREE.Vector3(), v = new THREE.Vector3();
  for (let x = Math.max(0, t - 0.8); x < t; x += dt) {
    const a = head(x + dt).add(head(x - dt)).sub(head(x).multiplyScalar(2)).divideScalar(dt * dt);
    const acc = o.clone().multiplyScalar(-260).addScaledVector(v, -10).addScaledVector(a, -0.9);
    v.addScaledVector(acc, dt); o.addScaledVector(v, dt);
  }
  const x = THREE.MathUtils.clamp(o.dot(cr), -0.05, 0.05), y = THREE.MathUtils.clamp(o.dot(cu), -0.05, 0.05);
  return { x, y, rot: -x * 3 };
}
// ---------------------------------------------------------------- what he feels, moment to moment (drives the face every frame)
// 0-2.2 creeping up on it: wary, a little doubtful | 2.3-3.9 gripping and lifting: effort builds with the load, eyes squeeze
// 3.95 it's up: a small surprise at the weight, then tired | 4.5-5.8 weighing it: doubt, a little smug
// 5.88 the fuse catches: a jolt of surprise that turns to fear | 7.0-7.8 blows on the fuse | 7.85 it goes out: relief, worn out
// 8.7-10 annoyed at the thing, and doubtful of it
const EMO = {
  surprise: [[0, 0], [0.7, 0], [0.85, 0.25], [1.3, 0.05], [3.85, 0], [4.0, 0.45], [4.4, 0.08], [5.82, 0], [5.92, 1], [6.3, 0.75], [6.7, 0.2], [7.0, 0], [10, 0]],
  fear: [[0, 0.3], [0.8, 0.38], [2.2, 0.3], [2.6, 0.08], [5.82, 0], [6.1, 0.45], [6.6, 0.95], [7.6, 0.85], [8.0, 0.12], [8.5, 0], [10, 0]],
  anger: [[0, 0], [2.2, 0], [2.6, 0.25], [3.1, 0.08], [8.6, 0], [9.0, 0.55], [10, 0.5]],
  joy: [[0, 0], [4.6, 0], [5.0, 0.18], [5.75, 0.2], [5.85, 0], [7.9, 0], [8.2, 0.28], [8.6, 0.2], [8.9, 0], [10, 0]],
  sad: [[0, 0], [10, 0]],
  effort: [[0, 0], [2.3, 0], [2.8, 0.45], [3.05, 0.7], [3.2, 0.95], [3.85, 0.95], [4.05, 0.2], [4.4, 0.04], [5, 0], [6.9, 0], [7.05, 0.25], [7.7, 0.25], [7.9, 0], [10, 0]],
  doubt: [[0, 0.35], [0.8, 0.2], [2.2, 0.1], [2.5, 0], [4.3, 0], [4.6, 0.65], [5.75, 0.6], [5.85, 0], [8.6, 0], [9.0, 0.6], [10, 0.6]],
  tired: [[0, 0], [3.95, 0], [4.15, 0.4], [4.5, 0.1], [7.8, 0], [8.1, 0.65], [8.6, 0.4], [9.0, 0.12], [10, 0.12]],
  blow: [[0, 0], [6.95, 0], [7.1, 1], [7.75, 1], [7.85, 0], [10, 0]],
};
const JOLTS = [[0.8, 0.05], [2.3, 0.05], [3.05, 0.06], [3.95, 0.07], [4.55, 0.05], [5.88, 0.13], [6.6, 0.06], [7.05, 0.05], [7.85, 0.08], [8.7, 0.07]];   // the head squashes on each change of feeling
const BLINKS = [1.6, 4.3, 5.25, 6.75, 8.3, 9.5];
const emotionsAt = (t) => { const E = {}; for (const k in EMO) E[k] = K(EMO[k], t); return E; };
const isRing = (t) => features(emotionsAt(t)).wide > 0.38;
// a change of eye type (dot <-> ring) always happens inside a blink, so the eyes never cross-fade
const lifeAt = (t) => { let blink = 0; for (const b of BLINKS) { const d = Math.abs(t - b); if (d < 0.08) blink = Math.max(blink, 1 - d / 0.08); }
  for (let k = -8; k < 8; k++) { const a = t + k * 0.01, b = a + 0.01; if (isRing(a) !== isRing(b)) blink = Math.max(blink, 1 - Math.abs(t - a) / 0.08); } return { blink, browJit: 0.008 * Math.sin(t * 6.3) + 0.005 * Math.sin(t * 11.7) }; };
const bounceAt = (t) => { let s = 0; for (const [t0, a] of JOLTS) { const d = t - t0; if (d > 0 && d < 0.8) s += a * Math.exp(-d * 6) * Math.sin(d * 19); } return s; };
// the fuse: a spark from 5.88 to 7.85, then a wisp of smoke
const SPARK0 = 5.88, SPARK1 = 7.85;
const sparkTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,210,90,0.95)'); gr.addColorStop(0.6, 'rgba(255,120,30,0.35)'); gr.addColorStop(1, 'rgba(255,80,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(210,210,214,0.8)'); gr.addColorStop(1, 'rgba(210,210,214,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(spark);
const bits = []; for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(s); bits.push(s); }
const puffs = []; for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true })); scene.add(s); puffs.push(s); }
const fuseLight = new THREE.PointLight('#ffa040', 0, 1.5, 2); scene.add(fuseLight);
function fx(t, tip) {
  const on = t >= SPARK0 && t < SPARK1, hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  spark.visible = on; fuseLight.intensity = on ? 1.4 + 0.5 * Math.sin(t * 53) : 0;
  if (on) { spark.position.copy(tip); const s = 0.17 + 0.05 * Math.sin(t * 61) + 0.03 * Math.sin(t * 37); spark.scale.set(s, s, 1); fuseLight.position.copy(tip); }
  bits.forEach((b, i) => { const ph = (t * 2.6 + i / bits.length) % 1, born = t - ph / 2.6; b.visible = on && born >= SPARK0; if (!b.visible) return; const k = Math.floor(t * 2.6 + i / bits.length) * 31 + i, a = hash(k) * 6.28, el = 0.3 + hash(k + 7) * 1.1, sp = 0.35 + hash(k + 3) * 0.4;
    b.position.copy(tip).add(new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).multiplyScalar(ph * sp * 0.6)).add(new THREE.Vector3(0, -ph * ph * 0.12, 0)); const z = 0.05 * (1 - ph); b.scale.set(z, z, 1); });
  puffs.forEach((p, i) => { const d = t - SPARK1 - i * 0.06; p.visible = d > 0 && d < 1.2; if (!p.visible) return; p.position.copy(tip).add(new THREE.Vector3(Math.sin(i * 2.1) * 0.03 + d * 0.04, d * 0.25, 0)); const z = 0.05 + d * 0.12; p.scale.set(z, z, 1); p.material.opacity = 0.7 * (1 - d / 1.2); });
}
// hold path after the pick-up: weighing (4.3-5.8), jerked away at arm's length when it lights (5.9-6.6), brought up to blow on
// it (6.9-7.8), lowered back once it's out (7.9-8.6)
const CAM = [[0, [-0.2, 1.45, 6.4, -0.4, 1.1, 0]], [2.4, [0.7, 1.3, 5.6, 0.5, 0.98, 0]], [3.3, [0.75, 1.22, 5.4, 0.55, 0.92, 0]], [5, [0.8, 1.35, 5.4, 0.5, 1.08, 0]], [6.0, [0.7, 1.4, 4.8, 0.42, 1.2, 0]], [10, [0.75, 1.45, 4.6, 0.42, 1.25, 0]]];
window.renderFrame = async (f) => {
  const t = f / FPS;
  const c = K(CAM, t); camera.position.set(c[0], c[1], c[2]); camera.lookAt(c[3], c[4], c[5]); camera.updateMatrixWorld();
  const I = inputs(t), toCam = camera.position.clone().sub(I.root).setY(0).normalize(), cr = new THREE.Vector3(toCam.z, 0, -toCam.x), cu = new THREE.Vector3(0, 1, 0);
  tree.update(t);
  bomb.position.copy(I.bp); bomb.rotation.set(0, 0.6, 0); bomb.updateMatrixWorld();
  const tip = bomb.localToWorld(bomb.userData.tip.clone());
  fx(t, tip);
  // where he looks: the bomb, then the burning fuse, then the camera (blended, so the eyes travel)
  const camPt = I.root.clone().add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(toCam, 1.0);
  const wTip = sm(5.86, 6.0, t) * (1 - sm(8.4, 8.7, t)), wCam = sm(9.2, 9.5, t);
  const lookAt = I.bp.clone().lerp(tip, wTip).lerp(camPt, wCam);
  const F = features(emotionsAt(t), lifeAt(t));
  guy.pose({ ...I, lookAt, face: F, bounce: bounceAt(t), sun: SUN, t, armsFront: t >= 3.0, hatSpring: hatSpring(t, cr, cu), shade: (w) => tree.shadeAt(w, SUN) });
  guy.draw(camera);
  window.DBG = { order: guy.order, scr: guy.scr, headShade: tree.shadeAt(skeleton(I).head, SUN), footShade: tree.shadeAt(I.root.clone().setY(0.3), SUN) };
  await renderer.renderAsync(scene, camera);
};
window.SCENE = { fps: FPS, frames: 300, width: W, height: H };
await window.renderFrame(0); window.ready = true;
