// Camera engine used for the cartoon shorts (three.js). Calm, smooth, even-speed moves through keys; impact shakes.
// keys: [[t, [px,py,pz], [tx,ty,tz], fov, roll], ...]  (one key = a still camera, two = one smooth move)
import * as THREE from 'three/webgpu';
const V = (x, y, z) => new THREE.Vector3(x, y, z), cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// The path goes through every key (centripetal Catmull-Rom). Along it the camera moves at an even speed inside each
// stretch between keys (distance proportional to time); changes of speed at a key are blurred over ~0.6 s.
export function track(keys) {
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
// apply a track sample (optionally with a shake) to a camera
export function setCam(camera, c, sh = null) {
  camera.position.copy(c.p); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(c.q); camera.rotateZ(c.roll + (sh ? sh.r : 0));
  if (sh) { camera.translateX(sh.o.x); camera.translateY(sh.o.y); } camera.updateMatrixWorld();
}
// decaying shake from impacts: events [{ t0, a (metres), f (Hz), k (decay) }]
export function shakeAt(t, evs) { const o = V(0, 0, 0); let r = 0; for (const e of evs) { const d = t - e.t0; if (d < 0 || d > 1.5) continue; const k = e.a * Math.exp(-d * (e.k || 5)); o.x += k * Math.sin(d * e.f * 6.28 + 1); o.y += k * Math.sin(d * e.f * 5.1 + 2.3) * 0.8; r += k * 0.25 * Math.sin(d * e.f * 4.3); } return { o, r }; }
// continuous rumble (car on rumble strips): fast jitter of amplitude a
export const rumble = (t, a) => ({ o: V(a * (Math.sin(t * 71) + 0.6 * Math.sin(t * 113 + 1)), a * (Math.sin(t * 83 + 2) + 0.5 * Math.sin(t * 131)), 0), r: a * 0.6 * Math.sin(t * 97 + 0.5) });
// frames: keys can live in the world, in a car's body frame, or offset from a moving point
export const WORLD = { to: (v) => v.clone(), from: (v) => v.clone() };
export const carFrame = (group) => ({ to: (v) => group.localToWorld(v.clone()), from: (v) => group.worldToLocal(v.clone()) });
export const offFrame = (x, z) => ({ to: (v) => V(v.x + x, v.y, v.z + z), from: (v) => V(v.x - x, v.y, v.z - z) });
export function sample(keys, t, F = WORLD) { const c = track(keys)(t); return { p: F.to(c.p), q: F.to(c.q), fov: c.fov, roll: c.roll }; }
