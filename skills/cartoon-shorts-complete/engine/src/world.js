// The highway world for the rumble-strips episode: one straight two-lane road for miles, paved shoulder (damageable:
// rumble-strip grooves are real displaced cuts with fresh-cut colour and dust), dirt shoulder, guardrails that bend,
// grass verges, wheat fields to the horizon, power lines, a fence, far hills, and a sky that blends day -> night.
import * as THREE from 'three/webgpu';
import { makeGrass } from './grass.js';
import { texture, positionWorld, attribute, mix, float, vec2, uniform } from 'three/tsl';
import { asphalt, shoulder } from './surfaces.js';
import { ibeamGeo, rbox } from './geo.js';
export const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
export const canvasTex = (w, h, fn, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v; };
export const fbm = (x, y) => { let a = 0, f = 1, s = 0; for (let i = 0; i < 5; i++) { a += vnoise(x * f, y * f) / f; s += 1 / f; f *= 2; } return a / s; };
const sstep = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// layout across the road (x measured from the road centre line RC)
export const RC = -1.78, LANE = 4.3, EDGE = 6.0, SHW = 3.0, RAIL = EDGE + SHW + 0.15, Z0 = 400, ZEND = -4000, LEN = Z0 - ZEND;
export const GX = RC + LANE + 0.48, GHW = 0.2, GHL = 0.09, GDEPTH = 0.045, GSTEP = 0.305;   // groove centre x, half-width (across), half-length (along), depth, spacing
export const SUN_DAY = new THREE.Vector3(-0.45, 0.62, -0.64).normalize(), MOON_DIR = new THREE.Vector3(-0.2, 0.2, -1).normalize();

