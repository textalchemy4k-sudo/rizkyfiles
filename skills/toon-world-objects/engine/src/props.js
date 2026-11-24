// Props for the rumble-strips episode, all procedural: the giant warning sign, thermos + coffee spill, traffic cones,
// guardrail repair parts (W-beam sections, I-beam posts, blockouts, bolt bucket), amber beacon, ladder rack, crossbed
// toolbox, water tank, jerry can, ladder, hammer; dust trails, sparks; and crumple() for car damage.
import * as THREE from 'three/webgpu';
import { canvasTex, rnd } from './world.js';
import { rbox, ibeamGeo } from './geo.js';
export { rbox, ibeamGeo };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; };
// cap-face UVs of an extruded rbox are shape coordinates in metres: fit a texture to a w x h face
const fit = (t, w, h) => { const c = t.clone(); c.repeat.set(1 / w, 1 / h); c.offset.set(0.5, 0.5); c.needsUpdate = true; return c; };

// ---------------------------------------------------------------- shared materials and textures
const galvTex = () => canvasTex(512, 256, (x, w, h) => { const r = rnd(12); x.fillStyle = '#9aa0a6'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const cx = r() * w, cy = r() * h, rr = 8 + r() * 26, v = 130 + r() * 60; x.fillStyle = `rgba(${v},${v + 4},${v + 8},0.35)`; x.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + r() * 0.5, q = rr * (0.6 + r() * 0.5); k ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fill(); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(60,62,66,${0.05 + r() * 0.08})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1); } });
const brushed = (base = '#b4b8be') => canvasTex(256, 256, (x, w, h) => { const r = rnd(3); x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = r() < 0.5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.05})`; x.fillRect(r() * w, 0, 1, h); } });
let _galv; export const galv = () => (_galv = _galv || new THREE.MeshStandardMaterial({ map: galvTex(), color: '#9298a0', metalness: 0.6, roughness: 0.5 }));
const paintMat = (c, rough = 0.45) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const black = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.6 });

// W-beam guardrail section: the real two-hump profile in sheet steel (3 mm), length along +z from 0 to len
export function wbeamGeo(len) {
  const P = [[0, 0], [0.05, 0.03], [0.07, 0.08], [0.04, 0.155], [0.07, 0.23], [0.05, 0.28], [0, 0.31]], t = 0.004, s = new THREE.Shape();
  const C = new THREE.SplineCurve(P.map(([x, y]) => new THREE.Vector2(x, y))), pts = C.getPoints(40), back = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], n = new THREE.Vector2(-(b.y - a.y), b.x - a.x).normalize(); return p.clone().addScaledVector(n, t); }).reverse();
  s.moveTo(pts[0].x, pts[0].y); pts.forEach((p) => s.lineTo(p.x, p.y)); back.forEach((p) => s.lineTo(p.x, p.y)); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 40 });
}

// ---------------------------------------------------------------- the giant warning sign
// Origin on the ground under the panel centre; the face looks along +z. Panel 5.4 x 2.7 m, 2.3 m clear underneath.
export function makeSign() {
  const g = new THREE.Group(), PW = 5.4, PH = 2.7, Y0 = 2.3, yc = Y0 + PH / 2;
  const face = canvasTex(2048, 1024, (x, w, h) => {
    const r = rnd(77);
    x.fillStyle = '#f4c414'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,240,170,0.10)' : 'rgba(150,100,0,0.07)'; const px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py - 3); x.lineTo(px + 3, py); x.lineTo(px, py + 3); x.lineTo(px - 3, py); x.fill(); }   // prismatic sheeting grain
    const rr = (x0, y0, ww, hh, rad) => { x.beginPath(); x.moveTo(x0 + rad, y0); x.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, rad); x.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, rad); x.arcTo(x0, y0 + hh, x0, y0, rad); x.arcTo(x0, y0, x0 + ww, y0, rad); x.closePath(); };
    x.lineWidth = 26; x.strokeStyle = '#141414'; rr(40, 40, w - 80, h - 80, 70); x.stroke();
    x.fillStyle = '#141414'; rr(90, 90, w - 180, 230, 40); x.fill();
    x.fillStyle = '#f4c414'; x.font = '900 180px Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('WARNING', w / 2, 210);
    x.fillStyle = '#141414'; const tx = (t, px, y, maxW) => { let fs = px; do { x.font = `900 ${fs}px Arial Black, Arial`; fs -= 4; } while (x.measureText(t).width > maxW && fs > 40); x.fillText(t, 560 + (w - 660) / 2, y); };
    tx('STAY AWAKE', 250, 535, w - 720); tx('DRIFTING KILLS', 150, 800, w - 760);
    // a drowsy-driver diamond pictogram on the left
    x.save(); x.translate(320, 660); x.rotate(Math.PI / 4); x.lineWidth = 18; x.strokeRect(-140, -140, 280, 280); x.restore();
    x.save(); x.translate(320, 660); x.lineWidth = 16; x.beginPath(); x.arc(0, -40, 55, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-40, -40); x.lineTo(-10, -40); x.moveTo(10, -40); x.lineTo(40, -40); x.stroke(); x.font = '900 64px Arial'; x.fillText('z', 80, -110); x.font = '900 46px Arial'; x.fillText('z', 115, -160); x.beginPath(); x.arc(0, 90, 70, Math.PI, 0); x.stroke(); x.restore();
    // weathering: grime rising from the bottom, rain streaks under the bolts, a few scuffs
    const gr = x.createLinearGradient(0, h, 0, h * 0.55); gr.addColorStop(0, 'rgba(70,55,30,0.32)'); gr.addColorStop(1, 'rgba(70,55,30,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const sx = r() * w, sy = r() * h * 0.6, l = 40 + r() * 220; const s2 = x.createLinearGradient(0, sy, 0, sy + l); s2.addColorStop(0, 'rgba(60,50,30,0.14)'); s2.addColorStop(1, 'rgba(60,50,30,0)'); x.fillStyle = s2; x.fillRect(sx, sy, 2 + r() * 4, l); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; x.fillRect(r() * w, r() * h, 6 + r() * 30, 1 + r() * 2); }
  });
  const alum = new THREE.MeshStandardMaterial({ map: brushed('#a9adb3'), metalness: 0.85, roughness: 0.38 });
  const panel = mesh(rbox(PW, PH, 0.05, 0.12), alum, g, 0, yc, 0);
  const fm = new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const fc = mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(), w = PW - 0.02, h = PH - 0.02, r = 0.115, x0 = -w / 2, y0 = -h / 2; s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s; })(), 12), fm, g, 0, yc, 0.034);
  fc.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = i % 2 ? v / (PH - 0.02) + 0.5 : v / (PW - 0.02) + 0.5; }); fc.geometry.attributes.uv.needsUpdate = true;
  this_bolts(g, PW, yc);
  // stiffeners on the back: three horizontal Z-bars bolted across the posts
  for (const dy of [-0.85, 0, 0.85]) { const zs = new THREE.Shape(); zs.moveTo(0, 0); zs.lineTo(0.05, 0); zs.lineTo(0.05, -0.004); zs.lineTo(0.004, -0.004); zs.lineTo(0.004, -0.07); zs.lineTo(0.05, -0.07); zs.lineTo(0.05, -0.074); zs.lineTo(0, -0.074); zs.closePath();
    const zg = new THREE.ExtrudeGeometry(zs, { depth: PW - 0.3, bevelEnabled: false }); zg.rotateY(Math.PI / 2); const zb = mesh(zg, alum, g, -(PW - 0.3) / 2, yc + dy + 0.037, -0.027); }
  // two galvanised I-beam posts into concrete footings
  for (const sx of [-1.65, 1.65]) { mesh(ibeamGeo(Y0 + PH - 0.15), galv(), g, sx, -0.05, -0.155);
    mesh(lathe([[0, 0.06], [0.2, 0.06], [0.22, 0.03], [0.24, -0.1], [0, -0.1]], 24), new THREE.MeshStandardMaterial({ color: '#9a968c', roughness: 0.95 }), g, sx, 0, -0.155);
    for (const dy of [-0.85, 0, 0.85]) for (const dz of [-0.03, 0.03]) mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 6), galv(), g, sx + dz, yc + dy + 0.037, -0.235).rotation.x = Math.PI / 2; }
  g.userData = { PW, PH, Y0, yc, panel };
  return g;
}
function this_bolts(g, PW, yc) {   // carriage-bolt heads on the face where the Z-bars sit behind
  const head = new THREE.SphereGeometry(0.018, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); head.rotateX(Math.PI / 2); head.scale(1, 1, 0.45);
  const m = new THREE.MeshStandardMaterial({ map: galvTex(), metalness: 0.8, roughness: 0.35 });
  for (const dy of [-0.85, 0, 0.85]) for (let i = 0; i < 9; i++) mesh(head, m, g, -PW / 2 + 0.3 + i * (PW - 0.6) / 8, yc + dy, 0.028);
}

// ---------------------------------------------------------------- thermos: green hammertone body, steel bands, cup lid with a stopper under it, folding handle
export function makeThermos() {
  const g = new THREE.Group();
  const ham = canvasTex(256, 256, (x, w, h) => { const r = rnd(8); x.fillStyle = '#3d6b4a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = r(); x.fillStyle = v < 0.5 ? `rgba(20,40,26,${0.15 + r() * 0.2})` : `rgba(120,170,130,${0.1 + r() * 0.15})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 6, 0, 7); x.fill(); }
    x.fillStyle = '#e8e4d8'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.save(); x.translate(w * 0.5, h * 0.48); x.rotate(-Math.PI / 2); x.fillText('VACUUM BOTTLE', 0, 0); x.restore(); });
  const body = new THREE.MeshPhysicalMaterial({ map: ham, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, metalness: 0.2 });
  const steel = new THREE.MeshStandardMaterial({ map: brushed('#c4c8ce'), metalness: 1, roughness: 0.28 });
  mesh(lathe([[0, 0], [0.04, 0], [0.046, 0.006], [0.047, 0.03]]), steel, g);                       // bottom band
  mesh(lathe([[0.0472, 0.03], [0.0475, 0.17], [0.047, 0.2]]), body, g);                             // body
  mesh(lathe([[0.047, 0.2], [0.046, 0.215], [0.036, 0.235], [0.03, 0.245], [0.03, 0.255]]), steel, g); // shoulder
  const cup = new THREE.Group(); cup.position.y = 0.205; g.add(cup); g.userData.cup = cup;          // the cup lid (comes off when knocked)
  mesh(lathe([[0.049, 0], [0.05, 0.065], [0.047, 0.072], [0.03, 0.075], [0, 0.076]]), body, cup);
  mesh(new THREE.TorusGeometry(0.049, 0.003, 8, 48), steel, cup, 0, 0.003, 0).rotation.x = Math.PI / 2;
  const hc = new THREE.CatmullRomCurve3([V(0.047, 0.04, 0), V(0.075, 0.06, 0), V(0.08, 0.12, 0), V(0.075, 0.17, 0), V(0.047, 0.185, 0)]);
  const handle = mesh(new THREE.TubeGeometry(hc, 24, 0.006, 10, false), new THREE.MeshStandardMaterial({ color: '#1d2a20', roughness: 0.5 }), g); g.userData.handle = handle;
  return g;
}
// a coffee spill: glossy dark-brown pools with irregular edges, plus splash drops; lies flat in local x-z
export function makeSpill(size = 0.5, seed = 4) {
  const g = new THREE.Group();
  const tex = canvasTex(512, 512, (x, w, h) => { const r = rnd(seed); x.clearRect(0, 0, w, h);
    const blob = (cx, cy, rad, n) => { x.beginPath(); for (let k = 0; k <= n; k++) { const a = k / n * 6.283, q = rad * (0.7 + 0.45 * Math.sin(a * 3 + r() * 6) * r() + 0.15 * r()); const px = cx + Math.cos(a) * q, py = cy + Math.sin(a) * q; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); };
    x.fillStyle = 'rgba(52,26,12,0.92)'; blob(w / 2, h / 2, 150, 28); for (let i = 0; i < 9; i++) blob(w / 2 + (r() - 0.5) * 300, h / 2 + (r() - 0.5) * 300, 20 + r() * 50, 14);
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 170 + r() * 80; blob(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 3 + r() * 9, 8); }
    x.globalCompositeOperation = 'source-atop'; const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 220); gr.addColorStop(0, 'rgba(30,14,6,0.95)'); gr.addColorStop(1, 'rgba(96,52,24,0.85)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const m = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const pool = mesh(new THREE.PlaneGeometry(size, size), m, g); pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
  return g;
}
// coffee in the air: stretched glossy drops along a burst
export function makeSplash(n = 40, seed = 6) {
  const g = new THREE.Group(), r = rnd(seed), m = new THREE.MeshPhysicalMaterial({ color: '#3a1c0c', roughness: 0.05, clearcoat: 1 });
  for (let i = 0; i < n; i++) { const d = mesh(new THREE.SphereGeometry(0.003 + r() * 0.004, 10, 8), m, g, (r() - 0.5) * 0.5, r() * 0.35, (r() - 0.5) * 0.4); d.scale.set(1, 1 + r() * 4, 1); d.rotation.set(r() * 3, r() * 3, r() * 3); }
  return g;
}

// ---------------------------------------------------------------- traffic cone (28"), orange PVC with two reflective collars, black square base
export function makeCone() {
  const g = new THREE.Group();
  const t = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#ff5a10'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2f4f6'; x.fillRect(0, h * 0.2, w, h * 0.13); x.fillRect(0, h * 0.42, w, h * 0.08); const r = rnd(2); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(60,30,10,${r() * 0.12})`; x.fillRect(r() * w, r() * h, 2, 1); } });
  t.wrapS = THREE.RepeatWrapping; const cone = lathe([[0.13, 0.03], [0.125, 0.04], [0.03, 0.69], [0.02, 0.7], [0, 0.7]], 32);
  const uv = cone.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); mesh(cone, new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.4, clearcoat: 0.4 }), g);
  mesh(rbox(0.36, 0.36, 0.035, 0.05), black, g, 0, 0.0175, 0).rotation.x = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------- repair parts for the guardrail company's bed
