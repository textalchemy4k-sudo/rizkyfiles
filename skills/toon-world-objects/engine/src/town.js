// A small-town main street, its own scene: two-lane street with parking, curbs, sidewalks, two rows of shopfront
// buildings (brick, stucco, siding) with framed windows, awnings, signs and lit-up interiors behind the glass, street
// lamps, trees in grates, benches, hydrants, mailboxes, meters, planters, a traffic light, a water tower, parked cars.
// Street runs along z; centre x = 0; cars drive on the right. three.js r186 WebGPU.
import * as THREE from 'three/webgpu';
import { canvasTex, rnd } from './world.js';
import { asphalt } from './surfaces.js';
import { rbox, lathe } from './props.js';
import { CarBody } from './cruiser.js';
import { PickupBody } from './pickup.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
export const ROADW = 5.6, CURB = 0.15, WALK = 3.4, FRONT = ROADW + WALK;   // half road width, curb height, sidewalk width, building line

export function buildTown(scene, env) {
  const T = { cars: [] }, r = rnd(23);
  scene.environment = env; scene.background = null;
  // sky: a gradient dome, a few soft clouds; fog for depth
  const sky = canvasTex(64, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a76c8'); g.addColorStop(0.42, '#8cb6e2'); g.addColorStop(0.5, '#dde8ef'); g.addColorStop(1, '#c8c4b8'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, toneMapped: true })));
  scene.fog = new THREE.FogExp2('#cdd8e0', 0.0042);
  const sun = T.sun = new THREE.DirectionalLight('#fff0d8', 3.2); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  T.sunDir = V(0.55, 0.7, -0.45).normalize();
  T.placeLight = (focus) => { sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(T.sunDir, 150); sun.target.updateMatrixWorld(); };
  scene.add(new THREE.HemisphereLight('#c4d8f0', '#6a5e4c', 1.15));

  // ---------------------------------------------------------------- street, curbs, sidewalks, markings, ground beyond
  const LEN = 240, Z0 = 120;
  { const A = asphalt(LEN), m = new THREE.MeshStandardMaterial({ ...A, normalScale: new THREE.Vector2(1.1, 1.1) }); A.map && (m.map.repeat.set(1, LEN / 12));
    for (const k of ['normalMap', 'roughnessMap']) if (m[k]) m[k].repeat.set(1, LEN / 12);
    const road = mesh(new THREE.PlaneGeometry(2 * ROADW, LEN), m, scene, 0, 0, Z0 - LEN / 2); road.rotation.x = -Math.PI / 2; }
  const paint = (x, w, z0, z1, col, dash = 0) => { const mt = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }); if (!dash) { const p = mesh(new THREE.PlaneGeometry(w, z0 - z1), mt, scene, x, 0.002, (z0 + z1) / 2); p.rotation.x = -Math.PI / 2; p.castShadow = false; return; } for (let z = z0; z > z1; z -= dash * 2) { const p = mesh(new THREE.PlaneGeometry(w, dash), mt, scene, x, 0.002, z - dash / 2); p.rotation.x = -Math.PI / 2; p.castShadow = false; } };
  paint(-0.1, 0.1, Z0, Z0 - LEN, '#d9a52e'); paint(0.1, 0.1, Z0, Z0 - LEN, '#d9a52e');
  for (const s of [-1, 1]) { paint(s * (ROADW - 2.4), 0.1, Z0, Z0 - LEN, '#e8e8e2'); for (let z = 60; z > -60; z -= 6.2) { const p = mesh(new THREE.PlaneGeometry(2.3, 0.1), new THREE.MeshStandardMaterial({ color: '#e8e8e2', roughness: 0.6 }), scene, s * (ROADW - 1.2), 0.002, z); p.rotation.x = -Math.PI / 2; p.castShadow = false; } }
  // crosswalk and stop line at the intersection (z -64)
  for (let x = -ROADW + 0.4; x < ROADW - 0.3; x += 0.9) { const p = mesh(new THREE.PlaneGeometry(0.5, 3), new THREE.MeshStandardMaterial({ color: '#ecece6', roughness: 0.6 }), scene, x, 0.003, -66); p.rotation.x = -Math.PI / 2; p.castShadow = false; }
  const conc = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b7b2a8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 150 + r() * 70; x.fillStyle = `rgba(${v},${v - 3},${v - 8},0.25)`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } x.strokeStyle = 'rgba(70,66,60,0.6)'; x.lineWidth = 3; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(0, k * h / 4); x.lineTo(w, k * h / 4); x.stroke(); } x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(40,36,30,${0.05 + r() * 0.1})`; x.beginPath(); x.arc(r() * w, r() * h, 3 + r() * 14, 0, 7); x.fill(); } });
  for (const s of [-1, 1]) {
    const cm = new THREE.MeshStandardMaterial({ color: '#c8c4bc', roughness: 0.85 }); const curb = mesh(rbox(0.22, CURB + 0.1, LEN, 0.04), cm, scene, s * (ROADW + 0.11), CURB / 2 - 0.05, Z0 - LEN / 2);
    const wm = new THREE.MeshStandardMaterial({ map: conc.clone(), roughness: 0.9 }); wm.map.repeat.set(WALK / 3.2, LEN / 3.2); wm.map.needsUpdate = true;
    const walk = mesh(new THREE.PlaneGeometry(WALK - 0.2, LEN), wm, scene, s * (ROADW + 0.2 + (WALK - 0.2) / 2), CURB, Z0 - LEN / 2); walk.rotation.x = -Math.PI / 2;
    void curb;
  }
  const grass = mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: '#6c7a44', roughness: 1 }), scene, 0, -0.02, 0); grass.rotation.x = -Math.PI / 2;

  // ---------------------------------------------------------------- buildings
  const NAMES = [['DINER', '#c8302a'], ['HARDWARE', '#2a5a8a'], ['BARBER', '#1e1e1e'], ['PHARMACY', '#2a7a4a'], ['BAKERY', '#8a4a2a'], ['BANK', '#3a3a5a'], ['BOOKS', '#6a2a4a'], ['FEED & SEED', '#5a6a2a'], ['COFFEE', '#4a2e1e'], ['POST OFFICE', '#2a3a6a'], ['THEATER', '#8a1a1a'], ['ANTIQUES', '#5a4a2a'], ['GROCERY', '#2a6a5a'], ['TAILOR', '#3a2a5a'], ['FLORIST', '#a03a6a'], ['SHOES', '#2a2a2a']];
  const STYLE = ['brick', 'stucco', 'siding', 'brick', 'brick', 'stucco'];
  const COL = { brick: ['#8a3e2c', '#9a5236', '#7a3428', '#a0623e'], stucco: ['#d8c8a4', '#c8b48a', '#e2d6bc', '#b8a888'], siding: ['#8aa6b8', '#c8c0a4', '#a8b89a', '#e0dccc'] };
  const facadeTex = (style, base, w, h) => canvasTex(512, Math.round(512 * h / w), (x, W2, H2) => {
    x.fillStyle = base; x.fillRect(0, 0, W2, H2); const px = W2 / w;
    if (style === 'brick') { const bh = 0.075 * px, bw = 0.215 * px; for (let row = 0, y = 0; y < H2; row++, y += bh) for (let xx = -(row % 2) * bw / 2; xx < W2; xx += bw) { const c = new THREE.Color(base).offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08); x.fillStyle = '#' + c.getHexString(); x.fillRect(xx + 1, y + 1, bw - 2, bh - 2); } }
    if (style === 'stucco') for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.05})`; x.fillRect(r() * W2, r() * H2, 2, 2); }
    if (style === 'siding') { const sh = 0.15 * px; for (let y = 0; y < H2; y += sh) { const g = x.createLinearGradient(0, y, 0, y + sh); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.85, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = g; x.fillRect(0, y, W2, sh); } }
    const g = x.createLinearGradient(0, H2, 0, H2 * 0.7); g.addColorStop(0, 'rgba(40,34,26,0.25)'); g.addColorStop(1, 'rgba(40,34,26,0)'); x.fillStyle = g; x.fillRect(0, 0, W2, H2);
    for (let i = 0; i < 25; i++) { const sx = r() * W2, l = 20 + r() * 120; const s2 = x.createLinearGradient(0, 0, 0, l); s2.addColorStop(0, 'rgba(30,26,20,0.12)'); s2.addColorStop(1, 'rgba(30,26,20,0)'); x.save(); x.translate(sx, r() * H2 * 0.3); x.fillStyle = s2; x.fillRect(0, 0, 3, l); x.restore(); }
  });
  // shop interior seen through the window: back wall, shelves with goods, a counter, warm light
  const interiorTex = (seed, tint) => canvasTex(512, 256, (x, w, h) => { const q = rnd(seed); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3028'); g.addColorStop(0.6, '#5a4a3a'); g.addColorStop(1, '#2a221c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const lg = x.createRadialGradient(w / 2, 0, 10, w / 2, 0, w * 0.7); lg.addColorStop(0, 'rgba(255,220,160,0.5)'); lg.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = lg; x.fillRect(0, 0, w, h);
    for (let s = 0; s < 3; s++) { const y = 50 + s * 55; x.fillStyle = '#2a1e16'; x.fillRect(20, y + 30, w - 40, 6); for (let i = 0; i < 40; i++) { const c = new THREE.Color().setHSL(q(), 0.5, 0.4 + q() * 0.3); x.fillStyle = '#' + c.getHexString(); const bw = 6 + q() * 10, bh = 12 + q() * 18; x.fillRect(24 + q() * (w - 60), y + 30 - bh, bw, bh); } }
    x.fillStyle = tint; x.fillRect(60, h - 70, w - 200, 50); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(60, h - 22, w - 200, 6);
    for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(255,240,200,0.9)'; x.beginPath(); x.ellipse(100 + i * 150, 12, 26, 6, 0, 0, 7); x.fill(); } });
  const signTex = (name, col) => canvasTex(1024, 192, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8d8a8'; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24); x.fillStyle = '#f2e6c4'; let fs = 120; do { x.font = `bold ${fs}px Georgia, serif`; fs -= 4; } while (x.measureText(name).width > w - 100); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2 + 6); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.08})`; x.fillRect(r() * w, r() * h, 3, 1); } });
  const glassMat = (tex) => new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.04, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 });
  const upperGlass = new THREE.MeshPhysicalMaterial({ color: '#2a323c', roughness: 0.05, metalness: 0.4, clearcoat: 1 });
  const trimW = new THREE.MeshStandardMaterial({ color: '#ece6d8', roughness: 0.5 }), dark = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6 });
  let ni = 0;
  T.shops = [];
  for (const s of [-1, 1]) {
    let z = 58;
    while (z > -60) {
      const bw = 6 + Math.floor(r() * 4) * 1.2, floors = 1 + (r() < 0.75 ? 1 : 0) + (r() < 0.2 ? 1 : 0), fh = 3.6, bh = floors * fh + 0.9, style = STYLE[Math.floor(r() * STYLE.length)], base = COL[style][Math.floor(r() * 4)], [name, scol] = NAMES[ni++ % NAMES.length];
      const zc = z - bw / 2, B = new THREE.Group(); B.position.set(s * FRONT, CURB, zc); B.rotation.y = -s * Math.PI / 2; scene.add(B);   // local: x along the street, -z into the building, +z toward the street
      const fm = new THREE.MeshStandardMaterial({ map: facadeTex(style, base, bw, bh), roughness: style === 'stucco' ? 0.95 : 0.85 });
      const box = mesh(new THREE.BoxGeometry(bw - 0.04, bh, 10), [new THREE.MeshStandardMaterial({ color: base, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: base, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.9 }), dark, fm, fm], B, 0, bh / 2, -5);
      void box;
      // cornice + parapet cap
      mesh(rbox(bw + 0.1, 0.32, 0.4, 0.06), trimW, B, 0, bh - 0.3, 0.1); mesh(rbox(bw + 0.02, 0.12, 0.28, 0.04), trimW, B, 0, bh + 0.02, 0.0);
      // storefront: bulkhead, big windows with interior, a recessed door, transom, frames
      const sfW = bw - 0.8, sfH = 2.6;
      mesh(rbox(sfW, 0.5, 0.12, 0.03), dark, B, 0, 0.25, 0.05);
      const iw = (sfW - 1.3) / 2, itex = interiorTex(ni * 7, scol);
      for (const sd of [-1, 1]) { const gx = sd * (0.65 + iw / 2); const gl = mesh(new THREE.PlaneGeometry(iw, sfH - 0.7), glassMat(itex), B, gx, 0.5 + (sfH - 0.7) / 2 + 0.02, 0.02); gl.castShadow = false;
        for (const fx of [-iw / 2, iw / 2]) mesh(rbox(0.07, sfH - 0.6, 0.1, 0.02), dark, B, gx + fx, 0.5 + (sfH - 0.6) / 2, 0.06);
        mesh(rbox(iw + 0.07, 0.07, 0.1, 0.02), dark, B, gx, sfH - 0.12, 0.06); }
      const door = mesh(rbox(1.0, 2.25, 0.06, 0.02), new THREE.MeshPhysicalMaterial({ color: scol, roughness: 0.35, clearcoat: 0.6 }), B, 0, 1.13, -0.25);
      mesh(new THREE.PlaneGeometry(0.62, 1.2), glassMat(itex), B, 0, 1.45, -0.215).castShadow = false; mesh(rbox(0.04, 0.2, 0.05, 0.015), new THREE.MeshStandardMaterial({ color: '#c8b070', metalness: 1, roughness: 0.3 }), B, 0.38, 1.05, -0.19);
      for (const sd of [-1, 1]) mesh(rbox(0.3, 2.3, 0.3, 0.02), dark, B, sd * 0.65, 1.15, -0.13);   // door reveal
      mesh(rbox(1.3, 0.1, 0.3, 0.02), dark, B, 0, 2.3, -0.13); void door;
      // name: a fascia sign board, or a striped awning with the name on its valance
      const st = signTex(name, scol);
      if (r() < 0.55) {
        const L = sfW + 0.2, awn = new THREE.Shape(); awn.moveTo(0, 0); awn.quadraticCurveTo(-0.15, -0.5, -1.2, -0.62); awn.lineTo(-1.2, -0.64); awn.quadraticCurveTo(-0.13, -0.52, 0.02, 0); awn.closePath();
        const stripes = canvasTex(512, 64, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f2ece0' : scol; x.fillRect(i * w / 16, 0, w / 16, h); } });
        const ag = new THREE.ExtrudeGeometry(awn, { depth: L, bevelEnabled: false, curveSegments: 16 }); ag.rotateY(Math.PI / 2); ag.translate(-L / 2, 0, 0);
        { const p = ag.attributes.position, uv = ag.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + L / 2) / L, p.getY(i)); uv.needsUpdate = true; }
        const am = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide }); mesh(ag, am, B, 0, sfH + 0.75, 0);
        for (const sx of [-1, 1]) { const arm = new THREE.CatmullRomCurve3([V(sx * L / 2, sfH + 0.75, 0), V(sx * L / 2, sfH + 0.45, 0.6), V(sx * L / 2, sfH + 0.13, 1.2)]); mesh(new THREE.TubeGeometry(arm, 10, 0.012, 6), dark, B); }
        const val = mesh(new THREE.PlaneGeometry(L, 0.28), new THREE.MeshStandardMaterial({ map: st, roughness: 0.8, side: THREE.DoubleSide }), B, 0, sfH + 0.0, 1.205);
        void val;
      } else mesh(rbox(sfW, 0.62, 0.1, 0.04), new THREE.MeshStandardMaterial({ map: (() => { const t = st.clone(); t.repeat.set(1 / sfW, 1 / 0.62); t.offset.set(0.5, 0.5); t.needsUpdate = true; return t; })(), roughness: 0.6 }), B, 0, sfH + 0.4, 0.07);
      // upper floors: framed double-hung windows with sills and lintels, some blinds down
      for (let f = 1; f < floors; f++) { const n = Math.max(2, Math.round(bw / 2.2)); for (let k = 0; k < n; k++) { const wx = -bw / 2 + (k + 0.5) * bw / n, wy = f * fh + 1.6;
        mesh(new THREE.PlaneGeometry(0.9, 1.5), upperGlass, B, wx, wy, 0.015).castShadow = false;
        if (r() < 0.4) { const bl = mesh(new THREE.PlaneGeometry(0.88, 0.4 + r() * 0.8), new THREE.MeshStandardMaterial({ color: '#e8e0c8', roughness: 0.9 }), B, wx, wy + 0.3, 0.02); bl.castShadow = false; }
        for (const fx of [-0.48, 0.48]) mesh(rbox(0.08, 1.6, 0.08, 0.02), trimW, B, wx + fx, wy, 0.04);
        mesh(rbox(0.9, 0.05, 0.06, 0.015), trimW, B, wx, wy, 0.04); mesh(rbox(1.15, 0.08, 0.18, 0.02), trimW, B, wx, wy - 0.82, 0.08); mesh(rbox(1.15, 0.16, 0.1, 0.02), trimW, B, wx, wy + 0.86, 0.05); } }
      // rooftop AC unit sometimes
      if (r() < 0.5) mesh(rbox(1.2, 0.8, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: '#b8bcbe', metalness: 0.5, roughness: 0.5 }), B, (r() - 0.5) * bw * 0.5, bh + 0.4, -3);
      T.shops.push({ s, z: zc, name, B });
      z -= bw;
    }
  }
  // ---------------------------------------------------------------- street furniture
  const iron = new THREE.MeshStandardMaterial({ color: '#1e2a24', roughness: 0.45, metalness: 0.4 }), wood = new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.75 });
  const lampHeads = [];
  const lamp = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g);
    mesh(lathe([[0, 0], [0.16, 0], [0.16, 0.08], [0.1, 0.16], [0.07, 0.5], [0.055, 4.2], [0.05, 4.4], [0, 4.4]], 24), iron, g);
    const arm = new THREE.CatmullRomCurve3([V(0, 4.3, 0), V(-s * 0.5, 4.6, 0), V(-s * 1.1, 4.55, 0)]); mesh(new THREE.TubeGeometry(arm, 16, 0.035, 8), iron, g);
    const head = mesh(lathe([[0, 0], [0.22, -0.02], [0.24, -0.08], [0.12, -0.14], [0, -0.15]], 24), iron, g, -s * 1.15, 4.55, 0);
    const bulb = mesh(new THREE.SphereGeometry(0.11, 16, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd8a0', emissiveIntensity: 0.05 }), g, -s * 1.15, 4.47, 0); lampHeads.push(bulb); void head; };
  const tree = (x, z, seed) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g); const q = rnd(seed);
    mesh(rbox(1.2, 1.2, 0.04, 0.02), iron, g, 0, 0.0, 0).rotation.x = Math.PI / 2;
    mesh(lathe([[0, 0], [0.14, 0], [0.11, 0.3], [0.09, 2.2], [0.06, 2.8], [0, 2.85]], 14), new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.95 }), g);
    const leaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    for (let k = 0; k < 9; k++) { const geo = new THREE.SphereGeometry(0.6 + q() * 0.45, 28, 18), p = geo.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)), n = 1 + 0.18 * Math.sin(v.x * 7 + seed) * Math.sin(v.y * 6 + k) * Math.sin(v.z * 8); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); const sh = 0.75 + 0.35 * (v.y / 1.2); col.push(0.2 * sh, 0.38 * sh, 0.12 * sh); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      const a = q() * 6.28, rr = k ? 0.5 + q() * 0.6 : 0; mesh(geo, leaf, g, Math.cos(a) * rr, 3.0 + q() * 1.4 + (k ? 0 : 0.6), Math.sin(a) * rr); } };
  const bench = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, CURB, z); g.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g);
    for (const sx of [-0.75, 0.75]) { const sh = new THREE.Shape(); sh.moveTo(-0.25, 0); sh.lineTo(-0.2, 0); sh.lineTo(-0.15, 0.42); sh.lineTo(0.18, 0.44); sh.lineTo(0.22, 0); sh.lineTo(0.27, 0); sh.lineTo(0.24, 0.46); sh.lineTo(0.26, 0.85); sh.lineTo(0.22, 0.86); sh.lineTo(0.2, 0.48); sh.lineTo(-0.2, 0.47); sh.closePath(); const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 }); sg.rotateY(Math.PI / 2); mesh(sg, iron, g, sx, 0, 0); }
    for (let k = 0; k < 4; k++) mesh(rbox(1.7, 0.03, 0.08, 0.012), wood, g, 0, 0.45, -0.15 + k * 0.1);
    for (let k = 0; k < 3; k++) { const b = mesh(rbox(1.7, 0.08, 0.03, 0.012), wood, g, 0, 0.58 + k * 0.1, 0.23 + k * 0.01); b.rotation.x = -0.15; } };
  const hydrant = (x, z) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g); const m = new THREE.MeshPhysicalMaterial({ color: '#c8281e', roughness: 0.45, clearcoat: 0.5 }), cap = new THREE.MeshPhysicalMaterial({ color: '#e8c020', roughness: 0.45, clearcoat: 0.5 });
    mesh(lathe([[0, 0], [0.15, 0], [0.15, 0.05], [0.11, 0.08], [0.11, 0.55], [0.13, 0.58], [0.13, 0.62], [0.1, 0.66], [0, 0.7]], 24), m, g); mesh(lathe([[0, 0], [0.04, 0], [0.035, 0.06], [0, 0.07]], 6), cap, g, 0, 0.69, 0);
    for (const a of [0, Math.PI, Math.PI / 2]) { const n = mesh(new THREE.CylinderGeometry(a === Math.PI / 2 ? 0.06 : 0.04, a === Math.PI / 2 ? 0.06 : 0.04, 0.12, 12), cap, g, Math.cos(a) * 0.14, 0.42, Math.sin(a) * 0.14); n.rotation.z = Math.PI / 2; n.rotation.y = -a; } };
  const mailbox = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, CURB, z); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(g); const sh = new THREE.Shape(); sh.moveTo(-0.24, 0); sh.lineTo(0.24, 0); sh.lineTo(0.24, 0.62); sh.absarc(0, 0.62, 0.24, 0, Math.PI, false); sh.closePath();
    const m = new THREE.MeshPhysicalMaterial({ color: '#1e3a7a', roughness: 0.4, clearcoat: 0.5 }); const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }); bg.translate(0, 0, -0.25); mesh(bg, m, g, 0, 0.3, 0);
    const lab = canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#1e3a7a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2f2f2'; x.font = 'bold 56px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MAIL', w / 2, h / 2); }); mesh(new THREE.PlaneGeometry(0.36, 0.14), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.5 }), g, 0, 0.75, 0.268);
    mesh(rbox(0.4, 0.1, 0.04, 0.02), dark, g, 0, 0.9, 0.27); for (const sx of [-0.2, 0.2]) mesh(rbox(0.05, 0.3, 0.4, 0.01), m, g, sx, 0.15, 0); };
  const meter = (x, z) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g); mesh(lathe([[0, 0], [0.05, 0], [0.03, 0.05], [0.025, 1.15], [0, 1.15]], 12), new THREE.MeshStandardMaterial({ color: '#5a5e62', metalness: 0.6, roughness: 0.4 }), g);
    mesh(rbox(0.16, 0.24, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: '#7a7e84', metalness: 0.7, roughness: 0.35 }), g, 0, 1.27, 0); mesh(new THREE.SphereGeometry(0.075, 16, 8, 0, 6.3, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#c8d8e0', roughness: 0.05, transmission: 0.4 }), g, 0, 1.39, 0); };
  const can = (x, z) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g); const t = canvasTex(256, 64, (x2, w, h) => { x2.fillStyle = '#26402e'; x2.fillRect(0, 0, w, h); x2.fillStyle = '#1a2a20'; for (let i = 0; i < 24; i++) x2.fillRect(i * w / 24, 0, 3, h); }); t.repeat.set(1, 1);
    mesh(lathe([[0, 0.02], [0.27, 0.02], [0.3, 0.9], [0, 0.9]], 32), new THREE.MeshStandardMaterial({ map: t, metalness: 0.4, roughness: 0.5 }), g); mesh(lathe([[0, 0.9], [0.32, 0.9], [0.31, 0.97], [0.2, 1.02], [0, 1.03]], 32), iron, g); };
  const planter = (x, z, seed) => { const g = new THREE.Group(); g.position.set(x, CURB, z); scene.add(g); mesh(lathe([[0, 0], [0.3, 0], [0.38, 0.5], [0.42, 0.52], [0.4, 0.56], [0, 0.56]], 32), new THREE.MeshStandardMaterial({ color: '#a8a296', roughness: 0.9 }), g); const q = rnd(seed);
    for (let k = 0; k < 6; k++) { const geo = new THREE.SphereGeometry(0.18 + q() * 0.08, 16, 12); mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color('#3e6a2e').offsetHSL(0, 0, (q() - 0.5) * 0.1), roughness: 0.8 }), g, (q() - 0.5) * 0.4, 0.62 + q() * 0.15, (q() - 0.5) * 0.4); }
    for (let k = 0; k < 7; k++) mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: ['#e84a6a', '#f2c84a', '#f2f2f2'][k % 3], roughness: 0.6 }), g, (q() - 0.5) * 0.5, 0.78 + q() * 0.1, (q() - 0.5) * 0.5); };
  for (const s of [-1, 1]) {
    for (let z = 52; z > -60; z -= 14) { lamp(s * (ROADW + 0.55), z, s); tree(s * (ROADW + 1.1), z - 7, Math.round(z * 3 + s * 50)); }
    for (let z = 55; z > -60; z -= 6.2) meter(s * (ROADW + 0.4), z - 1.6);
    for (let z = 46; z > -60; z -= 28) { bench(s * (FRONT - 0.7), z, s); can(s * (FRONT - 0.5), z - 2.2); planter(s * (FRONT - 0.6), z - 11, Math.round(z + s * 9)); }
  }
  hydrant(ROADW + 0.5, 4.5); hydrant(-ROADW - 0.5, -18); mailbox(ROADW + 0.6, -10, 1); mailbox(-ROADW - 0.6, 22, -1);
  // traffic light over the intersection
  { const g = new THREE.Group(); g.position.set(ROADW + 0.5, CURB, -64); scene.add(g); mesh(lathe([[0, 0], [0.2, 0], [0.12, 0.2], [0.1, 6.2], [0, 6.3]], 20), iron, g);
    const arm = mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.5, 12), iron, g, -3.2, 6.0, 0); arm.rotation.z = Math.PI / 2;
    for (const ax of [-2.6, -5.4]) { const h = mesh(rbox(0.36, 1.0, 0.3, 0.06), new THREE.MeshStandardMaterial({ color: '#e0b820', roughness: 0.5 }), g, ax, 5.4, 0.0); void h; [['#ff3a2a', 0.3, 0.1], ['#ffb020', 0, 0.02], ['#2aff6a', -0.3, 0.02]].forEach(([c, dy, e]) => { const l = mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e === 0.1 ? 1.5 : 0.02 }), g, ax, 5.4 + dy, 0.16); void l; mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 20, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#202020', side: THREE.DoubleSide }), g, ax, 5.4 + dy + 0.02, 0.22).rotation.set(Math.PI / 2, 0, 0); }); } }
  // water tower beyond the rooftops, and tree lines closing the ends of the street
  { const g = new THREE.Group(); g.position.set(-28, 0, -150); scene.add(g); const m = new THREE.MeshStandardMaterial({ color: '#b8c0c4', metalness: 0.5, roughness: 0.5 });
    mesh(lathe([[0, 22], [5, 22], [5.4, 23], [5.4, 27], [4.8, 28.5], [2.5, 29.8], [0.5, 30.4], [0, 30.5]], 40), m, g);
    const lab = canvasTex(1024, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#2a3a6a'; x.font = 'bold 90px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MILLBROOK', w * 0.25, h / 2); });
    const band = mesh(new THREE.CylinderGeometry(5.42, 5.42, 1.2, 64, 1, true), new THREE.MeshStandardMaterial({ map: lab, transparent: true, roughness: 0.5 }), g, 0, 25.2, 0); band.rotation.y = 0.6; band.castShadow = false;
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; const leg = mesh(new THREE.CylinderGeometry(0.22, 0.28, 22.5, 10), m, g, Math.cos(a) * 4.3, 11, Math.sin(a) * 4.3); leg.rotation.set(Math.sin(a) * 0.05, 0, -Math.cos(a) * 0.05); }
    mesh(new THREE.CylinderGeometry(0.6, 0.6, 22, 12), m, g, 0, 11, 0); }
  for (let k = 0; k < 40; k++) { const z = -100 - r() * 60, x = (r() - 0.5) * 120; if (Math.abs(x) < 8) continue; tree(x, z, k + 200); }
  for (let k = 0; k < 30; k++) { const z = 90 + r() * 50, x = (r() - 0.5) * 120; if (Math.abs(x) < 8) continue; tree(x, z, k + 400); }
  // backs of the blocks beyond the street-front rows (so no gaps between rooftops)
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(14, 6, 130), new THREE.MeshStandardMaterial({ color: '#8a8278', roughness: 0.95 }), scene, s * (FRONT + 17), 3, -2);
  // ---------------------------------------------------------------- parked cars along both curbs (front toward -z on the right side, +z on the left)
  const colors = ['#8a1f22', '#2a4a6a', '#d8d4c8', '#3a5a3a', '#6a6a70', '#c8a24a', '#1e1e22', '#5a7a9a'];
  let ci = 0;
  for (const s of [-1, 1]) for (let z = 50; z > -58; z -= 6.2) { if (r() < 0.3) continue; const isP = r() < 0.25, car = isP ? new PickupBody(env) : new CarBody(env); car.setLivery(colors[ci++ % colors.length]); car.setTail(0);
    car.group.position.set(s * (ROADW - 1.2) - 0.375, 0, z - 3.1 + (r() - 0.5) * 0.4); if (s < 0) { car.group.rotation.y = Math.PI; car.group.position.x += 0.75; } scene.add(car.group); T.cars.push({ car, s, z: z - 3.1 }); }
  T.lampHeads = lampHeads;
  return T;
}
