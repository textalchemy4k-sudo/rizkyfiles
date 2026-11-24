// Cast-iron round bomb after the reference: dark iron sphere with warm reflections, a raised casting seam round the
// middle (slightly tilted), pitting and worn bright patches, a brass fuse collar with a lip, a twisted hemp fuse
// with a frayed, blackened tip. All textures generated here: albedo, roughness and a normal map from one height field.
import * as THREE from 'three/webgpu';
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
function ironMaps() {
  const W = 1024, H = 512, r = rnd(21), h = new Float32Array(W * H), wear = new Float32Array(W * H);
  const blob = (arr, cx, cy, rad, amp) => { for (let y = Math.max(0, cy - rad | 0); y < Math.min(H, cy + rad + 1); y++) for (let dx = -rad | 0; dx <= rad; dx++) { const x = ((cx + dx) % W + W) % W, d = Math.hypot(dx, y - cy) / rad; if (d < 1) arr[y * W + x] += amp * (1 - d * d) ** 2; } };
  for (let i = 0; i < 260; i++) blob(h, r() * W, 30 + r() * (H - 60), 10 + r() * 40, (r() - 0.5) * 0.5);   // hammered dents, casting waviness
  for (let i = 0; i < 2600; i++) blob(h, r() * W, 10 + r() * (H - 20), 1 + r() * 3.5, -0.4 - r() * 0.6);   // pits
  for (let i = 0; i < 70; i++) blob(wear, r() * W, 60 + r() * (H - 120), 25 + r() * 60, 0.4 + r() * 0.5);  // worn, polished patches
  for (let i = 0; i < 160; i++) { let x = r() * W, y = 40 + r() * (H - 80); const a = r() * 6.28, L = 20 + r() * 70; for (let k = 0; k < L; k++) { x += Math.cos(a); y += Math.sin(a) * 0.5; const j = (y | 0) * W + ((x | 0) % W + W) % W; if (y > 0 && y < H) { h[j] -= 0.25; wear[j] += 0.6; } } }   // scratches
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const alb = mk(), rough = mk(), nrm = mk(), A = alb.getContext('2d').createImageData(W, H), Rg = rough.getContext('2d').createImageData(W, H), N = nrm.getContext('2d').createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, q = i * 4, w = Math.min(1, wear[i]), pit = Math.min(1, Math.max(0, -h[i]) * 1.5), rust = Math.max(0, Math.sin(x * 0.031 + y * 0.047) * Math.sin(x * 0.013 - y * 0.021) - 0.55) * 2;
    const v = 96 + 70 * w - 40 * pit; A.data[q] = v + 22 * rust; A.data[q + 1] = v * 0.94 + 8 * rust; A.data[q + 2] = v * 0.88; A.data[q + 3] = 255;
    const ro = 85 - 45 * w + 100 * pit + 60 * rust; Rg.data[q] = Rg.data[q + 1] = Rg.data[q + 2] = Math.max(25, Math.min(255, ro)); Rg.data[q + 3] = 255;
    const hx = h[y * W + (x + 1) % W] - h[y * W + (x - 1 + W) % W], hy = h[Math.min(H - 1, y + 1) * W + x] - h[Math.max(0, y - 1) * W + x];
    let nx = -hx * 2.2, ny = hy * 2.2, nz = 1; const l = Math.hypot(nx, ny, nz); N.data[q] = (nx / l * 0.5 + 0.5) * 255; N.data[q + 1] = (ny / l * 0.5 + 0.5) * 255; N.data[q + 2] = (nz / l * 0.5 + 0.5) * 255; N.data[q + 3] = 255;
  }
  alb.getContext('2d').putImageData(A, 0, 0); rough.getContext('2d').putImageData(Rg, 0, 0); nrm.getContext('2d').putImageData(N, 0, 0);
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { map: T(alb, true), roughnessMap: T(rough), normalMap: T(nrm) };
}
function hempTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c8a46a'; g.fillRect(0, 0, 64, 256);
  for (let y = -64; y < 256; y += 16) { g.strokeStyle = '#8a6a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 32); g.stroke(); g.strokeStyle = '#e4cc98'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y + 6); g.lineTo(64, y + 38); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); return t;
}
export function makeBomb(R = 0.13) {
  const g = new THREE.Group(), maps = ironMaps();
  const iron = new THREE.MeshPhysicalMaterial({ ...maps, color: '#ffffff', metalness: 0.9, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8), clearcoat: 0.25, clearcoatRoughness: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), iron); body.castShadow = body.receiveShadow = true; g.add(body);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * 0.035, 10, 128), iron); seam.rotation.set(Math.PI / 2 + 0.22, 0, 0.1); seam.castShadow = true; g.add(seam);
  const brass = new THREE.MeshPhysicalMaterial({ color: '#b08a4a', metalness: 1, roughness: 0.38, clearcoat: 0.2 });
  const collar = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.33, 0.02], [0.3, 0.2], [0.36, 0.24], [0.37, 0.3], [0.24, 0.32], [0.2, 0.28], [0, 0.28]].map(([x, y]) => new THREE.Vector2(x * R, y * R)), 40), brass);
  collar.position.y = R * 0.93; collar.castShadow = true; g.add(collar);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(R * 0.035, 10, 6), brass); b.position.set(Math.cos(a) * R * 0.33, R * 1.0, Math.sin(a) * R * 0.33); g.add(b); }
  const path = new THREE.CatmullRomCurve3([[0, 1.1], [0.05, 1.5], [0.2, 1.85], [0.42, 2.0], [0.58, 1.95]].map(([x, y], i) => new THREE.Vector3(x * R, y * R, Math.sin(i) * 0.05 * R)));
  const fuse = new THREE.Mesh(new THREE.TubeGeometry(path, 40, R * 0.07, 10), new THREE.MeshStandardMaterial({ map: hempTex(), roughness: 0.95 })); fuse.castShadow = true; g.add(fuse);
  // frayed, singed end: short dark fibres splaying out of the tip
  const tip = path.getPoint(1), dir = path.getTangent(1), r = rnd(4), fib = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 1 });
  for (let i = 0; i < 9; i++) { const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.2, (r() - 0.3) * 1.2, (r() - 0.5) * 1.2)).normalize(), L = R * (0.18 + r() * 0.25); const c = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.006, R * 0.012, L, 4), fib); c.position.copy(tip).addScaledVector(d, L / 2); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(c); }
  g.userData.tip = tip.clone();
  const char = new THREE.Mesh(new THREE.SphereGeometry(R * 0.075, 12, 8), fib); char.position.copy(tip); g.add(char);
  return g;
}