export function makeRailParts(bed) {
  const g = new THREE.Group(), L = Math.min(3.8, (bed.z1 - bed.z0) + 1.4), wb = wbeamGeo(L);
  for (let k = 0; k < 4; k++) { const s = mesh(wb, galv(), g, -0.42 + (k % 2) * 0.02, bed.y + 0.02 + k * 0.085, bed.z0 + 0.05); s.rotation.z = -Math.PI / 2; }   // stacked flat, overhanging the dropped tailgate
  for (let k = 0; k < 3; k++) { const p = mesh(ibeamGeo(1.8), galv(), g, 0.35 + k * 0.12, bed.y + 0.08, bed.z0 + 0.1); p.rotation.x = Math.PI / 2; }   // posts lying lengthwise
  const wood = canvasTex(128, 128, (x, w, h) => { const r = rnd(5); x.fillStyle = '#7a5a36'; x.fillRect(0, 0, w, h); for (let i = 0; i < 50; i++) { x.strokeStyle = `rgba(60,40,20,${0.2 + r() * 0.3})`; x.beginPath(); x.moveTo(0, r() * h); x.bezierCurveTo(w * 0.3, r() * h, w * 0.6, r() * h, w, r() * h); x.stroke(); } });
  for (let k = 0; k < 4; k++) mesh(rbox(0.15, 0.36, 0.2, 0.01), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 }), g, 0.62, bed.y + 0.1 + (k % 2) * 0.2, bed.z0 + 0.3 + Math.floor(k / 2) * 0.22).rotation.x = Math.PI / 2;
  // a bucket of splice bolts
  const bk = new THREE.Group(); bk.position.set(-0.55, bed.y, bed.z0 + 0.35); g.add(bk);
  mesh(lathe([[0.13, 0], [0.15, 0.3], [0.155, 0.31], [0.148, 0.31], [0.128, 0.008], [0, 0.008]], 32), new THREE.MeshStandardMaterial({ color: '#d84a1a', roughness: 0.5, side: THREE.DoubleSide }), bk);
  const r = rnd(9); for (let i = 0; i < 26; i++) { const b = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), galv(), bk, (r() - 0.5) * 0.2, 0.26 + r() * 0.03, (r() - 0.5) * 0.2); b.rotation.set(r() * 3, 0, r() * 3); }
  return g;
}
// amber LED beacon on a magnetic base
export function makeBeacon() {
  const g = new THREE.Group();
  mesh(lathe([[0, 0], [0.09, 0], [0.095, 0.02], [0.085, 0.04], [0, 0.04]]), black, g);
  const lens = new THREE.MeshPhysicalMaterial({ color: '#ffa21a', emissive: '#ff9a10', emissiveIntensity: 0.4, roughness: 0.1, transmission: 0.2, clearcoat: 1 });
  mesh(lathe([[0.07, 0.04], [0.072, 0.12], [0.06, 0.16], [0.03, 0.175], [0, 0.178]]), lens, g); g.userData.lens = lens;
  return g;
}
// ladder rack over the bed: two hoops and two rails, square tube with rounded corners
export function makeRack(bed, cabTopY) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.5, roughness: 0.4 }), x0 = bed.x0 + 0.02, x1 = bed.x1 - 0.02, y1 = cabTopY + 0.08;
  for (const z of [bed.z0 + 0.1, bed.z1 - 0.15]) { const c = new THREE.CatmullRomCurve3([V(x0, bed.y + 0.25, z), V(x0, y1 - 0.08, z), V(x0 + 0.08, y1, z), V(x1 - 0.08, y1, z), V(x1, y1 - 0.08, z), V(x1, bed.y + 0.25, z)], false, 'catmullrom', 0.1); mesh(new THREE.TubeGeometry(c, 40, 0.022, 8), m, g); }
  for (const x of [x0 + 0.12, x1 - 0.12]) { const t = mesh(new THREE.CylinderGeometry(0.02, 0.02, bed.z1 - bed.z0 + 0.4, 10), m, g, x, y1 + 0.02, (bed.z0 + bed.z1) / 2 - 0.15); t.rotation.x = Math.PI / 2; }
  return g;
}
// crossbed toolbox in diamond plate
export function makeToolbox(width) {
  const g = new THREE.Group();
  const dp = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#9ea2a8'; x.fillRect(0, 0, w, h); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const cx = i * 16 + (j % 2) * 8, cy = j * 16; x.save(); x.translate(cx, cy); x.rotate((i + j) % 2 ? 0.6 : -0.6); const gr = x.createLinearGradient(-6, 0, 6, 0); gr.addColorStop(0, '#5a5e64'); gr.addColorStop(0.5, '#e8eaee'); gr.addColorStop(1, '#5a5e64'); x.fillStyle = gr; x.fillRect(-6, -1.6, 12, 3.2); x.restore(); } });
  const m = new THREE.MeshStandardMaterial({ map: dp, metalness: 0.55, roughness: 0.35 });
  mesh(rbox(width, 0.38, 0.48, 0.03), m, g, 0, 0.19, 0).rotation.y = 0;
  for (const sx of [-1, 1]) mesh(rbox(0.12, 0.03, 0.03, 0.01), black, g, sx * width * 0.3, 0.32, 0.245);
  return g;
}
// 100-gal poly water tank for the saw (translucent white), straps
export function makeTank() {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color: '#e8e6dc', roughness: 0.5, transmission: 0.25, thickness: 0.05 });
  const t = mesh(lathe([[0, 0], [0.26, 0], [0.3, 0.04], [0.31, 0.45], [0.28, 0.52], [0.08, 0.56], [0.08, 0.6], [0, 0.6]], 40), m, g); t.scale.set(1, 1, 1.25);
  const water = mesh(lathe([[0, 0.01], [0.3, 0.01], [0.305, 0.3], [0, 0.3]], 40), new THREE.MeshStandardMaterial({ color: '#7a9aa8', transparent: true, opacity: 0.35, roughness: 0.2 }), g); water.scale.set(0.97, 1, 1.21);
  for (const y of [0.15, 0.4]) { const s = mesh(new THREE.TorusGeometry(0.315, 0.008, 6, 48), new THREE.MeshStandardMaterial({ color: '#d4a018', roughness: 0.6 }), g, 0, y, 0); s.rotation.x = Math.PI / 2; s.scale.set(1, 1.25, 1); }
  return g;
}
export function makeJerryCan(color = '#c41e1e') {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.4 });
  const xt = canvasTex(128, 172, (x, w, h) => { x.fillStyle = color; x.fillRect(0, 0, w, h); x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.moveTo(18, 18); x.lineTo(w - 18, h - 18); x.moveTo(w - 18, 18); x.lineTo(18, h - 18); x.stroke(); x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(14, 20); x.lineTo(w - 22, h - 16); x.moveTo(w - 14, 20); x.lineTo(22, h - 16); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16); });
  const mx = new THREE.MeshPhysicalMaterial({ map: fit(xt, 0.34, 0.46), bumpMap: fit(xt, 0.34, 0.46), bumpScale: 2, roughness: 0.4, clearcoat: 0.4 });
  const bodyG = rbox(0.34, 0.46, 0.17, 0.04); mesh(bodyG, [mx, m], g, 0, 0.23, 0);
  for (const x of [-0.08, 0, 0.08]) mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 8), m, g, x, 0.49, 0).rotation.x = Math.PI / 2;
  const hb = new THREE.CatmullRomCurve3([V(-0.13, 0.46, 0), V(-0.12, 0.5, 0), V(0.12, 0.5, 0), V(0.13, 0.46, 0)]); mesh(new THREE.TubeGeometry(hb, 20, 0.012, 8), m, g);
  mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.05, 16), black, g, 0.13, 0.475, 0).rotation.z = -0.5;
  return g;
}
// aluminium extension ladder (two rails, round rungs), length along +y from 0
export function makeLadder(len = 3.6) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ map: brushed('#c8ccd2'), metalness: 0.9, roughness: 0.3 });
  const rail = new THREE.Shape(); rail.moveTo(-0.012, -0.04); rail.lineTo(0.012, -0.04); rail.lineTo(0.012, -0.036); rail.lineTo(0.003, -0.036); rail.lineTo(0.003, 0.036); rail.lineTo(0.012, 0.036); rail.lineTo(0.012, 0.04); rail.lineTo(-0.012, 0.04); rail.lineTo(-0.012, 0.036); rail.lineTo(-0.003, 0.036); rail.lineTo(-0.003, -0.036); rail.lineTo(-0.012, -0.036); rail.closePath();
  for (const x of [-0.22, 0.22]) { const rg = new THREE.ExtrudeGeometry(rail, { depth: len, bevelEnabled: false }); rg.rotateX(-Math.PI / 2); mesh(rg, m, g, x, 0, 0); mesh(rbox(0.06, 0.08, 0.1, 0.02), black, g, x, 0.04, 0); }
  for (let y = 0.3; y < len - 0.1; y += 0.3) mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 12), m, g, 0, y, 0).rotation.z = Math.PI / 2;
  return g;
}
// framing hammer: hickory handle, forged head, origin at the grip end, head along +y
export function makeHammer() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#c08a52', roughness: 0.55 });
  mesh(lathe([[0, 0], [0.016, 0.005], [0.017, 0.12], [0.013, 0.2], [0.012, 0.3], [0.014, 0.33], [0, 0.335]], 16), wood, g);
  mesh(lathe([[0, 0], [0.018, 0.0], [0.019, 0.11], [0, 0.115]], 16), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 }), g, 0, 0.005, 0);   // rubber grip
  const steel = new THREE.MeshStandardMaterial({ map: brushed('#7a7e86'), metalness: 1, roughness: 0.3 });
  const face = mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.07, 20), steel, g, 0.035, 0.33, 0); face.rotation.z = Math.PI / 2;
  const claw = new THREE.CatmullRomCurve3([V(-0.0, 0.33, 0), V(-0.05, 0.325, 0), V(-0.09, 0.3, 0)]); mesh(new THREE.TubeGeometry(claw, 12, 0.011, 8), steel, g);
  return g;
}

