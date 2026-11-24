// Procedural surface sets (albedo + normal + roughness from one height field) for the road and its shoulders.
import * as THREE from 'three/webgpu';
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
function finish(W, H, alb, hgt, rough, repeat) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const ca = mk(), cn = mk(), cr = mk(), A = ca.getContext('2d').createImageData(W, H), N = cn.getContext('2d').createImageData(W, H), R = cr.getContext('2d').createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, q = i * 4;
    A.data[q] = alb[i * 3]; A.data[q + 1] = alb[i * 3 + 1]; A.data[q + 2] = alb[i * 3 + 2]; A.data[q + 3] = 255;
    const hx = hgt[y * W + (x + 1) % W] - hgt[y * W + (x - 1 + W) % W], hy = hgt[((y + 1) % H) * W + x] - hgt[((y - 1 + H) % H) * W + x];
    const nx = -hx * 1.4, ny = hy * 1.4, l = Math.hypot(nx, ny, 1); N.data[q] = (nx / l * 0.5 + 0.5) * 255; N.data[q + 1] = (ny / l * 0.5 + 0.5) * 255; N.data[q + 2] = (1 / l * 0.5 + 0.5) * 255; N.data[q + 3] = 255;
    R.data[q] = R.data[q + 1] = R.data[q + 2] = rough[i]; R.data[q + 3] = 255;
  }
  ca.getContext('2d').putImageData(A, 0, 0); cn.getContext('2d').putImageData(N, 0, 0); cr.getContext('2d').putImageData(R, 0, 0);
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.repeat.set(...repeat); return t; };
  return { map: T(ca, true), normalMap: T(cn), roughnessMap: T(cr) };
}
const blob = (arr, W, H, cx, cy, rad, amp) => { for (let y = Math.max(0, cy - rad | 0); y < Math.min(H, cy + rad + 1); y++) for (let dx = -rad | 0; dx <= rad; dx++) { const x = ((cx + dx) % W + W) % W, d = Math.hypot(dx, y - cy) / rad; if (d < 1) arr[y * W + x] += amp * (1 - d * d); } };
// asphalt for a 2-lane road (texture spans the full road width, 8 m along the road): aggregate, polished wheel tracks,
// tar-sealed cracks, a couple of patches, and a ragged crumbling edge
export function asphalt(lenM) {
  const W = 1024, H = 1024, r = rnd(41), hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3), rough = new Float32Array(W * H);
  const wear = new Float32Array(W * H), seal = new Float32Array(W * H), patch = new Float32Array(W * H);
  for (let i = 0; i < 140000; i++) { const x = r() * W | 0, y = r() * H | 0, rad = 0.8 + r() * 1.6; blob(hgt, W, H, x, y, rad, 0.12 + r() * 0.22); }   // aggregate stones standing proud
  for (let i = 0; i < W * H; i++) hgt[i] += (r() - 0.5) * 0.05;
  // wheel tracks: two per lane (lanes are the left and right halves), slightly polished and pressed
  for (const c of [0.12, 0.38, 0.62, 0.88]) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.abs(x / W - c) / 0.06; if (d < 1) { wear[y * W + x] = Math.max(wear[y * W + x], (1 - d * d)); hgt[y * W + x] -= 0.08 * (1 - d * d); } }
  // cracks sealed with tar: wandering lines, a longitudinal one near the centre joint
  const crack = (x, y, len, ang, wob) => { for (let k = 0; k < len; k++) { x += Math.cos(ang) + (r() - 0.5) * wob; y += Math.sin(ang) + (r() - 0.5) * wob; const xi = ((x | 0) % W + W) % W, yi = ((y | 0) % H + H) % H; for (let o = -2; o <= 2; o++) { const xx = (xi + o + W) % W; seal[yi * W + xx] = 1; hgt[yi * W + xx] -= 0.15; } } };
  crack(W * 0.5 + 6, 0, H, Math.PI / 2, 1.2);
  for (let i = 0; i < 14; i++) crack(r() * W, r() * H, 80 + r() * 260, r() * Math.PI * 2, 2.4);
  for (let i = 0; i < 5; i++) { const cx = r() * W, cy = r() * H, rad = 60 + r() * 140; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - cx, ((y - cy + H * 1.5) % H) - H / 2) / rad; if (d < 1) patch[y * W + x] = Math.max(patch[y * W + x], (1 - d * d) * 0.6); } }
  for (let i = 0; i < W * H; i++) {
    const n = hgt[i], e = wear[i] * 0.6, s = seal[i], p = patch[i];
    let v = 0.3 + n * 0.06 + e * 0.04; v = v * (1 - 0.08 * p) * (1 - 0.5 * s);
    alb[i * 3] = v * 255 * 0.98; alb[i * 3 + 1] = v * 255; alb[i * 3 + 2] = v * 255 * 1.05;
    rough[i] = 255 * Math.max(0.35, 0.86 - e * 0.25 - s * 0.35 - p * 0.15);
  }
  return finish(W, H, alb, hgt, rough, [1, lenM / 8]);
}
// the dirt and gravel shoulder where cars can pull over: compacted earth, loose stones, two tyre ruts
export function shoulder(lenM, widthM) {
  const W = 1024, H = 1024, r = rnd(53), hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3), rough = new Float32Array(W * H);
  for (let i = 0; i < 26000; i++) { const x = r() * W | 0, y = r() * H | 0, rad = 1.5 + r() * 4; blob(hgt, W, H, x, y, rad, 0.3 + r() * 0.6); }
  for (let i = 0; i < W * H; i++) hgt[i] += (r() - 0.5) * 0.08;
  const ruts = [0.3, 0.7];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let rut = 0; for (const c of ruts) { const d = Math.abs(x / W - c) / 0.07; if (d < 1) rut = Math.max(rut, 1 - d * d); } hgt[i] -= rut * 0.6;
    const n = hgt[i], stones = Math.max(0, n - 0.5) * 0.6; const base = 0.26 + n * 0.05 + rut * 0.04;
    alb[i * 3] = (base * 1.08 + stones * 0.18) * 255; alb[i * 3 + 1] = (base * 0.98 + stones * 0.17) * 255; alb[i * 3 + 2] = (base * 0.84 + stones * 0.15) * 255;
    rough[i] = 255 * (0.92 - rut * 0.1); }
  return finish(W, H, alb, hgt, rough, [1, lenM / (widthM * 1.2)]);
}
