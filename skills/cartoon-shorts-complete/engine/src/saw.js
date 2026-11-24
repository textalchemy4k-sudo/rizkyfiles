// A petrol cut-off saw (14" / 350 mm diamond blade), after the reference grid (STIHL TS 420 / Hilti DSH 900 class).
// Real proportions: ~0.86 m long with blade, 0.43 m tall at the loop handle, 0.245 m wide, blade 0.35 m.
// Everything is curved and parametric: housings are superellipsoids sheared/tapered like moulded plastic, handles
// are bent tubes, the blade core is a laser-cut disc with real gullet slots and cooling holes, segments are bevelled
// solids, flanges/knobs are lathed. Every moving part is its own node:
//   blade (spins), guard (rotates about the arbor), trigger + interlock (pivot), starter grip + rope (pulls out),
//   choke knob, decompression button. Grip points for any character's hands: saw.grips.rear / saw.grips.front.
// Saw frame: +z forward (toward the blade), +y up, +x right; origin on the ground under the engine.
import * as THREE from 'three/webgpu';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const sgnPow = (c, e) => Math.sign(c) * Math.abs(c) ** e;
// parametric surface -> geometry (us x vs grid)
function surf(us, vs, pos) {
  const P = [], uv = [], idx = [];
  us.forEach((u, i) => vs.forEach((v, j) => { const p = pos(u, v); P.push(p.x, p.y, p.z); uv.push(i / (us.length - 1), j / (vs.length - 1)); }));
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) { const a = i * vs.length + j, b = a + vs.length; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const lin = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
// a moulded shell: superellipsoid with roundness e, then shaped by a deform(p) function (shear, taper, flats)
function shell(r, e = 0.45, deform = null, seg = [40, 64]) {
  const geo = surf(lin(-Math.PI / 2, Math.PI / 2, seg[0]), lin(-Math.PI, Math.PI, seg[1]), (u, v) => {
    const cu = Math.cos(u), su = Math.sin(u);
    const p = V(r[0] * sgnPow(cu, e) * sgnPow(Math.cos(v), e), r[1] * sgnPow(su, e), r[2] * sgnPow(cu, e) * sgnPow(Math.sin(v), e));
    return deform ? deform(p) : p;
  });
  return geo;
}
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function tube(points, r, seg = 80, rad = 16, closed = false) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => V(...p)), closed, 'centripetal'), seg, r, rad, closed); }
// a rubber sleeve on a handle: a tube over part of the path with rounded collars at both ends (no raw cut edges)
function sleeve(add, points, r, mat, parent) { const c = new THREE.CatmullRomCurve3(points.map((p) => V(...p)), false, 'centripetal'); add(null, new THREE.TubeGeometry(c, 60, r, 20, false), mat, parent); for (const t of [0, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.002, 0.0035, 10, 28), mat); ring.position.copy(c.getPointAt(t)); ring.lookAt(c.getPointAt(t).add(c.getTangentAt(t))); ring.castShadow = true; parent.add(ring); } }
function canvasTex(w, h, fn, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
// height-field -> normal map
function normalTex(N, heightFn, strength, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N), h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] = heightFn(x, y);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const q = (y * N + x) * 4, hx = h[y * N + (x + 1) % N] - h[y * N + (x - 1 + N) % N], hy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x], nx = -hx * strength, ny = hy * strength, l = Math.hypot(nx, ny, 1); img.data[q] = (nx / l * 0.5 + 0.5) * 255; img.data[q + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[q + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[q + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); return t;
}

export class CutoffSaw {
  constructor(envMap) {
    const g = this.group = new THREE.Group(); this.parts = {};
    const r = rnd(9);
    const grainVals = new Float32Array(128 * 128).map(() => r());
    const grain = normalTex(128, (x, y) => grainVals[y * 128 + x] * 0.6, 0.9, 6);                  // moulded-plastic stipple
    const knurl = normalTex(128, (x, y) => Math.sin(x / 128 * Math.PI * 24) * Math.sin(y / 128 * Math.PI * 24), 1.2, 4);   // rubber grip diamonds
    const cast = normalTex(128, (x, y) => grainVals[((y * 3) % 128) * 128 + ((x * 3) % 128)] * 0.4, 1.0, 3);   // cast aluminium
    const M = this.M = {
      orange: new THREE.MeshPhysicalMaterial({ color: '#f2661a', roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.18, normalMap: grain, normalScale: new THREE.Vector2(0.25, 0.25), envMap, envMapIntensity: 0.9 }),
      white: new THREE.MeshPhysicalMaterial({ color: '#ecebe5', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.2, normalMap: grain, normalScale: new THREE.Vector2(0.25, 0.25), envMap, envMapIntensity: 0.8 }),
      grey: new THREE.MeshPhysicalMaterial({ color: '#5c5f66', roughness: 0.45, clearcoat: 0.3, normalMap: grain, normalScale: new THREE.Vector2(0.3, 0.3), envMap, envMapIntensity: 0.6 }),
      black: new THREE.MeshPhysicalMaterial({ color: '#1f2023', roughness: 0.5, clearcoat: 0.25, normalMap: grain, normalScale: new THREE.Vector2(0.3, 0.3), envMap, envMapIntensity: 0.5 }),
      rubber: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: '#202124', roughness: 0.85, normalMap: knurl, normalScale: new THREE.Vector2(0.9, 0.9) }),
      alu: new THREE.MeshStandardMaterial({ color: '#b8bcc3', metalness: 1, roughness: 0.38, normalMap: cast, normalScale: new THREE.Vector2(0.5, 0.5), envMap, envMapIntensity: 1.2 }),
      steel: new THREE.MeshStandardMaterial({ color: '#d2d5da', metalness: 1, roughness: 0.22, envMap, envMapIntensity: 1.4 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: '#2c2e33', metalness: 0.8, roughness: 0.4, envMap, envMapIntensity: 0.8 }),
      slot: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.9 }),
    };
    const add = (name, geo, mat, parent = g, pos = null, rot = null) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); if (name) this.parts[name] = m; return m; };
    // ---------------------------------------------------------------- engine body: lower orange crankcase/tank, white top shroud, filter cap
    add('crankcase', shell([0.1, 0.095, 0.17], 0.42, (p) => { p.x *= 1 - 0.12 * (p.y / 0.095 + 1) * 0.5; p.z += 0.03 * (p.y / 0.095); return p.add(V(-0.01, 0.115, -0.11)); }), M.orange);
    add('tank', shell([0.085, 0.08, 0.085], 0.4, (p) => { p.z -= 0.02 * (p.y / 0.08); return p.add(V(0, 0.105, -0.25)); }), M.orange);
    add('shroud', shell([0.102, 0.065, 0.15], 0.5, (p) => { p.y -= 0.035 * (p.z / 0.15 + 0.5) * Math.max(0, p.y / 0.065 + 0.3); p.x *= 1 - 0.1 * Math.max(0, p.y / 0.065); return p.add(V(-0.01, 0.228, -0.085)); }), M.white);
    add('filterCap', shell([0.074, 0.028, 0.085], 0.55, (p) => p.add(V(-0.005, 0.292, -0.135))), M.white);
    // shroud cooling louvres: rounded slots set into the shroud side
    { const louvre = canvasTex(256, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(14,14,16,0.95)'; for (let k = 0; k < 7; k++) { x.beginPath(); x.roundRect(14 + k * 34, 16, 16, h - 32, 8); x.fill(); } x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(15 + k * 34, 20); x.lineTo(15 + k * 34, h - 20); x.stroke(); } });
      const lm = new THREE.MeshPhysicalMaterial({ map: louvre, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
      for (const sd of [-1, 1]) add(null, new THREE.PlaneGeometry(0.13, 0.05), lm, g, [-0.01 + sd * 0.1015, 0.205, -0.15], [0, sd * Math.PI / 2, 0]); }
    // filter knob (lathed, black), decompression button, choke knob
    add('filterKnob', lathe([[0, 0.025], [0.02, 0.025], [0.024, 0.016], [0.022, 0.0], [0.0, 0.0]]), M.black, g, [-0.005, 0.312, -0.135]);
    add('decomp', lathe([[0, 0.016], [0.009, 0.016], [0.011, 0.008], [0.011, 0], [0, 0]]), M.grey, g, [0.045, 0.285, -0.01]);
    const choke = this.choke = new THREE.Group(); choke.position.set(-0.055, 0.26, -0.235); g.add(choke);
    add('chokeKnob', lathe([[0, 0], [0.012, 0], [0.012, 0.02], [0.016, 0.026], [0.0, 0.03]]), M.grey, choke, [0, 0, 0], [-Math.PI / 2 - 0.5, 0, 0]);
    // label on the shroud side (generic, no brand)
    const label = canvasTex(512, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#f2661a'; x.beginPath(); x.roundRect(4, 14, w - 8, h - 28, 18); x.fill(); x.fillStyle = '#1f2023'; x.font = 'italic 900 64px Arial'; x.textBaseline = 'middle'; x.fillText('CUTMAX', 26, h / 2 + 2); x.font = '700 40px Arial'; x.fillText('CX 14', 340, h / 2 + 4); });
    for (const sd of [-1, 1]) add(null, new THREE.PlaneGeometry(0.15, 0.037), new THREE.MeshPhysicalMaterial({ map: label, transparent: true, roughness: 0.3, clearcoat: 0.6 }), g, [sd * 0.106 - 0.005, 0.245, -0.07], [0, sd * Math.PI / 2, 0]).scale.set(1, 1, 1);
    // ---------------------------------------------------------------- rear handle (closed D handle) with rubber grip, trigger, interlock, stop switch
    add('rearFrame', tube([[0, 0.17, -0.27], [0, 0.245, -0.3], [0, 0.29, -0.34], [0, 0.302, -0.39], [0, 0.29, -0.43], [0, 0.24, -0.45], [0, 0.17, -0.44], [0, 0.13, -0.395], [0, 0.115, -0.32], [0, 0.12, -0.26]], 0.019, 160, 18, true), M.orange);
    sleeve(add, [[0, 0.294, -0.35], [0, 0.302, -0.375], [0, 0.302, -0.4], [0, 0.293, -0.422]], 0.0215, M.rubber, g);
    const trig = this.trigger = new THREE.Group(); trig.position.set(0, 0.283, -0.358); g.add(trig);
    { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(-0.012, -0.012, -0.035, -0.02, -0.052, -0.015); s.quadraticCurveTo(-0.058, -0.022, -0.05, -0.028); s.bezierCurveTo(-0.03, -0.03, -0.008, -0.022, 0.006, -0.006); s.closePath();
      const tg = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 3, curveSegments: 12 }); tg.translate(0, 0, -0.006); tg.rotateY(-Math.PI / 2); add('trigger', tg, M.black, trig); }
    const lock = this.interlock = new THREE.Group(); lock.position.set(0, 0.319, -0.356); g.add(lock);
    { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(-0.012, 0.008, -0.03, 0.01, -0.045, 0.004); s.lineTo(-0.044, -0.004); s.bezierCurveTo(-0.03, 0.0, -0.012, -0.002, 0.002, -0.006); s.closePath();
      const lg = new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2 }); lg.translate(0, 0, -0.008); lg.rotateY(-Math.PI / 2); add('interlock', lg, M.black, lock); }
    add('stopSwitch', shell([0.008, 0.005, 0.012], 0.5, (p) => p.add(V(-0.02, 0.305, -0.335))), M.black);
    // ---------------------------------------------------------------- front loop handle over the body, rubber on its top
    const loop = [[-0.11, 0.12, -0.02], [-0.123, 0.24, 0.0], [-0.115, 0.36, 0.015], [-0.07, 0.418, 0.022], [0.0, 0.43, 0.025], [0.07, 0.418, 0.022], [0.112, 0.36, 0.015], [0.12, 0.25, 0.0], [0.112, 0.15, -0.015]];
    add('frontHandle', tube(loop, 0.0145, 120), M.black);
    sleeve(add, [[-0.1, 0.385, 0.019], [-0.06, 0.421, 0.023], [0.0, 0.43, 0.025], [0.06, 0.421, 0.023], [0.1, 0.385, 0.019]], 0.0175, M.rubber, g);
    for (const [x, y, z] of [[-0.11, 0.12, -0.02], [0.112, 0.15, -0.015]]) add(null, shell([0.022, 0.02, 0.022], 0.5, (p) => p.add(V(x, y, z))), M.black);   // rubber anti-vibration mounts
    // ---------------------------------------------------------------- starter on the left: domed recoil cover with vent ring, T-grip on its rope
    // starter: a domed recoil cover with a raised rim and a ring of moulded radial ribs (air intake), centre boss
    { const sc = new THREE.Group(); sc.position.set(-0.112, 0.118, -0.12); sc.rotation.z = Math.PI / 2; g.add(sc);
      const coverMat = new THREE.MeshPhysicalMaterial({ color: '#2e3036', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25, normalMap: M.black.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), envMap: M.black.envMap, envMapIntensity: 0.8 });
      add('starterCover', lathe([[0, 0.034], [0.022, 0.033], [0.03, 0.03], [0.05, 0.022], [0.064, 0.013], [0.07, 0.012], [0.074, 0.008], [0.074, 0.0], [0, 0]], 72), coverMat, sc);
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, rib = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.022, 4, 8), coverMat); const rr = 0.044; rib.position.set(Math.cos(a) * rr, 0.0265 - 0.008, Math.sin(a) * rr); rib.lookAt(new THREE.Vector3(0, 0.038, 0)); rib.rotateX(Math.PI / 2); rib.castShadow = true; sc.add(rib); }
      add('starterBoss', lathe([[0, 0.04], [0.014, 0.04], [0.017, 0.034], [0.017, 0.03], [0, 0.03]], 32), M.grey, sc);
      this.parts.starterCoverGroup = sc; }
    const pull = this.starterGrip = new THREE.Group(); pull.position.set(-0.13, 0.205, -0.02); g.add(pull);
    add('starterGrip', new THREE.CapsuleGeometry(0.013, 0.07, 6, 16), M.black, pull, [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.rope = add('rope', tube([[-0.122, 0.17, -0.08], [-0.128, 0.19, -0.05], [-0.13, 0.205, -0.02]], 0.0025, 12, 6), new THREE.MeshStandardMaterial({ color: '#d8cfa8', roughness: 0.9 }));
    // ---------------------------------------------------------------- muffler with slotted heat shield (front), fuel cap (left rear)
    add('muffler', shell([0.06, 0.05, 0.035], 0.5, (p) => p.add(V(-0.03, 0.11, 0.06))), M.darkMetal);
    for (let k = 0; k < 5; k++) add(null, shell([0.04, 0.0035, 0.004], 0.5, (p) => p.add(V(-0.03, 0.08 + k * 0.014, 0.095))), M.slot);
    add('fuelCap', lathe([[0, 0.018], [0.024, 0.018], [0.027, 0.01], [0.026, 0.0], [0, 0]], 32), M.black, g, [-0.075, 0.13, -0.29], [0, 0, Math.PI / 2]);
    for (const [x, z] of [[-0.06, -0.24], [0.06, -0.24], [0.0, 0.03]]) add(null, shell([0.02, 0.012, 0.02], 0.5, (p) => p.add(V(x, 0.012, z))), M.rubber);   // feet
    // ---------------------------------------------------------------- cutter arm (cast aluminium) on the right, orange belt cover over it
    const AR = this.arbor = V(0.175, 0.19, 0.24);
    const armDeform = (p) => { const t = (p.z + 0.17) / 0.34; p.y *= 1 - 0.4 * t; p.x *= 1 - 0.2 * t; p.y += 0.03 * t; return p.add(V(0.132, 0.155, 0.07)); };
    add('arm', shell([0.032, 0.06, 0.17], 0.45, armDeform), M.alu);
    const coverDeform = (p) => { const t = (p.z + 0.18) / 0.36; p.y *= 1 - 0.38 * t; p.x *= 1 - 0.1 * t; p.y += 0.032 * t; return p.add(V(0.152, 0.158, 0.075)); };
    add('beltCover', shell([0.022, 0.066, 0.18], 0.42, coverDeform), M.orange);
    // belt cover detail: a moulded rib along it and three chrome bolts
    add('coverRib', tube([[0.175, 0.185, -0.08], [0.176, 0.186, 0.0], [0.174, 0.19, 0.07]], 0.0045, 30, 8), M.orange); for (const z of [-0.08, 0.07]) add(null, new THREE.SphereGeometry(0.0045, 12, 8), M.orange, g, [0.175, z < 0 ? 0.185 : 0.19, z]);
    for (const [y, z] of [[0.205, -0.07], [0.12, -0.02], [0.2, 0.15]]) add(null, lathe([[0, 0.006], [0.007, 0.006], [0.008, 0.002], [0.008, 0], [0, 0]], 6), M.steel, g, [0.174, y, z], [0, 0, -Math.PI / 2]);
    add('tensioner', lathe([[0, 0.012], [0.01, 0.012], [0.012, 0.004], [0.012, 0], [0, 0]], 6), M.steel, g, [0.172, 0.17, 0.02], [0, 0, -Math.PI / 2]);
    // ---------------------------------------------------------------- arbor: flanges and bolt
    const arbor = this.arborGroup = new THREE.Group(); arbor.position.copy(AR); g.add(arbor);
    add('innerFlange', lathe([[0.0, 0.0], [0.05, 0.0], [0.052, 0.004], [0.03, 0.012], [0.0, 0.012]], 48), M.steel, arbor, [-0.004, 0, 0], [0, 0, Math.PI / 2]);
    // ---------------------------------------------------------------- the blade: laser-cut steel core with gullets and holes, 24 bevelled diamond segments; spins on the arbor
    const blade = this.blade = new THREE.Group(); arbor.add(blade);
    { const RB = 0.175, RC = 0.165, N = 24, s = new THREE.Shape();
      for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, gw = 0.012 / RC; // segment seat between gullets
        const pts = 10; for (let k = 0; k <= pts; k++) { const a = a0 + gw / 2 + k / pts * (a1 - a0 - gw); const x = Math.cos(a) * RC, y = Math.sin(a) * RC; if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); }
        // keyhole gullet: down a narrow slot, round at the bottom, back up
        const ag = a1, rIn = RC - 0.016; s.lineTo(Math.cos(ag - gw / 2) * (rIn + 0.004), Math.sin(ag - gw / 2) * (rIn + 0.004)); s.absarc(Math.cos(ag) * rIn, Math.sin(ag) * rIn, 0.004, ag - Math.PI / 2 - 0.3 + Math.PI, ag + Math.PI / 2 + 0.3 + Math.PI, true); s.lineTo(Math.cos(ag + gw / 2) * RC, Math.sin(ag + gw / 2) * RC); }
      s.closePath();
      const arborHole = new THREE.Path(); arborHole.absarc(0, 0, 0.0127, 0, Math.PI * 2, true); s.holes.push(arborHole);
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4, hole = new THREE.Path(); hole.absarc(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.008, 0, Math.PI * 2, true); s.holes.push(hole); }
      const core = new THREE.ExtrudeGeometry(s, { depth: 0.0026, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 1, curveSegments: 6 }); core.translate(0, 0, -0.0013); core.rotateY(Math.PI / 2);
      const brush = canvasTex(1024, 1024, (x, w, h) => { x.fillStyle = '#8f939a'; x.fillRect(0, 0, w, h); const rr = rnd(3); for (let i = 0; i < 900; i++) { const rad = rr() * w / 2; x.strokeStyle = `rgba(${rr() < 0.5 ? '255,255,255' : '40,40,44'},${0.08 + rr() * 0.1})`; x.lineWidth = 1 + rr() * 2; x.beginPath(); x.arc(w / 2, h / 2, rad, 0, 7); x.stroke(); } x.fillStyle = '#5a5e66'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.17, 0, 7); x.fill(); x.fillStyle = '#e8e8e8'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.fillText('DIAMOND 350', w / 2, h * 0.3); x.fillText('MAX 5100 RPM', w / 2, h * 0.73); });
      brush.repeat.set(1 / 0.35, 1 / 0.35); brush.offset.set(0.5, 0.5); brush.wrapS = brush.wrapT = THREE.ClampToEdgeWrapping;
      const coreMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: brush, metalness: 0.95, roughness: 0.28, envMap: M.steel.envMap, envMapIntensity: 1.3 });
      { const uv = core.attributes.uv; } // ExtrudeGeometry UVs are the shape coords (metres): the repeat/offset centres the brushed texture
      add('bladeCore', core, coreMat, blade);
      // diamond segments: an arc block with bevels, slightly wider than the core
      const segMat = new THREE.MeshStandardMaterial({ color: '#4a4b50', metalness: 0.35, roughness: 0.62, normalMap: normalTex(64, (x, y) => grainVals[(y * 2 % 128) * 128 + (x * 2 % 128)], 2.5, 1), envMap: M.steel.envMap, envMapIntensity: 0.6 });
      for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI * 2 + 0.012 / RC / 2 + 0.003, a1 = (i + 1) / N * Math.PI * 2 - 0.012 / RC / 2 - 0.003, sh = new THREE.Shape();
        sh.absarc(0, 0, RB, a0, a1, false); sh.absarc(0, 0, RC - 0.0005, a1, a0, true); sh.closePath();
        const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.0034, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 2, curveSegments: 10 }); sg.translate(0, 0, -0.0017); sg.rotateY(Math.PI / 2); add(null, sg, segMat, blade); }
    }
    add('outerFlange', lathe([[0.0, 0.0], [0.05, 0.0], [0.052, 0.004], [0.03, 0.012], [0.0, 0.012]], 48), M.steel, arbor, [0.003, 0, 0], [0, 0, -Math.PI / 2]);
    add('arborBolt', new THREE.CylinderGeometry(0.011, 0.011, 0.012, 6), M.steel, arbor, [0.018, 0, 0], [0, 0, Math.PI / 2]);
    // ---------------------------------------------------------------- guard: rolled rim + side walls over the back/top of the blade, rotates on the arbor; handle tab and deflector flap
    const guard = this.guard = new THREE.Group(); arbor.add(guard);
    { const RG = 0.19, x0 = -0.022, x1 = 0.014, a0 = -0.35, a1 = Math.PI + 0.55;   // angles measured from +z toward +y (front -> top -> back)
      const P = (x, rr, a) => V(x, rr * Math.sin(a), rr * Math.cos(a));
      const as = lin(a0, a1, 64);
      const rim = surf(lin(x0, x1, 6), as, (x, a) => P(x, RG + 0.004 * Math.sin(Math.PI * (x - x0) / (x1 - x0)), a)); add('guardRim', rim, M.orange, guard);
      const wallIn = surf(lin(0.06, RG, 8), as, (rr, a) => P(x0, rr, a)); add('guardWallIn', wallIn, M.orange, guard);
      const wallOut = surf(lin(0.135, RG, 6), as, (rr, a) => P(x1, rr, a)); add('guardWallOut', wallOut, M.orange, guard);
      // rolled edges (thickness): beads along the open edges
      const edge = (pts) => add(null, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.0035, 8, false), M.orange, guard);
      edge(as.map((a) => P(x1, 0.135, a))); edge(as.map((a) => P(x0, 0.06, a))); edge(lin(x0, x1, 4).map((x) => P(x, RG, a0))); edge(lin(x0, x1, 4).map((x) => P(x, RG, a1)));
      M.orange.side = THREE.DoubleSide;
      // guard handle tab on top-rear, and the rubber deflector flap at the rear end
      add('guardTab', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lin(1.75, 2.25, 8).map((a) => P(x1 - 0.004, RG + 0.014, a))), 24, 0.008, 10, false), M.black, guard); for (const a of [1.75, 2.25]) add(null, new THREE.CylinderGeometry(0.006, 0.006, 0.016, 10), M.black, guard, P(x1 - 0.004, RG + 0.006, a).toArray(), [a, 0, 0]);
      add('flap', surf(lin(x0 + 0.002, x1 - 0.002, 4), lin(a1, a1 + 0.28, 10), (x, a) => P(x, RG - 0.002 - 0.01 * (a - a1), a)), M.rubber, guard);
      // water nozzle on the guard and a hose back along the arm
      add('waterNozzle', new THREE.CylinderGeometry(0.004, 0.005, 0.02, 10), M.steel, guard, P(x0 - 0.006, RG - 0.02, 1.2).toArray(), [0, 0, Math.PI / 2]);
    }
    add('hose', tube([[0.15, 0.21, 0.18], [0.145, 0.23, 0.08], [0.13, 0.22, -0.02], [0.118, 0.17, -0.06]], 0.0045, 40, 8), new THREE.MeshStandardMaterial({ color: '#1d3a8a', roughness: 0.55 }));
    // ---------------------------------------------------------------- grip points (where a character's hands go)
    this.grips = { rear: new THREE.Object3D(), front: new THREE.Object3D() };
    this.grips.rear.position.set(0, 0.302, -0.385); this.grips.front.position.set(-0.035, 0.427, 0.024); g.add(this.grips.rear, this.grips.front);
    this.contactLocal = (depth) => V(AR.x, AR.y - 0.175 + depth, AR.z);   // lowest point of the blade
    this.bladeAngle = 0;
  }
  // state: { bladeAngle (rad), trigger 0..1, interlock 0..1, guard (rad, rotate guard back), starter 0..1 (rope pulled out), choke 0..1 }
  update(st = {}) {
    this.blade.rotation.x = -(st.bladeAngle || 0);
    this.trigger.rotation.x = -(st.trigger || 0) * 0.32; this.interlock.rotation.x = (st.interlock || 0) * 0.28;
    this.guard.rotation.x = st.guard || 0;
    const pullOut = (st.starter || 0) * 0.45; this.starterGrip.position.set(-0.13 - pullOut * 0.35, 0.205 + pullOut * 0.6, -0.02 + pullOut * 0.7);
    const end = this.starterGrip.position, mid = V(-0.128 - pullOut * 0.1, 0.19 + pullOut * 0.2, -0.05 + pullOut * 0.25);
    this.rope.geometry.dispose(); this.rope.geometry = tube([[-0.122, 0.17, -0.08], mid.toArray(), end.toArray()], 0.0025, 12, 6);
    this.choke.position.z = -0.235 - (st.choke || 0) * 0.015;
  }
}