// ---------------------------------------------------------------- dust behind a moving car: soft puffs along its past path
const dustTex = canvasTex(128, 128, (x) => { const r = rnd(3); for (let i = 0; i < 26; i++) { const cx = 40 + r() * 48, cy = 40 + r() * 48, rr = 14 + r() * 30, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
export class DustTrail {
  constructor(scene, n = 40, color = '#c8b89a') { this.s = []; for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color, transparent: true, depthWrite: false, opacity: 0 })); m.visible = false; scene.add(m); this.s.push(m); } }
  // path(t) -> world position of the car's rear at time t; puffs born every dt from both rear wheels
  update(path, t, { rate = 14, life = 2.2, strength = 0.5, halfW = 0.8, night = 0 } = {}) {
    const h = (k) => { const x = Math.sin(k * 127.1) * 43758.5; return x - Math.floor(x); };
    this.s.forEach((sp, i) => { const born = Math.floor(t * rate) / rate - Math.floor(i / 2) / rate, age = t - born; if (age < 0 || age > life || born < 0) { sp.visible = false; return; }
      const p = path(born), k = Math.floor(born * rate) * 2 + (i % 2), a = age / life; sp.visible = true;
      sp.position.set(p.x + (i % 2 ? halfW : -halfW) + (h(k) - 0.5) * 0.6 * age, 0.15 + 0.5 * a + 0.25 * h(k + 3), p.z + (h(k + 5) - 0.5) * 0.6);
      const sz = 0.6 + 2.6 * a; sp.scale.set(sz * 1.4, sz, 1); sp.material.opacity = strength * (1 - a) * Math.min(1, age * 5) * (1 - 0.5 * night); });
  }
}
// sparks from a cut: thin hot streaks, thrown back and up from the contact point
export class Sparks {
  constructor(scene, n = 160) { this.n = n; this.m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffa040', depthWrite: false, toneMapped: false, side: THREE.DoubleSide, transparent: true }), n); this.m.frustumCulled = false; scene.add(this.m); this.glow = new THREE.PointLight('#ffb050', 0, 3, 2); scene.add(this.glow); }
  update(hit, back, t, camera, on = 1) {
    const h = (k) => { const x = Math.sin(k * 127.1) * 43758.5; return x - Math.floor(x); }, M4 = new THREE.Matrix4(), up = V(0, 1, 0), side = new THREE.Vector3().crossVectors(back, up).normalize();
    for (let i = 0; i < this.n; i++) { const life = 0.3 + h(i) * 0.25, born = t - h(i + 50) * life, age = t - born; if (!on) { M4.makeScale(0, 0, 0); this.m.setMatrixAt(i, M4); continue; }
      const sp = 2.2 + h(i + 7) * 3.5, el = 0.15 + h(i + 1) * 0.9, sd = (h(i + 2) - 0.5) * 0.8, v = back.clone().multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).addScaledVector(side, sd).normalize().multiplyScalar(sp);
      const p = hit.clone().addScaledVector(v, age).add(V(0, -4.9 * age * age, 0)), vel = v.clone().add(V(0, -9.8 * age, 0)), toCam = camera.position.clone().sub(p).normalize(), dir = vel.clone().normalize(), len = Math.min(0.09, vel.length() * 0.02), wid = 0.004 * (1 - 0.6 * age / life);
      const sv = new THREE.Vector3().crossVectors(dir, toCam).normalize(), n = new THREE.Vector3().crossVectors(sv, dir); M4.makeBasis(dir.multiplyScalar(len), sv.multiplyScalar(wid), n); M4.setPosition(p.addScaledVector(vel.normalize(), -len / 2)); this.m.setMatrixAt(i, M4); }
    this.m.instanceMatrix.needsUpdate = true; this.glow.position.copy(hit).add(V(0, 0.1, 0)); this.glow.intensity = on ? 2.0 : 0;
  }
}

