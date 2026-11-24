// A sheriff's cruiser SUV built from real police-SUV proportions
// (5.18 m long, 2.04 m wide, wheelbase 2.95 m, 275/55R20 tyres). Built from curved parametric surfaces, never boxes:
// the side skin is one height-parametrised profile with a bulge, a rolled-under rocker and a filleted top; hood, fascia,
// tailgate, greenhouse and roof are their own surfaces that meet it. Doors, hood and tailgate are separate panels cut
// from the same surfaces with 6 mm shut-line gaps (a dark liner shows through), and each hangs on its real hinge.
// Car frame: -z forward, centre line x = CX, ground y = 0.
import * as THREE from 'three/webgpu';
import { makeWheel } from './wheel.js';
export const CX = 0.375;
const HW = 1.02, R = 0.06;                         // half width, top fillet radius
const ZF = -2.95, ZR = 2.23, AF = -2.0, AR = 0.95;  // front/rear faces, axles
const WR = 0.405, ARCH = 0.47, YB = 0.46;           // wheel radius, arch radius, rocker line
const ZA1 = -1.13, ZA2 = 0.1, ZB1 = 0.13, ZB2 = 0.86, GAP = 0.003;
const Wz = (z) => HW * (1 - 0.035 * Math.max(0, (-2.55 - z) / 0.28) ** 2 - 0.03 * Math.max(0, (z - 1.95) / 0.2) ** 2);
const archTop = (z) => Math.max(...[AF, AR].map((az) => Math.abs(z - az) < ARCH ? WR + Math.sqrt(ARCH * ARCH - (z - az) ** 2) : 0));
const yT = (z) => z < -1.15 ? 0.93 + 0.07 * (z + 2.83) / 1.68 : 1.0 + 0.05 * Math.min(1, (z + 1.15) / 3.2);   // fender/belt line
const zA = (s) => -1.15 + 0.6 * s, zRg = (s) => 2.17 - 0.06 * s;   // A-pillar and tailgate-glass lines on the greenhouse (s 0 belt .. 1 roof)
const YROOF = 1.71, WG = HW - 0.13;
// mesh builder: grid of (us x vs), pos(u, v) -> Vector3, pick(i, j, centre) -> material key or null; normals oriented to 'out'
function grid(us, vs, pos, pick, out) {
  const P = us.map((u) => vs.map((v) => pos(u, v))), groups = {};
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
    const c = P[i][j].clone().add(P[i + 1][j]).add(P[i][j + 1]).add(P[i + 1][j + 1]).multiplyScalar(0.25);
    const key = pick(i, j, c, (us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2); if (!key) continue;
    (groups[key] = groups[key] || []).push([i, j]);
  }
  const outG = {};
  for (const key in groups) {
    const map = new Map(), pos3 = [], uv = [], idx = [];
    const vid = (i, j) => { const k = i * vs.length + j; if (!map.has(k)) { map.set(k, pos3.length / 3); const p = P[i][j]; pos3.push(p.x, p.y, p.z); uv.push(us[i], vs[j]); } return map.get(k); };
    for (const [i, j] of groups[key]) {
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
      const n = P[i + 1][j].clone().sub(P[i][j]).cross(P[i][j + 1].clone().sub(P[i][j]));
      const o = typeof out === 'function' ? out(P[i][j]) : out;
      if (n.dot(o) >= 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos3, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); outG[key] = g;
  }
  return outG;
}
const range = (a, b, step, extra = []) => { const r = []; for (let x = a; x < b; x += step) r.push(x); r.push(b); return [...new Set([...r, ...extra].map((v) => +v.toFixed(5)))].sort((p, q) => p - q); };
const canvasTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export class CarBody {
  constructor(envMap) {
    const g = this.group = new THREE.Group(); this.parts = {};
    const peel = (() => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), h = new Float32Array(N * N);
      let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 2600; k++) { const cx = r() * N, cy = r() * N, rad = 2 + r() * 5, a = (r() - 0.5) * 0.8; for (let yy = -rad | 0; yy <= rad; yy++) for (let xx = -rad | 0; xx <= rad; xx++) { const d = Math.hypot(xx, yy) / rad; if (d < 1) h[(((cy + yy) | 0) % N + N) % N * N + ((((cx + xx) | 0) % N) + N) % N] += a * (1 - d * d); } }
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { const q = (yy * N + xx) * 4, hx = h[yy * N + (xx + 1) % N] - h[yy * N + (xx - 1 + N) % N], hy = h[((yy + 1) % N) * N + xx] - h[((yy - 1 + N) % N) * N + xx], l = Math.hypot(hx * 0.6, hy * 0.6, 1); img.data[q] = (-hx * 0.6 / l * 0.5 + 0.5) * 255; img.data[q + 1] = (hy * 0.6 / l * 0.5 + 0.5) * 255; img.data[q + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[q + 3] = 255; }
      x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
    const grime = (() => { const t = canvasTex(256, 256, (x, w, h) => { let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647; x.fillStyle = '#4a4a4a'; x.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '20,20,20' : '140,140,140'},${0.25 * r()})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(150,150,150,0.12)'; x.fillRect(r() * w, r() * h, 1 + r() * 2, 10 + r() * 40); } }); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
    const M = {
      white: new THREE.MeshPhysicalMaterial({ color: '#eceef0', metalness: 0.25, roughness: 0.5, roughnessMap: grime, clearcoat: 1, clearcoatRoughness: 0.08, clearcoatNormalMap: peel, clearcoatNormalScale: new THREE.Vector2(0.35, 0.35), normalMap: peel, normalScale: new THREE.Vector2(0.12, 0.12), envMap, envMapIntensity: 1.1 }),
      green: new THREE.MeshPhysicalMaterial({ color: '#1d6a3a', metalness: 0.35, roughness: 0.5, roughnessMap: grime, clearcoat: 1, clearcoatRoughness: 0.08, clearcoatNormalMap: peel, clearcoatNormalScale: new THREE.Vector2(0.35, 0.35), normalMap: peel, normalScale: new THREE.Vector2(0.12, 0.12), envMap, envMapIntensity: 1.0 }),
      gold: new THREE.MeshPhysicalMaterial({ color: '#cfa23c', metalness: 0.8, roughness: 0.3, envMap, envMapIntensity: 1.2 }),
      black: new THREE.MeshPhysicalMaterial({ color: '#14161a', metalness: 0.1, roughness: 0.35, clearcoat: 0.6, envMap, envMapIntensity: 0.8 }),
      plastic: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.78, normalMap: peel, normalScale: new THREE.Vector2(0.6, 0.6), envMap, envMapIntensity: 0.25, side: THREE.DoubleSide }),
      liner: new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.9, side: THREE.DoubleSide }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#05070a', metalness: 0.0, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.62, envMap, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
      shield: new THREE.MeshBasicMaterial({ color: '#0a0d13', transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }),
      chrome: new THREE.MeshStandardMaterial({ color: '#d4d8de', metalness: 1, roughness: 0.14, envMap, envMapIntensity: 1.6 }),
      red: new THREE.MeshBasicMaterial({ color: '#ff2414', toneMapped: false }),
      redDim: (() => { const t = canvasTex(16, 32, (x, w, h) => { x.fillStyle = '#ff3a26'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a0806'; x.fillRect(0, 0, w, 7); x.fillStyle = '#ffb0a0'; x.fillRect(0, 9, w, 2); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1 / 0.05); return new THREE.MeshPhysicalMaterial({ color: '#5a0a08', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.4, roughness: 0.15, clearcoat: 1 }); })(),
      head: new THREE.MeshBasicMaterial({ color: '#fff4e2', toneMapped: false }),
      redCorner: new THREE.MeshPhysicalMaterial({ color: '#5a0a08', emissive: '#ff3a26', emissiveIntensity: 1.2, roughness: 0.15, clearcoat: 1 }),
      wheelPaint: new THREE.MeshPhysicalMaterial({ color: '#1a1b1e', metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMap, envMapIntensity: 1.0 }),
      wheelLip: new THREE.MeshStandardMaterial({ color: '#b9bdc3', metalness: 1, roughness: 0.22, envMap, envMapIntensity: 1.4 }),
      caliper: new THREE.MeshPhysicalMaterial({ color: '#3a3c42', metalness: 0.4, roughness: 0.4, clearcoat: 0.6 }),
    };
    this.M = M;
    const add = (geoms, parent = g, name = '') => { for (const k in geoms) { const m = new THREE.Mesh(geoms[k], M[k]); m.castShadow = k !== 'shield'; m.receiveShadow = true; parent.add(m); if (name) this.parts[name + ':' + k] = m; } };
    // ---------------------------------------------------------------- side skin (both sides): rocker roll-under, bulged side, filleted top
    const RC = 0.1, ZE = 2.145 - RC;
    const zs = range(-2.83, ZE, 0.015, [ZA1 - GAP, ZA1 + GAP, ZA2 - GAP, ZA2 + GAP, ZB1 - GAP, ZB1 + GAP, ZB2 - GAP, ZB2 + GAP]);
    const STRIPE0 = 0.7, STRIPE1 = 0.716;
    // profile parameter v: 0..0.15 rocker curl, 0.15..0.85 side (by height), 0.85..1 top fillet
    const sideP = (sd) => (z, v) => {
      const W = Wz(z), yt = yT(z), ab = archTop(z), yb = Math.max(YB, ab - 0.02), arch = ab > YB;
      if (v < 0.15) { const a = v / 0.15, ang = -Math.PI / 2 + a * Math.PI / 2, rr = arch ? 0.012 : 0.06; return new THREE.Vector3(CX + sd * (W - rr + rr * Math.cos(ang)), yb + 0.02 + rr * Math.sin(ang) + 0.0, z); }
      if (v <= 0.85) { const a = (v - 0.15) / 0.7, y = yb + 0.02 + a * (yt - R - yb - 0.02), fade = 1 - Math.min(1, Math.max(0, (z - 1.85) / 0.25)) - Math.min(1, Math.max(0, (-2.55 - z) / 0.25)), bulge = fade * (0.012 * Math.sin(Math.PI * Math.min(1, (y - yb) / (yt - yb))) + 0.006 * Math.exp(-(((y - (yt - 0.12)) / 0.012) ** 2)) - 0.004 * Math.exp(-(((y - 0.6) / 0.01) ** 2))); return new THREE.Vector3(CX + sd * (W + bulge), y, z); }
      const a = (v - 0.85) / 0.15, ang = a * Math.PI / 2; return new THREE.Vector3(CX + sd * (W - R + R * Math.cos(ang)), yt - R + R * Math.sin(ang), z);
    };
    // rows: dense at the rocker, at the door bottom gap, at the stripe, at the fillet
    const vs = (() => { const r = range(0, 0.15, 0.025); for (let a = 0.15; a <= 0.85; a += 0.025) r.push(a); r.push(0.85); for (let a = 0.86; a <= 1.0001; a += 0.025) r.push(Math.min(1, a));
      // the door bottom edge rows and the stripe rows (convert heights to v at a typical belt height; exact enough for row placement)
      return [...new Set(r.map((x) => +x.toFixed(4)))].sort((a, b) => a - b); })();
    const yOf = (z, v) => sideP(1)(z, v).y;
    const inArch = () => false;
    const gapZ = (z) => [ZA1, ZA2, ZB1, ZB2].some((e) => Math.abs(z - e) < GAP);
    const doorOf = (z, y) => y > Math.max(YB, archTop(z) - 0.02) + 0.03 ? (z > ZA1 && z < ZA2 ? 'F' : z > ZB1 && z < ZB2 ? 'R' : null) : null;
    const paintOf = (y) => y < STRIPE0 ? 'green' : y < STRIPE1 ? 'gold' : 'white';
    this.doors = [];
    for (const sd of [-1, 1]) {
      const pos = sideP(sd), out = new THREE.Vector3(sd, 0, 0);
      // body (everything not a door), then each door from the same surface
      add(grid(zs, vs, pos, (i, j, c, z) => (inArch(c) || gapZ(z) || doorOf(z, c.y)) ? null : (c.y < Math.max(YB, archTop(c.z) - 0.02) + 0.02 ? (archTop(c.z) > YB ? paintOf(c.y) : 'plastic') : (c.z > 2.03 && c.y > 0.78 && c.y < 0.98 ? 'redDim' : paintOf(c.y))), out), g, 'side' + sd);
      for (const [name, z0, z1] of [['F', ZA1, ZA2], ['R', ZB1, ZB2]]) {
        const pivot = new THREE.Group(); pivot.position.set(CX + sd * HW, 0, z0); g.add(pivot);
        const inner = new THREE.Group(); inner.position.set(-(CX + sd * HW), 0, -z0); pivot.add(inner);
        add(grid(zs, vs, pos, (i, j, c, z) => (!inArch(c) && !gapZ(z) && doorOf(z, c.y) === name) ? paintOf(c.y) : null, out), inner, 'door' + name + sd);
        this.doors.push({ pivot, inner, side: sd, name });
        // handle: a rounded pull set into the door just under the stripe-line, at the rear of the door
        const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.12, 4, 8), M.black); h.rotation.z = Math.PI / 2; h.position.set(CX + sd * (Wz(z1) + 0.012), 0.92, z1 - 0.2); inner.add(h);
        // the star on the front doors
        if (name === 'F') { const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.13, 0.055)), M.gold); star.position.set(CX + sd * (HW + 0.014), 0.85, -0.55); star.rotation.y = sd * Math.PI / 2; inner.add(star); }
      }
      // dark liner behind the door openings so the shut lines read as gaps
      add(grid(range(-1.15, 0.9, 0.05), [0.15, 1.0], (z, v) => sideP(sd)(z, v).add(new THREE.Vector3(-sd * 0.02, 0, 0)), () => 'liner', new THREE.Vector3(sd, 0, 0)));
      for (const az of [AF, AR]) { const lip = new THREE.Mesh(new THREE.TorusGeometry(ARCH - 0.005, 0.016, 10, 48, Math.PI), M.plastic); lip.rotation.y = Math.PI / 2; lip.position.set(CX + sd * (HW - 0.006), WR, az); g.add(lip); }
      // wheel-arch liners
      for (const az of [AF, AR]) {
        const tub = new THREE.Mesh(new THREE.CylinderGeometry(ARCH + 0.02, ARCH + 0.02, 0.4, 48, 1, true, 0, Math.PI), M.liner); tub.rotation.z = Math.PI / 2; tub.position.set(CX + sd * (HW - 0.22), WR, az); g.add(tub);
        const wall = new THREE.Mesh(new THREE.CircleGeometry(ARCH + 0.02, 48, 0, Math.PI), M.liner); wall.rotation.y = Math.PI / 2; wall.position.set(CX + sd * (HW - 0.42), WR, az); g.add(wall);
      }
      // side text on the rear quarter
      const word = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.14), new THREE.MeshStandardMaterial({ map: wordTex(), transparent: true, roughness: 0.4 })); word.position.set(CX + sd * (Wz(1.65) + 0.016), 0.85, 1.65); word.rotation.y = sd * Math.PI / 2; g.add(word);
    }
    // ---------------------------------------------------------------- hood (a panel, hinged at the cowl) and the dark gap under its edges
    {
      const hz = range(-2.86, -1.18, 0.03), hx = range(-1, 1, 0.05);
      const hoodPos = (z, u) => { const w = Wz(z) - R - 0.006, x = u * w, yt = yT(z), y = yt + 0.004 + 0.03 * (1 - u * u); const zf = z < -2.8 ? z : z; return new THREE.Vector3(CX + x, y, zf); };
      const pivot = this.hood = new THREE.Group(); pivot.position.set(CX, yT(-1.18), -1.18); g.add(pivot);
      const inner = new THREE.Group(); inner.position.set(-CX, -yT(-1.18), 1.18); pivot.add(inner);
      add(grid(hz, hx, hoodPos, () => 'white', new THREE.Vector3(0, 1, 0)), inner, 'hood');
      add(grid(hz, [-1, 1], (z, u) => hoodPos(z, u).add(new THREE.Vector3(0, -0.03, 0)), () => 'liner', new THREE.Vector3(0, 1, 0)));
      // cowl strip between hood and windshield
      const cowl = grid(range(-1.2, -1.14, 0.03), hx, (z, u) => new THREE.Vector3(CX + u * (Wz(z) - R), yT(z) + 0.005, z), () => 'black', new THREE.Vector3(0, 1, 0)); add(cowl);
    }
    // ---------------------------------------------------------------- front fascia: a bulged surface across the nose (bumper, grille, lamps, intake)
    {
      const W0 = Wz(-2.83), zf = (x, y) => ZF + 0.11 * (x / W0) ** 2 + 0.05 * ((y - 0.62) / 0.32) ** 2;
      const ys = range(0.28, yT(-2.83) + 0.03, 0.02, [0.44, 0.6, 0.66, 0.86]), xs = range(-W0, W0, 0.03, [-0.94, -0.52, -0.5, 0.5, 0.52, 0.94]);
      const pick = (i, j, c, x, y) => { const ax = Math.abs(x);
        if (y > 0.66 && y < 0.86 && ax > 0.52 && ax < 0.94) return 'head';
        if (y > 0.6 && y < 0.86 && ax < 0.5) return 'black';
        if (y < 0.44 && ax < 0.8) return 'plastic';
        return 'white'; };
      add(grid(xs, ys, (x, y) => new THREE.Vector3(CX + x, y, zf(x, y)), pick, new THREE.Vector3(0, 0, -1)), g, 'fascia');
      for (let k = 0; k < 6; k++) { const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.92, 2, 8), M.chrome); bar.rotation.z = Math.PI / 2; bar.position.set(CX, 0.63 + k * 0.04, zf(0, 0.63 + k * 0.04) - 0.012); g.add(bar); }
      // headlamp housings: chrome reflector rims round the lens
      for (const sd of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 32), M.chrome); rim.scale.set(2.6, 1.15, 1); rim.position.set(CX + sd * 0.73, 0.76, zf(sd * 0.73, 0.76) - 0.006); g.add(rim); }
    }
    // ---------------------------------------------------------------- rear: corners and bumper (body), tailgate (hinged at the roof), lamps
    {
      // the side's cross-section at the corner start: half-width xs(y) for every height
      const prof = []; for (let v = 0; v <= 1.0001; v += 0.01) { const q = sideP(1)(ZE, Math.min(1, v)); prof.push([q.y, q.x - CX]); }
      const xsAt = (y) => { if (y <= prof[0][0]) return prof[0][1]; for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const t = (y - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0] || 1); return prof[i - 1][1] + t * (prof[i][1] - prof[i - 1][1]); } return prof[prof.length - 1][1]; };
      const corner = (sd) => grid(range(0, 1, 0.01), range(0, Math.PI / 2, Math.PI / 24), (v, ph) => { const q = sideP(sd)(ZE, v), xs = Math.abs(q.x - CX); return new THREE.Vector3(CX + sd * (xs - RC + RC * Math.cos(ph)), q.y, ZE + RC * Math.sin(ph)); },
        (i, j, c) => c.y < YB + 0.02 ? 'plastic' : (c.y > 0.78 && c.y < 0.98 ? 'redCorner' : (c.y < 0.7 ? 'green' : c.y < 0.716 ? 'gold' : 'white')), (P) => new THREE.Vector3(Math.sign(P.x - CX), 0, 1));
      for (const sd of [-1, 1]) add(corner(sd), g, 'corner' + sd);
      const W0 = Wz(2.145), zr = (x, y) => ZR - 0.085 * (x / W0) ** 2 - 0.03 * ((y - 0.75) / 0.3) ** 2 * (1 - (x / W0) ** 2);   // its outer edge lands exactly on the side skin's end (z 2.145)
      const ys = range(0.3, 1.06, 0.02, [0.4, 0.6, 0.6 + GAP, 0.78, 0.915, 0.93, 0.98]), xs = range(-W0, W0, 0.03, [-(W0 - 0.12), -(W0 - 0.12) - GAP, W0 - 0.12, W0 - 0.12 + GAP, -(W0 - 0.34), W0 - 0.34]);
      const tgx = W0 - 0.12;
      const lamp = (x, y) => Math.abs(x) > W0 - 0.34 && y > 0.78 && y < 0.98;
      const body = (i, j, c, x, y) => { const ax = Math.abs(x); if (ax < tgx + GAP && y > 0.6) return null; if (lamp(x, y)) return 'redDim'; if (y < 0.4) return 'plastic'; return 'white'; };
      const rearP = (x, y) => new THREE.Vector3(CX + x * Math.max(0.2, xsAt(y) - RC) / W0, y, zr(x, y));
      add(grid(xs, ys.filter((y) => y >= 0.36), rearP, body, new THREE.Vector3(0, 0, 1)), g, 'rear');
      add(grid(xs, [0.3, 0.33, 0.36], (x, y) => new THREE.Vector3(CX + x * (W0 - 0.2) / W0, y, zr(x, y) - 0.04), () => 'plastic', new THREE.Vector3(0, 0, 1)));
      // tailgate lower panel and the red line across it; the plate in a dark recess; then the rear glass up to the roof
      const tg = this.tailgate = new THREE.Group(); tg.position.set(CX, YROOF, zRg(1)); g.add(tg);
      const inner = new THREE.Group(); inner.position.set(-CX, -YROOF, -zRg(1)); tg.add(inner);
      const tgPick = (i, j, c, x, y) => { const ax = Math.abs(x); if (ax > tgx - GAP || y < 0.6 + GAP) return null; if (y > 0.915 && y < 0.93) return 'red'; if (lamp(x, y)) return 'redDim'; return 'white'; };
      add(grid(xs, ys, rearP, tgPick, new THREE.Vector3(0, 0, 1)), inner, 'tail');
      const gx = range(-(WG - 0.02), WG - 0.02, 0.05), gs = range(0, 1, 0.05);
      const rgPos = (x, s) => { const y = 1.06 + s * (YROOF - 1.06), z = zRg(s) - 0.02 * (x / WG) ** 2; return new THREE.Vector3(CX + x * (1 - 0.1 * s), y, z); };
      add(grid(gx, gs, rgPos, (i, j, c, x, s) => (s < 0.05 || s > 0.95 || Math.abs(x) > WG - 0.05) ? 'black' : 'glass', new THREE.Vector3(0, 0, 1)), inner, 'rearGlass');
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), new THREE.MeshStandardMaterial({ map: plateTex(), roughness: 0.5 })); plate.position.set(CX, 0.7, zr(0, 0.7) + 0.004); inner.add(plate);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.18), M.black); frame.position.set(CX, 0.7, zr(0, 0.7) + 0.002); inner.add(frame);
      const word = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.11), new THREE.MeshStandardMaterial({ map: wordTex(), transparent: true, roughness: 0.4 })); word.position.set(CX, 0.86, zr(0, 0.86) + 0.004); inner.add(word);
      // exhaust tips
      for (const dx of [-0.62, -0.5]) { const tip = new THREE.Mesh(new THREE.LatheGeometry([[0.03, -0.08], [0.038, -0.08], [0.04, 0.06], [0.036, 0.075], [0.03, 0.07], [0.028, -0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 32), M.chrome); tip.rotation.x = Math.PI / 2; tip.position.set(CX + dx, 0.33, ZR - 0.14); tip.castShadow = true; g.add(tip); const soot = new THREE.Mesh(new THREE.CircleGeometry(0.029, 24), M.liner); soot.position.set(CX + dx, 0.33, ZR - 0.12); g.add(soot); }
      // lamp glare and the red light thrown on the road behind
      this.tail = [];
      const glare = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,90,70,1)'); gr.addColorStop(0.15, 'rgba(255,40,25,0.5)'); gr.addColorStop(0.5, 'rgba(255,20,10,0.1)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); });
      const streak = canvasTex(256, 32, (x) => { const gr = x.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,40,20,0)'); gr.addColorStop(0.5, 'rgba(255,120,90,1)'); gr.addColorStop(1, 'rgba(255,40,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 32); const v = x.createLinearGradient(0, 0, 0, 32); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, 256, 32); });
      for (const sd of [-1, 1]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glare, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); sp.position.set(CX + sd * (W0 - 0.18), 0.88, zr(W0 - 0.18, 0.88) + 0.06); sp.scale.set(1.15, 0.6, 1); g.add(sp); this.tail.push(sp);
        const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: streak, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, opacity: 0.55 })); fl.position.copy(sp.position).add(new THREE.Vector3(0, 0, 0.01)); fl.scale.set(0.95, 0.06, 1); g.add(fl); this.tail.push(fl);
        const l = new THREE.SpotLight('#ff2a18', 6, 10, 0.9, 1.0, 1.7); l.position.set(CX + sd * 0.6, 0.85, ZR + 0.05); l.target.position.set(CX + sd * 0.4, 0, ZR + 7); g.add(l, l.target);
      }
    }
    // ---------------------------------------------------------------- greenhouse: tumblehome sides (glass + black frames), windshield, roof
    {
      const gz = range(-1.16, 2.16, 0.02, [-1.06, 2.04, ZA1 - GAP, ZA1 + GAP, ZA2 - GAP, ZA2 + GAP, ZB1 - GAP, ZB1 + GAP, ZB2 - GAP, ZB2 + GAP]), gs = range(0, 1, 0.05);
      // virtual z -> real z on row s: [-1.16,-1.06] is the A-pillar band, [2.04,2.16] the D-pillar band
      const lerp = (a, b, t) => a + (b - a) * t;
      const gmap = (zv, s) => zv < -1.06 ? lerp(zA(s), zA(s) + 0.1, (zv + 1.16) / 0.1) : zv < 0.05 ? lerp(zA(s) + 0.1, 0.05, (zv + 1.06) / 1.11) : zv <= 0.95 ? zv : zv <= 2.04 ? lerp(0.95, zRg(s) - 0.12, (zv - 0.95) / 1.09) : lerp(zRg(s) - 0.12, zRg(s), (zv - 2.04) / 0.12);
      for (const sd of [-1, 1]) {
        const pos = (z0, s) => { const z = gmap(z0, s), yt = yT(z); return new THREE.Vector3(CX + sd * (Wz(z) - R + (WG - (Wz(z) - R)) * s), yt + (YROOF - yt) * s, z); };
        const kind = (z0, s) => { const z = gmap(z0, s); if (gapZ(z)) return null;
          if (s > 0.9) return 'white'; const frame = s < 0.07 || s > 0.84 || z0 < -1.06 || z0 > 2.1 || (z0 > 0.04 && z0 < 0.19) || (z0 > 0.8 && z0 < 0.97) || false; return frame ? 'black' : 'glass'; };
        const dn = (z) => z > ZA1 && z < ZA2 ? 'F' : z > ZB1 && z < ZB2 ? 'R' : null;
        add(grid(gz, gs, pos, (i, j, c, z, s) => dn(gmap(z, s)) ? null : kind(z, s), new THREE.Vector3(sd, 0.3, 0)));
        for (const d of this.doors.filter((q) => q.side === sd)) add(grid(gz, gs, pos, (i, j, c, z, s) => dn(gmap(z, s)) === d.name ? kind(z, s) : null, new THREE.Vector3(sd, 0.3, 0)), d.inner);
        // mirror on the front door: a rounded housing on a stalk
        const fd = this.doors.find((q) => q.side === sd && q.name === 'F');
        const mh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), M.black); mh.scale.set(0.45, 0.75, 1.1); mh.position.set(CX + sd * (HW + 0.13), 1.12, -0.98); fd.inner.add(mh);
        const ms = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 4, 8), M.black); ms.rotation.z = Math.PI / 2; ms.position.set(CX + sd * (HW + 0.05), 1.08, -1.0); fd.inner.add(ms);
      }
      // windshield (gently curved), black frit at its edges
      const wx = range(-1, 1, 0.05), ws = range(0, 1, 0.05);
      const wpos = (u, s) => { const yt = yT(-1.15), y = yt + (YROOF - yt) * s, half = (Wz(-1.15) - R - 0.04) + ((WG - 0.04) - (Wz(-1.15) - R - 0.04)) * s; return new THREE.Vector3(CX + u * half, y, zA(s) + 0.05 * u * u); };
      add(grid(wx, ws, wpos, (i, j, c, u, s) => (Math.abs(u) > 0.94 || s > 0.94) ? 'black' : 'shield', new THREE.Vector3(0, 0.6, -1)), g, 'windshield');
      // roof: crowned, with rounded edges rolling into the greenhouse sides
      const rz = range(zA(1) - 0.05, zRg(1) + 0.05, 0.02), ru = range(0, 1, 0.04);
      const rpos = (z0, u) => { const over = Math.max(0, zA(1) - z0, z0 - zRg(1)) / 0.05, z = Math.min(zRg(1) + 0.02 * over, Math.max(zA(1) - 0.02 * over, z0)), a = u * Math.PI; const side = Math.cos(a); // 1..-1 across
        const edge = Math.abs(side) > 0.92 ? (Math.abs(side) - 0.92) / 0.08 : 0, x = side * (WG - 0.03 * edge), y = YROOF + 0.05 * (1 - edge ** 2) * 0.9 + 0.02 * Math.sin(a); return new THREE.Vector3(CX + x * (1 - 0.02 * over), y - 0.06 * over * over, z); };
      add(grid(rz, ru, rpos, () => 'white', new THREE.Vector3(0, 1, 0)), g, 'roof');
    }
    // ---------------------------------------------------------------- roof accessories, each seated on the roof surface
    const roofY = (x) => { const side = Math.max(-1, Math.min(1, x / WG)), a = Math.acos(side), edge = Math.abs(side) > 0.92 ? (Math.abs(side) - 0.92) / 0.08 : 0; return YROOF + 0.05 * (1 - edge ** 2) * 0.9 + 0.02 * Math.sin(a); };
    {
      const bar = this.lightbar = new THREE.Group(); bar.position.set(CX, roofY(0) + 0.07, -0.25); g.add(bar);
      for (const dx of [-0.5, 0.5]) { const mt = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.04, 4, 8), M.black); mt.position.set(CX + dx, roofY(dx) + 0.035, -0.25); g.add(mt); }
      const base = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 1.25, 6, 16), M.black); base.rotation.z = Math.PI / 2; base.scale.set(1, 1, 1.4); bar.add(base);
      const cols = ['#c81a1a', '#c81a1a', '#e8e8f0', '#1a3ad0', '#1a3ad0', '#e8e8f0', '#c81a1a', '#1a3ad0'];
      cols.forEach((c, i) => { const lens = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.11, 4, 12), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.15, transmission: 0, clearcoat: 1, emissive: c, emissiveIntensity: 0.12 })); lens.rotation.z = Math.PI / 2; lens.position.set(-0.6 + i * 0.172, 0.035, 0); lens.scale.set(1, 1, 1.25); bar.add(lens); });
      for (const sd of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 1.9, 4, 12), M.black); rail.rotation.x = Math.PI / 2; rail.position.set(CX + sd * (WG - 0.14), roofY(WG - 0.14) + 0.06, 0.75); g.add(rail);
        for (const z of [-0.15, 1.65]) { const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.05, 4, 8), M.black); foot.position.set(CX + sd * (WG - 0.14), roofY(WG - 0.14) + 0.03, z); g.add(foot); }
      }
      // spoiler: a solid airfoil (profile in z/y) extruded across the car with bevels, bent to follow the roof crown
      { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.06, 0.035, 0.16, 0.05, 0.24, 0.02); sh.quadraticCurveTo(0.26, 0.008, 0.245, -0.008); sh.bezierCurveTo(0.16, 0.0, 0.07, -0.012, 0, -0.01); sh.closePath();
        const wgeo = new THREE.ExtrudeGeometry(sh, { depth: 2 * (WG - 0.06), bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.02, bevelSegments: 5, curveSegments: 16 });
        wgeo.translate(0, 0, -(WG - 0.06)); wgeo.rotateY(-Math.PI / 2);   // profile x -> car +z (rearward), extrusion -> across x
        const q = wgeo.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i); q.setY(i, q.getY(i) + roofY(x) - roofY(0)); } wgeo.computeVertexNormals();
        const wing = new THREE.Mesh(wgeo, M.white); wing.position.set(CX, roofY(0) - 0.004, zRg(1) - 0.17); wing.castShadow = wing.receiveShadow = true; g.add(wing); this.parts.spoiler = wing; }
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.6, 6), M.black); ant.position.set(CX + 0.3, roofY(0.3) + 0.3, 1.2); ant.rotation.x = 0.25; g.add(ant);
    }
    // ---------------------------------------------------------------- wheels: rounded-sidewall tyres with tread, black steel police wheels, chrome caps
    this.wheels = [];
    for (const [sd, z, front] of [[-1, AF, true], [1, AF, true], [-1, AR, false], [1, AR, false]]) {
      const steer = new THREE.Group(); steer.position.set(CX + sd * (HW - 0.155), WR, z); g.add(steer);
      const spin = makeWheel(sd, M); steer.add(spin); steer.add(spin.userData.caliper);
      spin.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      this.wheels.push({ steer, spin, front });
    }
    // underbody: a closed floor pan the length of the car, chassis rails, engine and gearbox, axles, differential, tank, exhaust
    {
      const U = new THREE.Group(); g.add(U); this.parts.underbody = U;
      const rb = (w, h, d, r, mat, x, y, z) => { const sh = new THREE.Shape(), a = -w / 2, b = -h / 2; sh.moveTo(a + r, b); sh.lineTo(a + w - r, b); sh.quadraticCurveTo(a + w, b, a + w, b + r); sh.lineTo(a + w, b + h - r); sh.quadraticCurveTo(a + w, b + h, a + w - r, b + h); sh.lineTo(a + r, b + h); sh.quadraticCurveTo(a, b + h, a, b + h - r); sh.lineTo(a, b + r); sh.quadraticCurveTo(a, b, a + r, b);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: r * 0.4, bevelThickness: r * 0.4, bevelSegments: 2, curveSegments: 4 }); geo.translate(0, 0, -d / 2); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; U.add(m); return m; };
      { const fs = new THREE.Shape(), hw = HW - 0.14, nw = HW - 0.43, z0 = -2.8, z1 = 2.2, wells = [AF, AR];   // top view: full width, narrowed at the wheel wells
        fs.moveTo(-hw, z0); for (const az of wells) { fs.lineTo(-hw, az - 0.5); fs.lineTo(-nw, az - 0.46); fs.lineTo(-nw, az + 0.46); fs.lineTo(-hw, az + 0.5); } fs.lineTo(-hw, z1); fs.lineTo(hw, z1);
        for (const az of [...wells].reverse()) { fs.lineTo(hw, az + 0.5); fs.lineTo(nw, az + 0.46); fs.lineTo(nw, az - 0.46); fs.lineTo(hw, az - 0.5); } fs.lineTo(hw, z0); fs.closePath();
        const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }); fg.rotateX(Math.PI / 2); const fl = new THREE.Mesh(fg, M.plastic); fl.position.set(CX, 0.33, 0); fl.castShadow = fl.receiveShadow = true; U.add(fl); }
      for (const sd of [-1, 1]) rb(0.09, 0.14, 4.9, 0.03, M.plastic, CX + sd * 0.55, 0.36, -0.3);   // frame rails
      for (const z of [-2.5, -1.4, 0.0, 1.6]) rb(1.2, 0.08, 0.08, 0.02, M.plastic, CX, 0.36, z);   // cross members
      rb(0.7, 0.5, 0.9, 0.08, M.plastic, CX, 0.62, -2.3);                                     // engine block in its bay
      rb(0.32, 0.25, 0.9, 0.06, M.plastic, CX, 0.42, -1.4);                                   // gearbox
      const tube = (r, len, x, y, z, rotz = Math.PI / 2) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), M.plastic); m.rotation.z = rotz; m.position.set(x, y, z); m.castShadow = true; U.add(m); return m; };
      tube(0.05, 2 * HW - 0.4, CX, WR, AF); tube(0.06, 2 * HW - 0.4, CX, WR, AR);            // axles
      const diff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), M.plastic); diff.scale.set(1, 0.85, 1); diff.position.set(CX, WR, AR); U.add(diff);
      const shaft = tube(0.035, AR - (-1.0), CX, 0.4, (AR - 1.0) / 2, 0); shaft.rotation.x = Math.PI / 2;
      rb(0.7, 0.2, 0.5, 0.06, M.plastic, CX + 0.25, 0.42, 1.78);                             // fuel tank behind the rear axle
      const ex = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(CX - 0.2, 0.35, -1.9), new THREE.Vector3(CX - 0.35, 0.3, -0.5), new THREE.Vector3(CX - 0.5, 0.3, 0.6), new THREE.Vector3(CX - 0.56, 0.31, 1.7), new THREE.Vector3(CX - 0.56, 0.33, ZR - 0.15)]), 40, 0.035, 10), M.chrome); ex.castShadow = true; U.add(ex);
      const muff = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 6, 12), M.plastic); muff.rotation.x = Math.PI / 2; muff.position.set(CX - 0.48, 0.32, 1.0); U.add(muff);
    }
    // named parts the scene uses
    this.parts.roof = this.parts['roof:white'];
  }
  update(dist, steer = 0, doorOpen = 0, tailgateOpen = 0, hoodOpen = 0) {
    for (const w of this.wheels) { w.spin.rotation.x = -dist / WR; if (w.front) w.steer.rotation.y = steer; }
    for (const d of this.doors) d.pivot.rotation.y = d.side * doorOpen * 1.1;
    this.tailgate.rotation.x = -tailgateOpen * 1.2; this.hood.rotation.x = hoodOpen * 0.9;
  }
}
function starShape(R1, R2) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R2 : R1; const x = Math.cos(a) * r, y = -Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; }
function wordTex() { return canvasTex(512, 112, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = 'italic 900 86px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#c9a23a'; x.strokeStyle = '#0d3a1e'; x.lineWidth = 6; x.strokeText('SHERIFF', w / 2, h / 2 + 4); x.fillText('SHERIFF', w / 2, h / 2 + 4); }); }
function plateTex() { return canvasTex(256, 66, (x, w, h) => { x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2a2a'; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#1a1a1a'; x.font = 'bold 42px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SO 1142', w / 2, h / 2 + 2); }); }