export function buildWorld(scene) {
  const W = { scene };
  // ---------------------------------------------------------------- skies: day dome + cumulus, night dome + moon + moonlit clouds, crossfaded by setTime
  const domeColors = (fn) => { const g = new THREE.SphereGeometry(6000, 64, 32), p = g.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const d = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const k = fn(d); c.push(k.r, k.g, k.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; };
  const nightDome = new THREE.Mesh(domeColors((d) => { const y = Math.max(0, d.y), top = new THREE.Color('#121726'), mid = new THREE.Color('#2c3854'), hor = new THREE.Color('#46557a'), glow = new THREE.Color('#56668a'); const k = y < 0.12 ? hor.clone().lerp(mid, y / 0.12) : mid.clone().lerp(top, Math.min(1, (y - 0.12) / 0.6)); return k.lerp(glow, Math.exp(-Math.pow(Math.acos(Math.min(1, d.dot(MOON_DIR))) / 0.3, 2)) * 0.7); }), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  nightDome.renderOrder = -3; scene.add(nightDome);
  const dayDome = new THREE.Mesh(domeColors((d) => { const y = Math.max(0, d.y), hor = new THREE.Color('#dce8f0'), low = new THREE.Color('#9cc4ec'), mid = new THREE.Color('#5c98e0'), top = new THREE.Color('#2a62c4'); return y < 0.05 ? hor.clone().lerp(low, y / 0.05) : y < 0.22 ? low.clone().lerp(mid, (y - 0.05) / 0.17) : mid.clone().lerp(top, Math.min(1, (y - 0.22) / 0.5)); }), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true }));
  dayDome.renderOrder = -2; scene.add(dayDome);
  const duskDome = new THREE.Mesh(domeColors((d) => { const y = Math.max(0, d.y), hor = new THREE.Color('#b9849e'), mid = new THREE.Color('#6e5c92'), top = new THREE.Color('#2a3466'); return y < 0.1 ? hor.clone().lerp(mid, y / 0.1) : mid.clone().lerp(top, Math.min(1, (y - 0.1) / 0.5)); }), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true }));
  duskDome.renderOrder = -1; scene.add(duskDome);
  // cumulus: puffy clouds from layered noise, white sunlit tops, soft grey undersides (as the day reference)
  const smooth01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  // cumulus: lumpy domed tops, flat bellies, warm-white lit tops, cool blue-grey undersides, inner shading from noise
  const cumulus = (seed, w = 512, h = 256) => canvasTex(w, h, (x) => {
    const img = x.createImageData(w, h), d = img.data, ox = seed * 11.3, oy = seed * 5.7, rr = rnd(seed * 7 + 1), bumps = [];
    for (let k = 0; k < 7; k++) { const cx = 0.28 + (k / 6) * 0.44 + (rr() - 0.5) * 0.06, mid = 1 - Math.abs(k - 3) / 3; bumps.push([cx, 0.08 + 0.1 * mid + rr() * 0.04, 0.68 - rr() * 0.05]); }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = i / w, v = j / h; let m = 0; for (const [cx, rad, by] of bumps) { const dx = (u - cx) / rad, dy = (v - by) / (rad * 1.7); if (v < by + 0.12) m = Math.max(m, 1 - Math.hypot(dx * 0.55, dy)); }
      const belly = 1 - smooth01((v - 0.6) / 0.14), n = fbm(u * 7 + ox, v * 5 + oy), n2 = fbm(u * 18 + oy, v * 12 + ox), a = Math.max(0, Math.min(1, (m * 1.5 + (n - 0.5) * 0.9 - 0.12) * 5)) * belly * smooth01((0.5 - Math.abs(u - 0.5)) * 7) * smooth01(v * 6);
      const lit = Math.min(1, Math.max(0, 1.15 - v * 1.45 + (n - 0.5) * 0.7 + (n2 - 0.5) * 0.25)), q = (j * w + i) * 4;
      d[q] = 120 + 135 * lit; d[q + 1] = 132 + 122 * lit; d[q + 2] = 156 + 96 * lit; d[q + 3] = a * 252; }
    x.putImageData(img, 0, 0); });
  W.dayClouds = new THREE.Group(); scene.add(W.dayClouds);
  { const r = rnd(41); for (let i = 0; i < 64; i++) { const a = r() * Math.PI * 2, el = 0.03 + Math.pow(r(), 1.6) * 0.42, d = 4200, dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); const sx = 700 + r() * 1300; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cumulus(i + 3), fog: false, depthWrite: false, transparent: true })); sp.position.copy(dir.multiplyScalar(d)); sp.scale.set(sx, sx * 0.5, 1); W.dayClouds.add(sp); } }
  // night: moon, halo, moonlit cloud banks (from the night-drive scene)
  W.nightSky = new THREE.Group(); scene.add(W.nightSky);
  {
    const moonTex = canvasTex(512, 512, (x) => { const r = rnd(2); const g2 = x.createRadialGradient(256, 256, 200, 256, 256, 236); g2.addColorStop(0, '#fbfbf6'); g2.addColorStop(1, 'rgba(251,251,246,0)'); x.fillStyle = g2; x.fillRect(0, 0, 512, 512); x.fillStyle = '#fbfbf6'; x.beginPath(); x.arc(256, 256, 204, 0, 7); x.fill();
      x.save(); x.beginPath(); x.arc(256, 256, 204, 0, 7); x.clip(); for (let i = 0; i < 22; i++) { const cx = 120 + r() * 280, cy = 120 + r() * 280, rr = 18 + r() * 60, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(176,184,198,0.35)'); gr.addColorStop(1, 'rgba(176,184,198,0)'); x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); } x.restore(); });
    const halo = (a0, sig) => canvasTex(512, 512, (x, w, h) => { const img = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const r2 = ((i - 256) ** 2 + (j - 256) ** 2) / (256 * 256), a = a0 * Math.exp(-r2 / (sig * sig)) * (1 - Math.min(1, r2) ** 4) + (hash(i, j) - 0.5) * 0.012, q = (j * w + i) * 4; img.data[q] = 200; img.data[q + 1] = 212; img.data[q + 2] = 240; img.data[q + 3] = Math.max(0, a) * 255; } x.putImageData(img, 0, 0); });
    const mp = MOON_DIR.clone().multiplyScalar(5200);
    for (const [tx, s] of [[halo(0.22, 0.32), 2200], [halo(0.28, 0.14), 900]]) { const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); hs.position.copy(mp); hs.scale.set(s, s, 1); W.nightSky.add(hs); }
    const ms = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true, toneMapped: false })); ms.position.copy(mp); ms.scale.set(330, 330, 1); W.nightSky.add(ms);
    const cloud = (seed, lit, w = 512, h = 256) => canvasTex(w, h, (x) => { const img = x.createImageData(w, h), d = img.data, ox = seed * 13.7, oy = seed * 7.1;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = i / w, v = j / h, edge = Math.min(1, Math.sin(Math.PI * u) * 1.3) * Math.min(1, Math.sin(Math.PI * v) * 1.5); const n = fbm(u * 5 + ox, v * 2.5 + oy), n2 = fbm(u * 14 + oy, v * 7 + ox); const a = Math.max(0, Math.min(1, (n * edge - 0.36 + n2 * 0.08) * 3.5)); const rim = Math.max(0, Math.min(1, (n * edge - 0.36) * 3.5)) * (1 - Math.max(0, Math.min(1, (n * edge - 0.42) * 4))); const top = Math.max(0, 0.55 - v) * 1.8;
        const q = (j * w + i) * 4; d[q] = 44 + 16 * n2 + 10 * top + lit * (24 * top + 60 * rim); d[q + 1] = 52 + 18 * n2 + 12 * top + lit * (28 * top + 66 * rim); d[q + 2] = 76 + 22 * n2 + 14 * top + lit * (34 * top + 76 * rim); d[q + 3] = a * 200; } x.putImageData(img, 0, 0); });
    const r = rnd(5); [[-0.24, 0.38, 1300], [-0.36, 0.3, 900], [-0.33, 0.03, 900], [0.0, 0.37, 1400], [0.24, 0.4, 1300], [0.06, 0.2, 1000], [0.28, 0.24, 1300], [0.2, 0.06, 1500], [-0.03, 0.05, 1100], [-0.12, 0.42, 1000], [0.6, 0.2, 1400], [-0.7, 0.25, 1400], [1.2, 0.15, 1600], [-1.3, 0.2, 1500]].forEach(([da, el, sx], i) => {
      const a = -Math.PI / 2 + da, d = 5000, dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), sy = sx * (0.26 + r() * 0.1), ang = Math.acos(Math.min(1, dir.dot(MOON_DIR))), half = Math.atan((sx * 0.5) / d);
      if (ang < half + 0.09) return; const lit = Math.max(0, 1 - ang / 1.0) ** 1.4 * 0.9 + 0.18;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud(20 + i, lit), fog: false, depthWrite: false, transparent: true, opacity: 0.85 })); sp.position.copy(dir.multiplyScalar(d)); sp.scale.set(sx, sy, 1); W.nightSky.add(sp); });
  }
  // ---------------------------------------------------------------- cloud shadows: soft patches over everything on the ground (by day)
  { const t = canvasTex(512, 512, (x, w, h) => { const img = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let n = 0, f = 1, sm = 0; for (let o = 0; o < 5; o++) { const p = (2 * Math.PI) / (512 / (2 * f)); n += (Math.sin(i * p + o * 1.7 + Math.sin(j * p * 0.7 + o)) * Math.cos(j * p + o * 2.3 + Math.cos(i * p * 0.6)) * 0.5 + 0.5) / f; sm += 1 / f; f *= 2; } const v = Math.max(0, Math.min(1, ((n / sm) - 0.55) * 6)); const q = (j * w + i) * 4; img.data[q] = img.data[q + 1] = img.data[q + 2] = 255 * v; img.data[q + 3] = 255; } x.putImageData(img, 0, 0); }, false);
    W.cloudK = uniform(1); W.cloudShadowAt = (xz) => float(1).sub(texture(t, xz.div(260).add(vec2(0.13, 0.37))).r.mul(0.5).mul(W.cloudK)); W.cloudShadow = W.cloudShadowAt(positionWorld.xz); }
  // ---------------------------------------------------------------- lights (set by setTime)
  W.sun = new THREE.DirectionalLight('#fff2dc', 3.0); W.sun.castShadow = true; W.sun.shadow.mapSize.set(4096, 4096); Object.assign(W.sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 400 }); W.sun.shadow.bias = -0.0004; W.sun.shadow.normalBias = 0.02; scene.add(W.sun, W.sun.target);
  W.hemi = new THREE.HemisphereLight('#bcd4f0', '#6a6040', 1.2); scene.add(W.hemi);
  scene.fog = new THREE.FogExp2(new THREE.Color('#dfe7ee'), 0.0012);
  W.envDay = canvasTex(1024, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3f7fd2'); g.addColorStop(0.46, '#e8f0f6'); g.addColorStop(0.52, '#9a9064'); g.addColorStop(1, '#4a4632'); x.fillStyle = g; x.fillRect(0, 0, w, h); const u = (Math.atan2(SUN_DAY.x, -SUN_DAY.z) / (Math.PI * 2) + 0.5) * w, v = (0.5 - Math.asin(SUN_DAY.y) / Math.PI) * h, gr = x.createRadialGradient(u, v, 2, u, v, 60); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gr; x.fillRect(u - 60, v - 60, 120, 120); });
  W.envNight = canvasTex(1024, 512, (x, w, h) => { for (let j = 0; j < h; j++) { const el = (0.5 - j / h) * Math.PI; const col = el > 0 ? new THREE.Color('#56678a').lerp(new THREE.Color('#121726'), Math.min(1, el / 1.1)) : new THREE.Color('#2a2e36').lerp(new THREE.Color('#0c0d10'), Math.min(1, -el * 2)); x.fillStyle = '#' + col.getHexString(); x.fillRect(0, j, w, 1); } const u = (Math.atan2(MOON_DIR.x, -MOON_DIR.z) / (Math.PI * 2) + 0.5) * w, v = (0.5 - Math.asin(MOON_DIR.y) / Math.PI) * h, gr = x.createRadialGradient(u, v, 2, u, v, 90); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.1, 'rgba(220,230,255,0.9)'); gr.addColorStop(1, 'rgba(120,140,200,0)'); x.fillStyle = gr; x.fillRect(u - 90, v - 90, 180, 180); });
  for (const t of [W.envDay, W.envNight]) t.mapping = THREE.EquirectangularReflectionMapping;
  // ---------------------------------------------------------------- terrain: road corridor flat, verges green, wheat fields in strips to the horizon, low hills far off
  {
    const N = 460, size = 16000, geo = new THREE.PlaneGeometry(size, size, N, N); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = [], c = new THREE.Color();
    const GREEN = new THREE.Color('#3c6a22'), GOLD = new THREE.Color('#d9a740'), PALE = new THREE.Color('#e6cf86'), OLIVE = new THREE.Color('#9aa63e'), BROWN = new THREE.Color('#c8964c');
    // strips: per side a run of long fields parallel to the road, each its own wheat tone; edges blend over ~8 m
    const PAL = [new THREE.Color('#d6a844'), new THREE.Color('#c99a3c'), new THREE.Color('#dcb658'), new THREE.Color('#c4a24a'), new THREE.Color('#b9a048'), new THREE.Color('#d2ac50'), new THREE.Color('#a8a446')];
    const strips = {}; for (const sd of [-1, 1]) { const rr = rnd(sd > 0 ? 71 : 33), e = []; let x0 = RAIL + 10; while (x0 < 9000) { const w = 50 + rr() * 140; e.push([x0, x0 + w, PAL[Math.floor(rr() * PAL.length)]]); x0 += w; } strips[sd] = e; }
    const fieldCol = (x, z) => { const ax = Math.abs(x - RC), sd = x > RC ? 1 : -1; if (ax < RAIL + 10) return GREEN.clone(); const e = strips[sd]; let i = 0; while (i < e.length - 1 && ax > e[i][1]) i++;
      const [a0, a1, col] = e[i], c0 = col.clone(); const nb = ax - a0 < 8 && i > 0 ? e[i - 1][2] : a1 - ax < 8 && i < e.length - 1 ? e[i + 1][2] : null; if (nb) { const k = 0.5 - 0.5 * Math.min(ax - a0, a1 - ax) / 8; c0.lerp(nb, k); } return c0; };
    const rowk = [];
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) / (size / 2), z = p.getZ(i) / (size / 2); x = Math.sign(x) * Math.pow(Math.abs(x), 2.2) * size / 2; z = Math.sign(z) * Math.pow(Math.abs(z), 2.2) * size / 2;
      const dx = Math.abs(x - RC), far = sstep(900, 4000, Math.max(dx, -z * 0.35)) * sstep(RAIL + 150, RAIL + 900, dx), h = far * Math.max(0, fbm(x * 0.0007, z * 0.0007) * 180 - 50) + (1 - far) * (fbm(x * 0.05, z * 0.05) - 0.5) * 0.2 * sstep(RAIL + 1, RAIL + 4, dx) - 0.06;
      p.setXYZ(i, x, h, z);
      const n = fbm(x * 0.004 + 7, z * 0.0015); c.copy(fieldCol(x, z)).multiplyScalar(0.92 + n * 0.16); col.push(c.r, c.g, c.b); rowk.push(sstep(RAIL + 9, RAIL + 11, Math.abs(x - RC)));
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('rowk', new THREE.Float32BufferAttribute(rowk, 1)); geo.computeVertexNormals();
    // crop rows: stripes running along the road (u across x), with soil showing between rows
    // one crop row per texture tile: a soft dark furrow between bright stalk rows, sampled in world space (2.4 m rows)
    const rows = canvasTex(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.36, '#f4efe4'); g.addColorStop(0.5, '#8a7a62'); g.addColorStop(0.64, '#f4efe4'); g.addColorStop(1, '#ffffff'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const tm = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95 });
    tm.colorNode = attribute('color').mul(mix(float(1), texture(rows, vec2(positionWorld.x.div(2.4), positionWorld.z.div(40))).r.mul(0.5).add(0.55), attribute('rowk'))).mul(W.cloudShadow);
    W.terrain = new THREE.Mesh(geo, tm); W.terrain.receiveShadow = true; scene.add(W.terrain);
  }
  // ---------------------------------------------------------------- road surface (lanes and left shoulder), the right paved shoulder is the damageable strip
  W.roadMat = (() => { const A = asphalt(LEN); const m = new THREE.MeshStandardNodeMaterial({ ...A, normalScale: new THREE.Vector2(1.2, 1.2) }); m.colorNode = texture(A.map).mul(W.cloudShadow); m.roughnessNode = float(0.9); return m; })();   // dry road: no glossy patches
  const xL = RC - EDGE, xR = RC + EDGE, w0 = xR - xL;
  const roadUV = (geo) => { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - xL) / w0, (Z0 - p.getZ(i)) / LEN); uv.needsUpdate = true; };
  const flat = (x0, x1, z0, z1, mat, y = 0) => { const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); roadUV(g); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m; };
  flat(xL, GX - GHW - 0.05, Z0, ZEND, W.roadMat);
  flat(GX + GHW + 0.05, xR, Z0, ZEND, W.roadMat);
  const lineTex = canvasTex(64, 512, (x, w, h) => { const r = rnd(8); x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${0.35 * r()})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } }); lineTex.repeat.set(1, LEN / 3);
  for (const [x, w, col] of [[-0.1, 0.11, '#d9a52e'], [0.1, 0.11, '#d9a52e'], [-LANE + 0.1, 0.14, '#e6e6e0'], [LANE - 0.1, 0.14, '#e6e6e0']]) { const g = new THREE.PlaneGeometry(w, LEN); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, map: lineTex, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(RC + x, 0.004, (Z0 + ZEND) / 2); m.receiveShadow = true; scene.add(m); }
  // dirt shoulders
  { const S = shoulder(LEN, SHW); for (const s of [-1, 1]) { const SW = SHW + 0.3, g = new THREE.PlaneGeometry(SW, LEN, 13, 2000), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), u = x / SW + 0.5, di = s > 0 ? x + SW / 2 : SW / 2 - x; q.setZ(i, di < 0.32 ? -0.03 : (fbm(x * 3 + s * 9, y * 0.8) - 0.5) * 0.04 - Math.max(0, (s > 0 ? u : 1 - u) - 0.85) * 0.15); } g.computeVertexNormals(); const mat = new THREE.MeshStandardMaterial({ map: S.map, normalMap: S.normalMap, roughnessMap: S.roughnessMap, normalScale: new THREE.Vector2(1.6, 1.6), color: '#ffffff' }); const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(RC + s * (EDGE - 0.3 + (SHW + 0.3) / 2), -0.01, (Z0 + ZEND) / 2); m.receiveShadow = true; scene.add(m); } }
  // ---------------------------------------------------------------- the groove strip (right paved shoulder band): grooves[] = {z, p (0..1 cut progress), fresh (0..1 dust)}
  W.grooves = []; W.grooveMat = new THREE.MeshStandardNodeMaterial({ map: W.roadMat.map, normalMap: W.roadMat.normalMap, roughnessMap: W.roadMat.roughnessMap, normalScale: new THREE.Vector2(1.2, 1.2) }); W.grooveMat.colorNode = texture(W.roadMat.map).mul(attribute('color')).mul(W.cloudShadow);
  const gx0 = GX - GHW - 0.07, gx1 = GX + GHW + 0.07;   // overlaps the road planes by 2 cm so no seam shows
  W.stripPlain = null;
  const grooveTex = canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#4a4c52'; x.fillRect(0, 0, w, h); const gy = h * 0.5, gh = h * (2 * GHL / GSTEP); const g = x.createLinearGradient(0, gy - gh / 2, 0, gy + gh / 2); g.addColorStop(0, '#2a2b2e'); g.addColorStop(0.25, '#8e8a82'); g.addColorStop(0.75, '#a29e95'); g.addColorStop(1, '#3a3b3e'); x.fillStyle = g; x.fillRect(w * 0.13, gy - gh / 2, w * 0.74, gh); });
  { const zq = positionWorld.z.div(GSTEP), fz = zq.sub(zq.floor()).sub(0.5).abs().mul(GSTEP), fx = positionWorld.x.sub(GX).abs(); const pocket = float(1).sub(fz.sub(GHL).div(0.01).clamp(0, 1)).mul(float(1).sub(fx.sub(GHW).div(0.015).clamp(0, 1)));
    W.stripFarMat = new THREE.MeshStandardNodeMaterial({ map: W.roadMat.map, roughnessMap: W.roadMat.roughnessMap, normalMap: W.roadMat.normalMap }); W.stripFarMat.colorNode = texture(W.roadMat.map).mul(mix(float(1), float(0.42), pocket)).mul(W.cloudShadow); }
  W.stripFar = null; W.stripNear = null;
  const groovesInRange = (z0, z1) => W.grooves.filter((g) => g.z <= z0 + 0.3 && g.z >= z1 - 0.3);
  // depth field of one groove (milled scallop): d(dx across, dz along) with chipped rough edges
  // every groove its own shape: hash of its z gives offset, size, rotation, depth; edges chipped by noise; saw-cut
  // profile: near-vertical walls, a flat floor that rises in an arc toward the ends (the blade's plunge)
  const gh = (z, k) => { const v = Math.sin(z * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  const gParams = (g) => g._p || (g._p = { ox: (gh(g.z, 1) - 0.5) * 0.07, w: GHW * (0.82 + 0.3 * gh(g.z, 2)), l: GHL * (0.8 + 0.5 * gh(g.z, 3)), rot: (gh(g.z, 4) - 0.5) * 0.12, d: GDEPTH * (0.78 + 0.45 * gh(g.z, 5)), oz: (gh(g.z, 6) - 0.5) * 0.05 });
  const grooveDepth = (dx, dz, g) => { const P = gParams(g), c = Math.cos(P.rot), sn = Math.sin(P.rot), x0 = dx - P.ox, z0 = dz - P.oz, lx = c * x0 + sn * z0, lz = -sn * x0 + c * z0;
    const hl = P.l * Math.max(0.15, g.p), chip = 0.016 * (vnoise(lx * 70 + g.z * 9, lz * 70) - 0.5) * 2 + 0.008 * (vnoise(lx * 220, lz * 220 + g.z) - 0.5);
    const ax = Math.abs(lx) - (P.w + chip), az = Math.abs(lz) - (hl + chip * 0.8); if (ax > 0 || az > 0) return 0;
    const wall = sstep(0, 0.007, -az) * sstep(0, 0.012, -ax), ends = Math.sqrt(Math.max(0, 1 - (lx / (P.w + 0.02)) ** 6));
    return P.d * g.p * wall * (0.7 + 0.3 * ends) * (0.9 + 0.2 * vnoise(lx * 40, lz * 40 + g.z)); };
  W.setStripWindow = (z0, z1, res = 0.008) => {
    if (W.stripNear) { scene.remove(W.stripNear); W.stripNear.geometry.dispose(); }
    const nz = Math.round((z0 - z1) / res), nx = Math.round((gx1 - gx0) / 0.01), g = new THREE.PlaneGeometry(gx1 - gx0, z0 - z1, nx, nz); g.rotateX(-Math.PI / 2); g.translate((gx0 + gx1) / 2, 0.0015, (z0 + z1) / 2); roadUV(g);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), list = groovesInRange(z0, z1);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), dx = x - GX; let d = 0, inGroove = 0, dust = 0;
      for (const gr of list) { const dz = z - gr.z; if (Math.abs(dz) > 0.5) continue; const dd = grooveDepth(dx, dz, gr); if (dd > 0) { d = Math.max(d, dd); inGroove = 1; } dust = Math.max(dust, gr.fresh * Math.exp(-((Math.max(0, Math.abs(dx) - GHW)) ** 2 / 0.02 + (Math.max(0, Math.abs(dz) - GHL)) ** 2 / 0.05)) * (0.6 + 0.4 * vnoise(x * 40, z * 40))); }
      p.setY(i, 0.0015 - d + dust * 0.002);
      const dn = d / GDEPTH, fresh = inGroove ? (dn > 0.7 ? 1.35 + 0.3 * vnoise(x * 90, z * 90) : 0.35 + 0.8 * dn) : 1.0, dk = 1 + dust * 0.6;   // bright fresh-cut floor, dark shadowed walls
      col[i * 3] = fresh * dk * 1.02; col[i * 3 + 1] = fresh * dk; col[i * 3 + 2] = fresh * dk * 0.95;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    W.stripNear = new THREE.Mesh(g, W.grooveMat); W.stripNear.receiveShadow = true; scene.add(W.stripNear);
    // far grooves beyond the window: a patterned band along the grooved length
    if (W.stripFar) { scene.remove(W.stripFar); W.stripFar = null; }
    if (W.grooves.length) { const zs = W.grooves.map((g) => g.z), zt = Math.max(...zs) + GHL, zb = Math.min(...zs) - GHL; const parts = [];
      if (zt > z0) parts.push([zt, Math.max(zb, z0)]); if (zb < z1) parts.push([Math.min(zt, z1), zb]);
      W.stripFar = new THREE.Group(); for (const [a, b] of parts) { if (a - b < 0.1) continue; const fg = new THREE.PlaneGeometry(gx1 - gx0, a - b); fg.rotateX(-Math.PI / 2); fg.translate(GX, 0.0015, (a + b) / 2); roadUV(fg); const m = new THREE.Mesh(fg, W.stripFarMat); m.receiveShadow = true; W.stripFar.add(m); } scene.add(W.stripFar); }
    // plain asphalt on the strip wherever there is neither the window nor grooves
    if (W.stripPlain) { scene.remove(W.stripPlain); W.stripPlain = null; }
    W.stripPlain = new THREE.Group(); scene.add(W.stripPlain);
    const cov = [[z0, z1]]; if (W.grooves.length) { const zs = W.grooves.map((g) => g.z); cov.push([Math.max(...zs) + GHL, Math.min(...zs) - GHL]); }
    cov.sort((a, b) => b[0] - a[0]); let top = Z0; const gaps = [];
    for (const [a, b] of cov) { if (a < top) gaps.push([top, Math.max(a, ZEND)]); top = Math.min(top, b); } if (top > ZEND) gaps.push([top, ZEND]);
    for (const [a, b] of gaps) if (a - b > 0.01) W.stripPlain.add(flat(gx0, gx1, a, b, W.roadMat, 0.0005));
  };
  W.cutGrooves = (zFrom, zTo, opts = {}) => { for (let z = (Math.floor(zFrom / GSTEP) + 0.5) * GSTEP; z >= zTo; z -= GSTEP) W.grooves.push({ z, p: 1, fresh: opts.fresh ?? 0 }); };
  // ---------------------------------------------------------------- guardrails: W-beam swept along z with fine sampling; dents bend the beam outward/down, tilt posts, scrape the paint
  const steel = canvasTex(512, 128, (x, w, h) => { const r = rnd(31); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a9098'); g.addColorStop(0.3, '#b8bcc2'); g.addColorStop(0.5, '#6c727a'); g.addColorStop(0.7, '#b4b8be'); g.addColorStop(1, '#7a8088'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '50,54,60' : '225,228,232'},${0.16 * r()})`; x.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4); } for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(110,64,36,${0.25 * r()})`; x.beginPath(); x.ellipse(r() * w, h * (0.55 + r() * 0.45), 2 + r() * 9, 1 + r() * 3, 0, 0, 7); x.fill(); } x.fillStyle = 'rgba(25,25,28,0.85)'; for (const u of [0, 256]) for (const v of [0.35, 0.65]) { x.beginPath(); x.arc(u + 20, h * v, 4, 0, 7); x.fill(); } });
  const railMat = new THREE.MeshStandardMaterial({ map: steel, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide, vertexColors: true });
  const postMat = new THREE.MeshStandardMaterial({ color: '#6c7178', metalness: 0.6, roughness: 0.55 }), refMat = new THREE.MeshStandardMaterial({ color: '#ffc850', emissive: '#ffb030', emissiveIntensity: 0.1, roughness: 0.3 });
  const prof = [[0, 0], [0.05, 0.03], [0.07, 0.08], [0.04, 0.155], [0.07, 0.23], [0.05, 0.28], [0, 0.31]];
  W.rails = {};
  for (const s of [-1, 1]) {
    const zs = []; for (let z = Z0; z > -400; z -= 0.2) zs.push(z); for (let z = -400; z >= ZEND; z -= 4) zs.push(z);
    const pos = new Float32Array(zs.length * prof.length * 3), uv = [], col = new Float32Array(zs.length * prof.length * 3).fill(1), idx = [];
    zs.forEach((z, i) => prof.forEach(([dx, y], j) => uv.push((Z0 - z) / 8, j / (prof.length - 1))));
    for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < prof.length - 1; j++) { const a = i * prof.length + j, b = a + prof.length; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const rail = new THREE.Mesh(geo, railMat); rail.castShadow = rail.receiveShadow = true; rail.frustumCulled = false; scene.add(rail);
    const postZ = []; for (let z = Z0 - 2; z > ZEND; z -= 3.81) postZ.push(z);
    const pg = ibeamGeo(0.85, 0.15, 0.1); pg.translate(0, -0.425, 0); const posts = new THREE.InstancedMesh(pg, postMat, postZ.length), refl = new THREE.InstancedMesh(rbox(0.02, 0.07, 0.09, 0.008), refMat, postZ.length); posts.castShadow = true; scene.add(posts, refl);
    W.rails[s] = { zs, geo, posts, refl, postZ, dents: [] };
  }
  // dent = { z (impact centre), len (half length), out (outward push m), drop (m), twist }
  W.rebuildRails = () => {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const s of [-1, 1]) {
      const R = W.rails[s], p = R.geo.attributes.position.array, c = R.geo.attributes.color.array;
      const def = (z) => { let o = 0, dr = 0, tw = 0, sc = 0; for (const d of R.dents) { const u = (z - d.z) / d.len; if (Math.abs(u) > 2.2) continue; const k = Math.exp(-u * u * 1.6) * (1 + 0.18 * Math.sin(u * 9 + d.z)); o += d.out * k; dr += d.drop * k; tw += (d.twist || 0) * k; sc = Math.max(sc, Math.exp(-u * u * 0.8)); } return [o, dr, tw, sc]; };
      R.zs.forEach((z, i) => { const [o, dr, tw, sc] = def(z); prof.forEach(([dx, y], j) => { const k = (i * prof.length + j) * 3, yy = 0.46 + y, crumple = tw * (y - 0.155); p[k] = RC + s * (RAIL + 0.08 - dx + o + crumple); p[k + 1] = yy - dr * (0.6 + y); p[k + 2] = z; const sh = 1 - 0.45 * sc * (0.5 + 0.5 * Math.sin(z * 40 + j)); c[k] = sh; c[k + 1] = sh * 0.97; c[k + 2] = sh * 0.94; }); });
      R.geo.attributes.position.needsUpdate = true; R.geo.attributes.color.needsUpdate = true; R.geo.computeVertexNormals();
      R.postZ.forEach((z, i) => { const [o, dr] = def(z), tilt = Math.min(0.9, o * 1.6); q.setFromEuler(new THREE.Euler(0, 0, -s * tilt)); M.compose(new THREE.Vector3(RC + s * (RAIL + 0.22 + o * 0.5), 0.38 - dr * 0.4, z), q, new THREE.Vector3(1, 1, 1)); R.posts.setMatrixAt(i, M); M.compose(new THREE.Vector3(RC + s * (RAIL - 0.02 + o), 0.62 - dr, z), q, new THREE.Vector3(1, 1, 1)); R.refl.setMatrixAt(i, M); });
      R.posts.instanceMatrix.needsUpdate = true; R.refl.instanceMatrix.needsUpdate = true;
    }
  };
  W.rebuildRails();
  // ---------------------------------------------------------------- power lines (left), wire fence (right), grass verges, wheat edges
  { const X = RC - RAIL - 9, wood = new THREE.MeshStandardMaterial({ color: '#4c3e30', roughness: 0.9 }), ins = new THREE.MeshStandardMaterial({ color: '#8a9aa8', roughness: 0.4 }), wire = new THREE.MeshBasicMaterial({ color: '#1a1d24' });
    const span = 48, tops = []; for (let z = Z0 - 10; z > ZEND + 200; z -= span) { const g = new THREE.Group(); g.position.set(X, 0, z); scene.add(g); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 9.2, 10), wood); pole.position.y = 4.6; pole.castShadow = true; g.add(pole); const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), wood); arm.position.y = 8.6; g.add(arm); for (const ax of [-1.0, 0, 1.0]) { const i2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8), ins); i2.position.set(ax, 8.75, 0); g.add(i2); } tops.push(z); }
    for (const ax of [-1.0, 0, 1.0]) for (let i = 0; i < tops.length - 1; i++) { const a = new THREE.Vector3(X + ax, 8.83, tops[i]), b = new THREE.Vector3(X + ax, 8.83, tops[i + 1]), pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 1.1; pts.push(p); } scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 4), wire)); } }
  { const X = RC + RAIL + 11, M = new THREE.Matrix4(), r = rnd(21), n = Math.floor((Z0 - ZEND) / 3.6), posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.07, 1.25, 7), new THREE.MeshStandardMaterial({ color: '#5a4a38', roughness: 0.9 }), n);
    for (let i = 0; i < n; i++) { const e = new THREE.Euler((r() - 0.5) * 0.06, r() * 3, (r() - 0.5) * 0.06); M.compose(new THREE.Vector3(X + (r() - 0.5) * 0.12, 0.58, Z0 - i * 3.6), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)); posts.setMatrixAt(i, M); } posts.castShadow = true; scene.add(posts);
    for (const h of [0.45, 0.78, 1.08]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, LEN), new THREE.MeshBasicMaterial({ color: '#2a2a2e' })); w.rotation.x = Math.PI / 2; w.position.set(X, h, (Z0 + ZEND) / 2); scene.add(w); } }
  {
    const r = rnd(23), grass = [], wheat = [];
    const zones = [[60, -120, 150], [-120, -320, 45], [-320, -800, 12], [-800, -1600, 4], [-1600, -3990, 1.6], [Z0, 60, 30]];
    for (const s of [-1, 1]) for (const [za, zb, dens] of zones) {
      const x0 = RAIL - 0.35, x1 = RAIL + 10, count = Math.round((za - zb) * (x1 - x0) * dens);
      for (let i = 0; i < count; i++) { const xx = x0 + Math.pow(r(), 1.2) * (x1 - x0), z = zb + r() * (za - zb), X = RC + s * xx, clump = vnoise(X * 0.6, z * 0.6), edge = sstep(RAIL - 0.35, RAIL + 0.6, xx), far = sstep(-300, -3000, z); grass.push(X, 0, z, (0.22 + 0.36 * clump + (r() - 0.4) * 0.16) * (0.5 + 0.5 * edge) * (1 + far * 2.5), r() * 6.28, 0.05 + r() * 0.37, (0.012 + r() * 0.016) * (1 + far * 9), r()); }
      // wheat: tall golden stalks beyond the verge
      const wx0 = RAIL + 10.3, wx1 = RAIL + 40, wcount = Math.round((za - zb) * (wx1 - wx0) * dens * 0.55);
      for (let i = 0; i < wcount; i++) { const xx = wx0 + Math.pow(r(), 1.4) * (wx1 - wx0), z = zb + r() * (za - zb), far = sstep(-300, -1400, z); wheat.push(RC + s * xx, 0, z, (0.7 + r() * 0.25) * (1 + far), r() * 6.28, 0.02 + r() * 0.12, (0.01 + r() * 0.008) * (1 + far * 4), r()); }
    }
    for (const s of [-1, 1]) for (let i = 0; i < 50000; i++) { const z = 60 - Math.pow(r(), 1.5) * 380, xx = RAIL - 0.35 - Math.pow(r(), 2) * 0.8; grass.push(RC + s * xx, 0, z, 0.08 + r() * 0.2, r() * 6.28, 0.1 + r() * 0.4, 0.01 + r() * 0.012, r()); }
    W.grass = makeGrass(new Float32Array(grass), { tint: 1.0, desat: 0.15, colors: { lo: [0.02, 0.05, 0.012], mid: [0.08, 0.22, 0.04], tip: [0.22, 0.4, 0.08] }, shadeAt: W.cloudShadowAt }); scene.add(W.grass);
    W.wheat = makeGrass(new Float32Array(wheat), { tint: 1.0, desat: 0.0, wind: 0.05, colors: { lo: [0.32, 0.24, 0.1], mid: [0.62, 0.48, 0.2], tip: [0.88, 0.74, 0.4] }, shadeAt: W.cloudShadowAt }); scene.add(W.wheat);
  }
  // ---------------------------------------------------------------- time of day: 0 day, 0.5 dusk, 1 night
  W.setTime = (k, renderer) => {
    const day = 1 - sstep(0.35, 0.75, k), dusk = Math.max(0, 1 - Math.abs(k - 0.5) / 0.3), night = sstep(0.55, 0.95, k);
    dayDome.material.opacity = day; duskDome.material.opacity = dusk * (1 - day * 0.2); const cTint = new THREE.Color('#ffffff').lerp(new THREE.Color('#e9a9b2'), dusk).lerp(new THREE.Color('#5a6688'), night); W.dayClouds.children.forEach((c) => { c.material.opacity = day; c.material.color.copy(cTint); }); W.nightSky.children.forEach((c) => (c.material.opacity = night * (c.userData.op ?? 1)));
    W.dayClouds.visible = day > 0.01; W.nightSky.visible = night > 0.01;
    const sunDir = SUN_DAY.clone().lerp(new THREE.Vector3(-0.8, 0.12, -0.6).normalize(), sstep(0, 0.6, k)).normalize();
    const lightDir = night > 0.5 ? MOON_DIR : sunDir;
    W.sun.color.set('#fff2dc').lerp(new THREE.Color('#ffa868'), dusk).lerp(new THREE.Color('#b8c6ff'), night);
    W.sun.intensity = 3.2 * day + 2.0 * dusk + 1.1 * night;
    W.sunDir = lightDir.clone();
    W.hemi.color.set('#bcd4f0').lerp(new THREE.Color('#d0a088'), dusk).lerp(new THREE.Color('#6c7ca4'), night); W.hemi.groundColor.set('#6a6040').lerp(new THREE.Color('#3a4034'), night); W.hemi.intensity = 1.25 * day + 1.0 * dusk + 2.3 * night;
    scene.fog.color.set('#d4e2ee').lerp(new THREE.Color('#8e7298'), dusk).lerp(new THREE.Color('#46557a'), night); W.cloudK.value = day; scene.fog.density = 0.00045 + 0.0028 * night;
    scene.environment = night > 0.5 ? W.envNight : W.envDay; scene.environmentIntensity = 0.9 * (1 - night) + 0.6 * night;
    W.timeK = k;
  };
  W.placeLight = (focus) => { const d = W.sunDir || SUN_DAY; W.sun.target.position.copy(focus); W.sun.position.copy(focus).addScaledVector(d, 150); W.sun.target.updateMatrixWorld(); };
  return W;
}