// ---------------------------------------------------------------- car damage: push the body in around an impact point
// group: the car's group; pWorld: impact point; dir: push direction (world, into the car); radius, depth (m).
// Every mesh under the group is deformed in place (its geometry is cloned first so shared geometry is safe).
export function crumple(group, pWorld, dir, radius = 0.6, depth = 0.18, seed = 1) {
  group.updateMatrixWorld(true); const inv = new THREE.Matrix4(), v = new THREE.Vector3(), d = dir.clone().normalize();
  group.traverse((m) => { if (!m.isMesh || m.isInstancedMesh || m.userData.noCrumple) return; const geo = m.geometry; if (!geo.attributes.position) return;
    const bs = (geo.boundingSphere || (geo.computeBoundingSphere(), geo.boundingSphere)); const c = bs.center.clone().applyMatrix4(m.matrixWorld); if (c.distanceTo(pWorld) > radius * 1.6 + bs.radius * m.matrixWorld.getMaxScaleOnAxis()) return;
    if (!m.userData.crumpled) { m.geometry = geo.clone(); m.userData.crumpled = true; }
    const P = m.geometry.attributes.position; inv.copy(m.matrixWorld).invert(); const dl = d.clone().transformDirection(inv); let hit = false;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); const q = v.distanceTo(pWorld) / radius; if (q >= 1) continue; hit = true;
      const k = (1 - q * q) ** 2, wr = Math.sin(v.x * 37 + seed) * Math.sin(v.y * 41 + seed * 2) * Math.sin(v.z * 29 + seed * 3);
      const lp = new THREE.Vector3().fromBufferAttribute(P, i).addScaledVector(dl, depth * k * (0.8 + 0.35 * wr)); P.setXYZ(i, lp.x, lp.y, lp.z); }
    if (hit) { P.needsUpdate = true; m.geometry.computeVertexNormals(); }
  });
}
