// A semi-realistic, slightly cartoony tree built from parameters, with every part addressable every frame:
//   tree.trunk (mesh), tree.limbs[i] = { pivot (Group at the branch base), mesh, children: [...] }, tree.clumps[i] =
//   { group, leaves (InstancedMesh), core (mesh), centre, radius }. update(t) sways each limb about its own pivot and
//   flutters the clumps, so nothing is a baked static model. shadeAt(p, sunDir) says how much of the canopy lies between
//   a world point and the sun (dappled, 0..1); the 2D characters use it to put leaf shade on themselves.
import * as THREE from 'three/webgpu';
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function barkMaps() {
  const W = 512, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), r = rnd(17);
  g.fillStyle = '#6b5240'; g.fillRect(0, 0, W, H);
  const hgt = new Float32Array(W * H);
  // long vertical ridges that wander and split, the way oak bark plates run up the trunk
  for (let k = 0; k < 70; k++) { let x = r() * W; const w = 3 + r() * 9, depth = 0.5 + r() * 0.5; for (let y = 0; y < H; y++) { x += (r() - 0.5) * 1.6 + Math.sin(y * 0.02 + k) * 0.25; for (let dx = -w; dx <= w; dx++) { const xx = ((Math.round(x + dx)) % W + W) % W; hgt[y * W + xx] -= depth * (1 - (dx / w) ** 2); } } }
  for (let k = 0; k < 900; k++) { const x = r() * W, y = r() * H, len = 6 + r() * 30; for (let i = 0; i < len; i++) { const xx = ((Math.round(x + Math.sin(i * 0.3) * 2)) % W + W) % W, yy = Math.min(H - 1, Math.round(y + i)); hgt[yy * W + xx] -= 0.35; } }   // cross cracks
  const img = g.createImageData(W, H), nimg = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, q = i * 4, h = hgt[i], v = 1 + h * 0.45 + (r() - 0.5) * 0.08;
    img.data[q] = 178 * v; img.data[q + 1] = 140 * v; img.data[q + 2] = 108 * v; img.data[q + 3] = 255;
    const hx = hgt[y * W + (x + 1) % W] - hgt[y * W + (x - 1 + W) % W], hy = hgt[Math.min(H - 1, y + 1) * W + x] - hgt[Math.max(0, y - 1) * W + x];
    const nx = -hx * 1.5, ny = hy * 1.5, l = Math.hypot(nx, ny, 1); nimg.data[q] = (nx / l * 0.5 + 0.5) * 255; nimg.data[q + 1] = (ny / l * 0.5 + 0.5) * 255; nimg.data[q + 2] = (1 / l * 0.5 + 0.5) * 255; nimg.data[q + 3] = 255;
  }
  g.putImageData(img, 0, 0); const n = document.createElement('canvas'); n.width = W; n.height = H; n.getContext('2d').putImageData(nimg, 0, 0);
  const T = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: T(c, true), normalMap: T(n) };
}
function leafTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = rnd(5);
  // a little spray of 5 leaves on one twig, so each card reads as foliage, not a single paper leaf
  g.strokeStyle = '#4a3a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 250); g.quadraticCurveTo(130, 160, 120, 70); g.stroke();
  for (let k = 0; k < 5; k++) {
    const a = -1.2 + k * 0.6 + (r() - 0.5) * 0.2, bx = 128 + (k - 2) * 6, by = 200 - k * 30, L = 70 + r() * 25, W = L * 0.42;
    g.save(); g.translate(bx, by); g.rotate(a);
    const gr = g.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, '#3f7a26'); gr.addColorStop(1, '#8cc04a'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(W, -L * 0.25, W * 0.7, -L * 0.8, 0, -L); g.bezierCurveTo(-W * 0.7, -L * 0.8, -W, -L * 0.25, 0, 0); g.fill();
    g.strokeStyle = 'rgba(30,60,20,0.6)'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(220,240,170,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -L * 0.9); g.stroke(); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a tapered tube along a curve, with flared roots at the bottom of the trunk
function limbGeo(curve, r0, r1, seg = 40, rad = 18, roots = 0, vRepeat = 2) {
  const pos = [], uv = [], idx = [], frames = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i];
    let R = r0 + (r1 - r0) * Math.pow(u, 0.8);
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * Math.PI * 2; let rr = R * (1 + 0.06 * Math.sin(a * 3 + u * 9) + 0.04 * Math.sin(a * 7 - u * 5));
      if (roots && u < 0.18) rr += roots * Math.pow(1 - u / 0.18, 2.2) * Math.pow(Math.max(0, Math.cos(a * 5)), 3);
      const d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      const p = P.clone().addScaledVector(d, rr); pos.push(p.x, p.y, p.z); uv.push(j / rad * 2, u * vRepeat);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export class Tree {
  constructor({ base = V(0, 0, 0), height = 2.7, radius = 0.2, seed = 3 } = {}) {
    const r = rnd(seed), bark = barkMaps(), lt = leafTex();
    this.barkMat = new THREE.MeshStandardMaterial({ ...bark, roughness: 0.95, normalScale: new THREE.Vector2(1.4, 1.4) });
    this.leafMat = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
    this.coreMat = new THREE.MeshStandardMaterial({ color: '#4f8c32', roughness: 0.9 });
    this.group = new THREE.Group(); this.group.position.copy(base);
    // trunk: a gentle S, leaning a little toward the open side
    const tc = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.16, height * 0.35, 0.04), V(0.36, height * 0.7, 0.12), V(0.48, height, 0.18)]);
    this.trunk = new THREE.Mesh(limbGeo(tc, radius * 1.15, radius * 0.62, 48, 22, radius * 0.9, 3), this.barkMat); this.trunk.castShadow = this.trunk.receiveShadow = true; this.group.add(this.trunk);
    this.limbs = []; this.clumps = [];
    // main limbs from the upper trunk, each with sub-limbs; each limb hangs on its own pivot so it can move
    const top = tc.getPointAt(1), dirs = [[-0.75, 0.9, 0.05], [-0.65, 0.95, -0.45], [0.2, 1.0, 0.5], [0.75, 0.8, -0.2], [0.1, 1.0, 0.65], [0.5, 0.9, 0.55]];
    dirs.forEach((d0, i) => {
      const at = tc.getPointAt(0.72 + i * 0.05), pivot = new THREE.Group(); pivot.position.copy(at); this.group.add(pivot);
      const dir = V(...d0).normalize(), L = 1.0 + r() * 0.45, mid = dir.clone().multiplyScalar(L * 0.5).add(V(0, 0.12, 0)), end = dir.clone().multiplyScalar(L).add(V(0, 0.28, 0));
      const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), mid, end]);
      const mesh = new THREE.Mesh(limbGeo(curve, radius * 0.5, radius * 0.16, 20, 12, 0, 1.5), this.barkMat); mesh.castShadow = true; pivot.add(mesh);
      const limb = { pivot, mesh, children: [], phase: r() * 6, amp: 0.012 + r() * 0.01 }; this.limbs.push(limb);
      // twigs off the limb end, then a leaf clump on each
      for (let k = 0; k < 2; k++) {
        const sp = new THREE.Group(); sp.position.copy(curve.getPointAt(0.65 + k * 0.3)); pivot.add(sp);
        const sd = dir.clone().add(V((r() - 0.5) * 0.9, 0.6 + r() * 0.4, (r() - 0.5) * 0.9)).normalize(), sl = 0.4 + r() * 0.3;
        const sc = new THREE.CatmullRomCurve3([V(0, 0, 0), sd.clone().multiplyScalar(sl * 0.5).add(V(0, 0.05, 0)), sd.clone().multiplyScalar(sl)]);
        const sm = new THREE.Mesh(limbGeo(sc, radius * 0.17, radius * 0.06, 10, 8, 0, 1), this.barkMat); sm.castShadow = true; sp.add(sm);
        const sub = { pivot: sp, mesh: sm, phase: r() * 6, amp: 0.02 + r() * 0.02 }; limb.children.push(sub);
        this.addClump(sp, sd.clone().multiplyScalar(sl), 0.55 + r() * 0.3, r);
      }
      this.addClump(pivot, end, 0.62 + r() * 0.25, r);
    });
    this.addClump(this.group, top.clone().add(V(0, 0.55, 0)), 0.85, r);   // crown
    this.group.updateMatrixWorld(true);
  }
  addClump(parent, at, R, r) {
    const g = new THREE.Group(); g.position.copy(at); parent.add(g);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.78, 2), this.coreMat); core.castShadow = true; core.scale.set(1, 0.82, 1); g.add(core);
    const N = Math.round(110 * R * R + 40), leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.42), this.leafMat, N), M = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u), rr = R * (0.75 + 0.3 * Math.cbrt(r()));
      const p = V(Math.cos(a) * s * rr, u * rr * 0.82, Math.sin(a) * s * rr), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)), sc = 0.8 + r() * 0.5;
      M.compose(p, q, V(sc, sc, sc)); leaves.setMatrixAt(i, M);
      const top = (u + 1) / 2; leaves.setColorAt(i, col.setHSL(0.24 + r() * 0.04, 0.55, 0.52 + top * 0.18 + r() * 0.06));   // lighter on top, a cartoony gradient
    }
    leaves.castShadow = true; leaves.receiveShadow = true; g.add(leaves);
    this.clumps.push({ group: g, leaves, core, R, centre: new THREE.Vector3(), phase: r() * 6 });
  }
  // sway: each limb and twig rotates about its own base; clumps flutter
  update(t) {
    for (const L of this.limbs) {
      L.pivot.rotation.set(Math.sin(t * 1.3 + L.phase) * L.amp, 0, Math.sin(t * 1.1 + L.phase * 1.3) * L.amp * 1.2);
      for (const c of L.children) c.pivot.rotation.set(Math.sin(t * 2.1 + c.phase) * c.amp, 0, Math.sin(t * 1.7 + c.phase) * c.amp);
    }
    for (const c of this.clumps) c.group.rotation.y = Math.sin(t * 0.9 + c.phase) * 0.04;
    this.group.updateMatrixWorld(true);
    for (const c of this.clumps) c.group.getWorldPosition(c.centre);
  }
  // fraction of sunlight blocked between p and the sun: ray through each clump sphere, dappled by a leaf-gap pattern
  shadeAt(p, sun) {
    let s = 0, best = 1e9;
    for (const c of this.clumps) {
      const oc = c.centre.clone().sub(p), tca = oc.dot(sun); if (tca <= 0) continue;
      const d2 = oc.lengthSq() - tca * tca, R = c.R * 1.02; if (d2 > R * R) continue;
      const depth = 1 - Math.sqrt(d2) / R, hp = p.clone().addScaledVector(sun, tca);
      const n = (Math.sin(hp.x * 19.3 + hp.y * 6.1) * Math.sin(hp.z * 17.1 - hp.y * 8.3 + c.phase) + 0.6 * Math.sin(hp.x * 37.7 - hp.z * 33.9 + hp.y * 4.0)) * 0.32 + 0.5;   // gaps between leaves
      const cover = Math.min(1, depth * 2.5) * (n > 0.47 ? 1 : 0);
      if (tca < best) { best = tca; s = cover; }
    }
    return s;
  }
}
