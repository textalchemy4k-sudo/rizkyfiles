// Car interior seen from the driver's seat (after the reference: an older SUV cabin), built from parameters; every part
// is its own node so it can move every frame (wheel turns, needles move, wipers sweep, mirror tilts, gear lever moves).
// Units: metres, car frame: -z forward, driver's eye around (0, 1.25, 0.25).
import * as THREE from 'three/webgpu';
const tex = (w, h, fn, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const rbox = (w, h, d, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: r * 0.4, bevelThickness: r * 0.4, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -d / 2); return g; };
// a profile (z, y) swept across x
function sweep(prof, x0, x1, nx = 30) {
  const pos = [], uv = [], idx = [], n = prof.length;
  for (let i = 0; i <= nx; i++) { const x = x0 + (x1 - x0) * i / nx; prof.forEach(([z, y], j) => { pos.push(x, y, z); uv.push(i / nx * (x1 - x0) * 4, j / (n - 1)); }); }
  for (let i = 0; i < nx; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = a + n; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function leatherMaps() {
  const W = 512, r = rnd(17), h = new Float32Array(W * W);
  const bump = (cx, cy, rad, amp) => { for (let y = (cy - rad) | 0; y <= cy + rad; y++) for (let x = (cx - rad) | 0; x <= cx + rad; x++) { const d = Math.hypot(x - cx, y - cy) / rad; if (d < 1) { const i = ((y + W) % W) * W + ((x + W) % W); h[i] += amp * (1 - d * d) ** 2; } } };
  for (let i = 0; i < 9000; i++) bump(r() * W, r() * W, 2.5 + r() * 3.5, 0.6 + r() * 0.4);
  for (let k = 0; k < 40; k++) { let x = r() * W, y = r() * W; const a = r() * 6.28; for (let j = 0; j < 40 + r() * 80; j++) { x += Math.cos(a + Math.sin(j * 0.2) * 0.4); y += Math.sin(a + Math.sin(j * 0.2) * 0.4); const i = ((y | 0) % W + W) % W * W + ((x | 0) % W + W) % W; h[i] -= 0.8; } }
  const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'), img = g.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const i = y * W + x, q = i * 4, hx = h[y * W + (x + 1) % W] - h[y * W + (x - 1 + W) % W], hy = h[((y + 1) % W) * W + x] - h[((y - 1 + W) % W) * W + x], nx = -hx * 0.9, ny = hy * 0.9, l = Math.hypot(nx, ny, 1); img.data[q] = (nx / l * 0.5 + 0.5) * 255; img.data[q + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[q + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[q + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 8; return t;
}
const grain = () => tex(256, 256, (g, w, h) => { const r = rnd(4); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.07)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, false);
const leather = () => tex(512, 64, (g, w, h) => { const r = rnd(9); g.fillStyle = '#26262a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.15})`; g.fillRect(r() * w, r() * h, 2, 1); } g.strokeStyle = 'rgba(120,120,128,0.5)'; g.lineWidth = 2; g.setLineDash([6, 5]); for (const y of [10, h - 10]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
const carpetTex = () => { const t = tex(256, 256, (g, w, h) => { const r = rnd(31); g.fillStyle = '#1a1b1e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { const v = 18 + r() * 22; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 2); } }); t.repeat.set(4, 4); return t; };
const rubberMat = () => tex(256, 256, (g, w, h) => { g.fillStyle = '#141416'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2b2f'; g.lineWidth = 6; for (let y = 24; y < h - 10; y += 22) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); } g.strokeStyle = '#222326'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); });
const padTex = () => tex(128, 128, (g, w, h) => { g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 14) { g.fillStyle = '#3a3c42'; g.fillRect(4, y, w - 8, 6); g.fillStyle = '#0c0c0e'; g.fillRect(4, y + 6, w - 8, 2); } });
const grilleTex = () => tex(128, 128, (g, w, h) => { g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h); g.fillStyle = '#08090b'; for (let y = 4; y < h; y += 7) for (let x = 4 + (y / 7 % 2) * 3.5; x < w; x += 7) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } g.fillStyle = '#5a5e66'; g.beginPath(); g.arc(w / 2, h / 2, 9, 0, 7); g.fill(); });
const stitchTex = (col) => tex(128, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); const r = rnd(5); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 2, 1); } g.strokeStyle = 'rgba(200,200,205,0.55)'; g.lineWidth = 2; g.setLineDash([7, 5]); for (const x of [12, w - 12]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
// seat insert: 7 padded channels (shaded rounded tops, dark seams with stitch rows), perforation dots; bump=true gives the height map
const pleatTex = (col, bump = false) => tex(256, 256, (g, w, h) => {
  const base = new THREE.Color(col), hex = (k) => '#' + base.clone().multiplyScalar(k).getHexString(), n = 7, cw = w / n;
  g.fillStyle = bump ? '#000' : hex(1); g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const gr = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0); if (bump) { gr.addColorStop(0, '#202020'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#202020'); } else { gr.addColorStop(0, hex(0.7)); gr.addColorStop(0.45, hex(1.18)); gr.addColorStop(1, hex(0.72)); } g.fillStyle = gr; g.fillRect(i * cw + 2, 0, cw - 4, h); }
  if (!bump) { g.strokeStyle = 'rgba(210,210,215,0.5)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); for (let i = 1; i < n; i++) for (const o of [-4, 4]) { g.beginPath(); g.moveTo(i * cw + o, 0); g.lineTo(i * cw + o, h); g.stroke(); } }
  g.setLineDash([]); g.fillStyle = bump ? '#303030' : hex(0.45); for (let i = 0; i < n; i++) for (let y = 8; y < h; y += 9) for (let x = i * cw + 8 + ((y / 9) % 2) * 4; x < (i + 1) * cw - 6; x += 8) { g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); }
}, !bump);
function gauge(label, max, red) {
  return tex(256, 256, (g, w, h) => {
    const c = w / 2; g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b8bcc4'; g.lineWidth = 8; g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.stroke();
    for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.75 + i / 40 * Math.PI * 1.5, big = i % 5 === 0, r0 = c - 18, r1 = r0 - (big ? 18 : 9); g.strokeStyle = red && i > 32 ? '#ff4030' : '#f2f2f6'; g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
      if (big) { g.fillStyle = '#f2f2f6'; g.font = 'bold 21px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.round(i / 40 * max)), c + Math.cos(a) * (r1 - 20), c + Math.sin(a) * (r1 - 20)); } }
    g.fillStyle = '#9aa0aa'; g.font = '16px Arial'; g.textAlign = 'center'; g.fillText(label, c, c + 52);
  });
}

// Cockpit laid out from the reference POV frame (1080x1920, eye at (0.08, 1.28, 0.26), pitch -6.2 deg, fov 66):
//   wheel centre on screen (540,1650), rim spans 860 px -> a 0.40 m wheel, centre 0.69 m from the eye, thin rim;
//   gauges just inside the top of the rim (y ~1410), in a dark recess under an arched hood that grows out of the dash;
//   the dash face sits further forward than the wheel, the column runs from the hub back into a lower housing, and the
//   dash ends meet leather door trims on both sides (nothing pokes through the body).
export const EYE = new THREE.Vector3(0.08, 1.25, 0.12), PITCH = -0.108;   // seats moved forward 0.24 m (user, 2026-11-20)
export const WHEEL = { c: new THREE.Vector3(0.08, 0.886, -0.31), R: 0.2, tilt: -0.545 };
export class CarInterior {
  constructor(opts = {}) {
    const g = this.group = new THREE.Group(); this.parts = {}; const cabEnd = this.cabEnd = opts.cabEnd ?? 2.0, rear = opts.rear ?? true; this.opts = opts;
    const leaN = leatherMaps(); const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.68, normalMap: leaN, normalScale: new THREE.Vector2(0.45, 0.45), ...o });
    const dark = M({ color: opts.trim || '#3a3d45' }), darker = M({ color: '#24262c' }), trim = M({ color: '#3a3b40', roughness: 0.55 }); this.mats = { M, dark, darker, trim };
    const chrome = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 1, roughness: 0.25 });
    const add = (name, mesh, x, y, z, parent = g) => { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); if (name) this.parts[name] = mesh; return mesh; };
    const XL = -0.56, XR = 1.31;   // inner faces of the door trims
    // dashboard: grey top under the glass (defroster slits), dark leather body whose face sits well forward of the wheel
    {
      const defrost = tex(512, 64, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); c.fillStyle = '#202020'; for (let i = 0; i < 40; i++) c.fillRect(30 + i * 11, 26, 6, 14); });
      const top = new THREE.Mesh(sweep([[-1.16, 0.985], [-0.98, 0.99], [-0.86, 0.986]], XL, XR), M({ color: '#7c808a', map: defrost })); top.material.side = THREE.DoubleSide; add('dashTop', top, 0, 0, 0);
      const body = new THREE.Mesh(sweep([[-0.86, 0.986], [-0.8, 0.976], [-0.765, 0.952], [-0.75, 0.9], [-0.755, 0.72], [-0.7, 0.5]], XL, XR), dark); body.material.side = THREE.DoubleSide; add('dash', body, 0, 0, 0);
      // rounded end caps where the dash meets the doors
      for (const x of [XL + 0.03, XR - 0.03]) add(null, new THREE.Mesh(rbox(0.06, 0.48, 0.3, 0.05), dark), x, 0.75, -0.82);
      // a small display pod on the right of the dash top with red digits (as in the reference)
      const clock = tex(256, 48, (c, w, h) => { c.fillStyle = '#080808'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff2a20'; c.font = 'bold 28px monospace'; c.fillText('----  17', 20, 34); });
      const pod = add('display', new THREE.Mesh(rbox(0.34, 0.07, 0.14, 0.02), darker), 0.98, 1.02, -0.84);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.04), new THREE.MeshBasicMaterial({ map: clock, toneMapped: false })); face.position.set(0, -0.005, 0.072); pod.add(face);
    }
    // instrument cluster: dials in a dark recess, an arched hood over them growing out of the dash face
    {
      const cx = 0.065, cy = 0.87, cz = -0.735;
      const hs = new THREE.Shape(); hs.absarc(0, 0, 0.27, 0.0, Math.PI, false); hs.absarc(0, 0, 0.245, Math.PI, 0.0, true); hs.closePath();
      const hood = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.11, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 4, curveSegments: 48 }), darker);
      hood.scale.set(1, 0.52, 1); hood.rotation.x = -0.25; add('binnacle', hood, cx, cy - 0.03, -0.76);
      const recess = new THREE.Mesh(new THREE.CircleGeometry(0.25, 48, 0, Math.PI), M({ color: '#0e0f12' })); recess.scale.set(1, 0.52, 1); recess.rotation.x = -0.25; add(null, recess, cx, cy - 0.03, -0.745);
      const sill = new THREE.Mesh(rbox(0.4, 0.02, 0.12, 0.008), darker); add(null, sill, cx, cy - 0.025, -0.7);
      this.needles = [];
      for (const [x, lab, max, red] of [[cx - 0.066, 'MPH', 120, false], [cx + 0.066, 'x1000 r/min', 8, true]]) {
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.042, 48), new THREE.MeshStandardMaterial({ map: gauge(lab, max, red), roughness: 0.4 })); face.material.emissiveMap = face.material.map; face.material.emissive = new THREE.Color('#ffffff'); face.material.emissiveIntensity = 0.55;
        face.rotation.x = -0.25; add(null, face, x, cy + 0.012, cz);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.003, 8, 48), chrome); ring.rotation.x = -0.25; add(null, ring, x, cy + 0.012, cz + 0.002);
        const needle = new THREE.Group(); needle.position.set(x, cy + 0.012, cz + 0.003); needle.rotation.x = -0.25; g.add(needle);
        const nm = new THREE.Mesh(new THREE.PlaneGeometry(0.0035, 0.034), new THREE.MeshBasicMaterial({ color: '#ff6a1a', toneMapped: false })); nm.position.y = 0.013; needle.add(nm);
        this.needles.push(needle);
      }
      const disp = tex(128, 192, (c2, w, h) => { c2.fillStyle = '#05070c'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#6ab8ff'; c2.font = 'bold 64px Arial'; c2.textAlign = 'center'; c2.fillText('D', w / 2, 84); c2.fillStyle = '#c8d4e8'; c2.font = '18px Arial'; c2.fillText('48220 mi', w / 2, 130); c2.fillText('72°F', w / 2, 160); c2.fillStyle = '#40d070'; c2.fillRect(w / 2 - 14, 14, 10, 10); c2.fillRect(w / 2 + 4, 14, 10, 10); });
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.045), new THREE.MeshBasicMaterial({ map: disp, toneMapped: false })); dm.rotation.x = -0.25; add(null, dm, cx, cy + 0.01, cz + 0.002);
    }
    // steering wheel: 0.40 m, thin leather rim with a grey 12 o'clock band, two wide side spokes with button pods,
    // a bottom spoke, a padded hub with a raised top; on a column that runs back into the lower dash housing
    {
      const W = this.wheel = new THREE.Group(); W.position.copy(WHEEL.c); W.rotation.x = WHEEL.tilt; g.add(W);
      const rimMat = new THREE.MeshStandardMaterial({ map: leather(), roughness: 0.55 }); rimMat.map.repeat.set(10, 1);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.R, 0.0145, 20, 128), rimMat); rim.castShadow = true; W.add(rim);
      const band = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.R, 0.0152, 20, 16, 0.32), M({ color: '#55585f' })); band.rotation.z = Math.PI / 2 - 0.16; W.add(band);
      const sp = new THREE.MeshStandardMaterial({ color: '#1c1d21', roughness: 0.45 });
      // spokes: one flowing shape per side, wide where it leaves the hub, narrowing as it curves into the rim; the switch
      // panels are inset into the spoke face (flush, not floating)
      for (const sd of [-1, 1]) {
        const sh = new THREE.Shape(); sh.moveTo(0.035, 0.045); sh.bezierCurveTo(0.09, 0.05, 0.14, 0.03, 0.19, 0.022); sh.lineTo(0.19, -0.018); sh.bezierCurveTo(0.15, -0.028, 0.12, -0.05, 0.1, -0.06); sh.bezierCurveTo(0.07, -0.068, 0.045, -0.06, 0.035, -0.04); sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 4, curveSegments: 16 }); geo.translate(0, 0, -0.018);
        const s = new THREE.Mesh(geo, sp); s.scale.x = sd; W.add(s);
        const panel = new THREE.Mesh(rbox(0.044, 0.034, 0.002, 0.005), new THREE.MeshStandardMaterial({ color: '#101114', roughness: 0.35 })); panel.position.set(sd * 0.09, -0.012, 0.0015); W.add(panel);
        for (const [bx, by] of [[-0.011, 0.008], [0.011, 0.008], [-0.011, -0.008], [0.011, -0.008]]) { const bt = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.011), new THREE.MeshStandardMaterial({ color: '#2a2c31', roughness: 0.4 })); bt.position.set(sd * 0.09 + bx, -0.012 + by, 0.0028); W.add(bt); }
      }
      const low = new THREE.Mesh(rbox(0.05, 0.13, 0.016, 0.014), sp); low.position.set(0, -0.12, -0.012); W.add(low);
      const hub = new THREE.Mesh(rbox(0.09, 0.075, 0.04, 0.025), sp); hub.position.set(0, 0.015, 0.0); W.add(hub);
      const crown = new THREE.Mesh(rbox(0.05, 0.02, 0.028, 0.008), M({ color: '#202126' })); crown.position.set(0, 0.058, 0.004); W.add(crown);
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.009, 20), chrome); badge.position.set(0, 0.02, 0.026); W.add(badge);
      // column: from behind the hub back along the wheel's axis into the housing
      const n = new THREE.Vector3(0, Math.sin(-WHEEL.tilt), Math.cos(WHEEL.tilt)), a = WHEEL.c.clone().addScaledVector(n, -0.03), b = WHEEL.c.clone().addScaledVector(n, -0.3);
      const col = new THREE.Mesh(rbox(0.11, 0.1, 0.27, 0.035), darker); col.position.copy(a).add(b).multiplyScalar(0.5); col.lookAt(b); g.add(col); this.parts.column = col;
      for (const sd of [-1, 1]) { const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13), darker); stalk.rotation.z = sd * 1.25; stalk.position.copy(a).addScaledVector(n, -0.05).add(new THREE.Vector3(sd * 0.1, 0.02, 0)); g.add(stalk); }
      add('housing', new THREE.Mesh(rbox(0.5, 0.24, 0.16, 0.06), dark), 0.08, 0.66, -0.74);
    }
    // centre stack: square vents, the yellow panel, a knob; floor console and gear lever
    {
      add('console', new THREE.Mesh(rbox(0.36, 0.44, 0.08, 0.03), dark), 0.6, 0.72, -0.74);
      for (const x of [0.51, 0.69]) { add(null, new THREE.Mesh(rbox(0.13, 0.07, 0.03, 0.01), darker), x, 0.86, -0.695); for (let k = 0; k < 4; k++) add(null, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.01), trim), x, 0.838 + k * 0.014, -0.678); }
      const panel = tex(256, 128, (c, w, h) => { c.fillStyle = '#e0b81c'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; for (let i = -2; i < 10; i++) { c.save(); c.translate(i * 34, 0); c.transform(1, 0, -0.6, 1, 0, 0); c.fillRect(0, 0, 14, h); c.restore(); } });
      add('panel', new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.12), new THREE.MeshStandardMaterial({ map: panel, roughness: 0.5, emissiveMap: panel, emissive: '#ffffff', emissiveIntensity: 0.12 })), 0.6, 0.68, -0.698);
      const knob = add(null, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 20), chrome), 0.66, 0.58, -0.69); knob.rotation.x = Math.PI / 2;
      add('tunnel', new THREE.Mesh(rbox(0.13, 0.2, 0.95, 0.04), dark), 0.385, 0.44, -0.2); add('armrest', new THREE.Mesh(rbox(0.12, 0.08, 0.36, 0.035), darker), 0.385, 0.6, 0.18);
      const lever = this.lever = new THREE.Group(); lever.position.set(0.385, 0.53, -0.36); g.add(lever);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.16), chrome); rod.position.y = 0.08; lever.add(rod);
      const kb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), darker); kb.position.y = 0.17; kb.scale.set(1, 1.3, 1); lever.add(kb);
    }
    // door trims on both sides (leather, with an armrest and a pull), A-pillar trims, roof liner, a seat for the driver
    {
      // door trims along the whole cabin on both sides (front door, rear door, rear quarter), armrests and pulls
      for (const [x, sd] of [[XL - 0.02, -1], [XR + 0.02, 1]]) {
        if (cabEnd > 1.0) add(null, new THREE.Mesh(rbox(0.04, 0.62, cabEnd - 0.9, 0.03), dark), x, 0.74, (0.9 + cabEnd) / 2);
        for (const z of [0.1, Math.min(0.9, cabEnd - 0.06)]) { const tr = add(null, new THREE.Mesh(rbox(0.05, 0.6, 0.1, 0.02), darker), x - sd * 0.1, 1.33, z); tr.rotation.z = sd * 0.1; }   // B and C pillar trims, leaning in with the glass
      }
      // A-pillar trims, inside the glass and the greenhouse
      for (const sd of [-1, 1]) { const a = new THREE.Vector3(0.375 + sd * 0.86, 1.0, -1.07), b = new THREE.Vector3(0.375 + sd * 0.79, 1.64, -0.49), d = b.clone().sub(a); const pil = new THREE.Mesh(rbox(0.09, d.length(), 0.06, 0.028), darker); pil.position.copy(a).add(b).multiplyScalar(0.5); pil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(pil); this.parts[sd < 0 ? 'pillarL' : 'pillarR'] = pil; }
      add('header', new THREE.Mesh(rbox(1.7, 0.03, cabEnd + 0.62, 0.012), darker), 0.375, 1.68, (cabEnd - 0.68) / 2);   // roof liner inside the greenhouse
      add('carpet', new THREE.Mesh(rbox(1.86, 0.02, cabEnd + 1.25, 0.008), M({ color: '#16171a', roughness: 0.95, map: carpetTex() })), 0.375, 0.34, (cabEnd - 1.3) / 2);
      if (!rear) { const wall = add('backWall', new THREE.Mesh(rbox(1.84, 0.62, 0.04, 0.02), dark), 0.375, 0.68, cabEnd - 0.03); }
      // seats: a sculpted cushion with side bolsters, a reclined curved backrest, a headrest; driver, passenger, rear bench
      const seatCol = opts.seat || '#2a2c31', seatMat = M({ color: seatCol, roughness: 0.6 }), bolMat = M({ color: new THREE.Color(seatCol).multiplyScalar(0.72), roughness: 0.55 });
      const insertMat = (w, h) => { const t = pleatTex(seatCol), b = pleatTex(seatCol, true); for (const m of [t, b]) { m.repeat.set(1 / w, 1 / h); m.offset.set(0.5, 0.5); } return new THREE.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: 1.2, roughness: 0.62 }); };
      // cushion rotation.x > 0 lifts the -z front edge; back rotation.x > 0 leans its top rearward (+z), away from the occupant
      const seat = (x, z, w) => {
        const S = new THREE.Group(); S.position.set(x, 0, z); g.add(S);
        const cush = new THREE.Mesh(rbox(w, 0.13, 0.52, 0.06), seatMat); cush.position.set(0, 0.5, 0); cush.rotation.x = 0.13; S.add(cush);
        const ci = new THREE.Mesh(rbox(w * 0.62, 0.44, 0.02, 0.008), insertMat(w * 0.62, 0.44)); ci.rotation.x = -Math.PI / 2; ci.position.set(0, 0.093, 0); cush.add(ci);   // the cushion's bevel adds 0.024 above its 0.065 half-height
        for (const sd of [-1, 1]) { const bol = new THREE.Mesh(rbox(0.07, 0.08, 0.5, 0.035), bolMat); bol.position.set(sd * (w / 2 - 0.04), 0.58, 0); S.add(bol); }
        const back = new THREE.Mesh(rbox(w, 0.68, 0.13, 0.07), seatMat); back.position.set(0, 0.9, 0.31); back.rotation.x = 0.24; S.add(back); const bi = new THREE.Mesh(rbox(w * 0.62, 0.46, 0.02, 0.008), insertMat(w * 0.62, 0.46)); bi.position.set(0, -0.03, -0.098); back.add(bi);
        for (const sd of [-1, 1]) { const wing = new THREE.Mesh(rbox(0.07, 0.6, 0.06, 0.03), bolMat); wing.position.set(sd * (w / 2 - 0.035), -0.02, -0.1); back.add(wing); }
        const head = new THREE.Mesh(rbox(w * 0.55, 0.17, 0.1, 0.05), seatMat); head.position.set(0, 1.36, 0.44); head.rotation.x = 0.2; S.add(head);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1), chrome); post.position.set(0, 1.27, 0.42); S.add(post);
        S.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return S;
      };
      this.seats = [seat(0.08, 0.08, 0.48), seat(0.69, 0.08, 0.48)];
      for (const x of [0.08, 0.69]) { add(null, new THREE.Mesh(rbox(0.36, 0.08, 0.4, 0.02), darker), x, 0.39, 0.1); for (const dx of [-0.13, 0.13]) add(null, new THREE.Mesh(rbox(0.03, 0.02, 0.5, 0.008), chrome), x + dx, 0.355, 0.1); }
      if (rear) this.seats.push(seat(0.375, 1.35, 1.6));
      if (cabEnd > 1.9) add('cargo', new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.03, 0.55), M({ color: '#16171a', roughness: 0.95 })), 0.375, 0.6, 1.95);
      const mir = this.mirror = new THREE.Group(); mir.position.set(0.5, 1.5, -0.7); mir.rotation.set(0.08, -0.25, 0); g.add(mir);
      mir.add(new THREE.Mesh(rbox(0.28, 0.08, 0.04, 0.02), darker));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065), new THREE.MeshStandardMaterial({ color: '#141a24', metalness: 1, roughness: 0.08 })); glass.position.z = 0.025; mir.add(glass);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), darker); stem.position.set(0, 0.08, -0.03); mir.add(stem);
    }
    // toe board under the dash, footwell rubber mats, brake pedal hung from under the dash, floor-hinged gas pedal
    {
      const toe = new THREE.Mesh(sweep([[-0.7, 0.5], [-0.78, 0.42], [-0.9, 0.36], [-0.95, 0.345]], -0.55, 1.3), M({ color: '#16171a', roughness: 0.95, map: carpetTex() })); toe.material.side = THREE.DoubleSide; add('toeBoard', toe, 0, 0, 0);
      const mat = M({ map: rubberMat(), roughness: 0.85 });
      for (const x of [0.1, 0.67]) { const m = add(null, new THREE.Mesh(rbox(0.46, 0.62, 0.012, 0.03), mat), x, 0.356, -0.38); m.rotation.x = -Math.PI / 2; }
      const pad = M({ map: padTex(), roughness: 0.7 }), steel = new THREE.MeshStandardMaterial({ color: '#3a3c40', metalness: 0.8, roughness: 0.4 });
      const brake = this.brake = new THREE.Group(); brake.position.set(0.02, 0.6, -0.74); g.add(brake);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.15, 4, 8), steel); arm.position.set(0, -0.075, 0.03); arm.rotation.x = 0.35; brake.add(arm);
      const bp = new THREE.Mesh(rbox(0.1, 0.075, 0.018, 0.012), pad); bp.position.set(0, -0.16, 0.06); bp.rotation.x = -0.45; brake.add(bp);
      const gas = this.gas = new THREE.Group(); gas.position.set(0.24, 0.37, -0.64); g.add(gas);
      const gp = new THREE.Mesh(rbox(0.055, 0.2, 0.014, 0.01), pad); gp.position.set(0, 0.095, -0.03); gp.rotation.x = -0.3; gas.add(gp);
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 12), steel); hinge.rotation.z = Math.PI / 2; gas.add(hinge);
      [arm, bp, gp, hinge].forEach((m) => (m.castShadow = m.receiveShadow = true));
    }
    // the cowl and wipers parked at the base of the glass
    {
      add(null, new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.025, 0.08), darker), (XL + XR) / 2, 0.985, -1.17);
      this.wipers = [];
      for (const x of [-0.35, 0.45]) { const pv = new THREE.Group(); pv.position.set(x, 1.0, -1.18); g.add(pv); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.006, 0.006), darker); arm.position.x = 0.3; pv.add(arm); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.01), darker); blade.position.set(0.32, 0.012, -0.01); pv.add(blade); pv.rotation.z = x < 0 ? 0.05 : 0.1; this.wipers.push(pv); }
    }
  }
  // thick door trims on each body door: shell with jambs (paint), leather upper insert with stitching, armrest with
  // window switches, pull handle in a cup, speaker grille, map pocket, rubber sill strip. Built in car frame inside the
  // door's inner group, so they swing with the door and read as real depth when it opens.
  attachDoorTrims(body, CX = 0.375) {
    const { M, dark, darker } = this.mats, chrome = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 1, roughness: 0.25 });
    const paint = body.M.white, upper = M({ map: stitchTex(this.opts.seat || '#2a2c31'), roughness: 0.6 }), grille = new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: 0.7 });
    for (const d of body.doors) {
      const sd = d.side, L = d.z1 - d.z0 - 0.03, zc = (d.z0 + d.z1) / 2, X = (v) => CX + sd * v, add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; d.inner.add(m); return m; };
      add(new THREE.Mesh(rbox(0.05, 0.47, L, 0.02), dark), X(0.958), 0.745, zc);                         // shell, inner face at 0.933
      for (const z of [d.z0 + 0.018, d.z1 - 0.018]) add(new THREE.Mesh(rbox(0.075, 0.47, 0.012, 0.005), paint), X(0.985), 0.745, z);   // shut faces
      add(new THREE.Mesh(rbox(0.075, 0.012, L, 0.005), paint), X(0.985), 0.515, zc);                         // bottom face
      const sill = add(new THREE.Mesh(rbox(0.05, 0.024, L, 0.01), darker), X(0.958), 0.985, zc);               // belt weatherstrip
      const up = add(new THREE.Mesh(rbox(0.016, 0.13, L - 0.1, 0.006), upper), X(0.928), 0.89, zc); up.material.map.repeat.set(1 / 0.13, 3); up.material.map.offset.set(-(0.89 - 0.065) / 0.13, 0);
      const ar = add(new THREE.Mesh(rbox(0.085, 0.05, L * 0.55, 0.022), darker), X(0.9), 0.735, zc + L * 0.16);
      for (let k = 0; k < (d.name === 'F' ? 3 : 1); k++) add(new THREE.Mesh(rbox(0.026, 0.008, 0.02, 0.003), new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.3 })), X(0.9), 0.762, zc + L * 0.3 - k * 0.032);
      add(new THREE.Mesh(rbox(0.012, 0.05, 0.15, 0.015), darker), X(0.929), 0.865, d.z0 + 0.22);                // pull cup
      add(new THREE.Mesh(rbox(0.016, 0.022, 0.12, 0.008), chrome), X(0.924), 0.868, d.z0 + 0.22);               // handle
      const spk = add(new THREE.Mesh(new THREE.CircleGeometry(0.07, 40), grille), X(0.931), 0.6, d.z0 + 0.2); spk.rotation.y = -sd * Math.PI / 2;
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.006, 8, 40), darker), X(0.931), 0.6, d.z0 + 0.2); ring.rotation.y = Math.PI / 2;
      add(new THREE.Mesh(rbox(0.035, 0.09, L * 0.45, 0.015), darker), X(0.918), 0.585, zc + L * 0.2);           // map pocket
      void sill;
    }
  }
  // grip points on the rim (wheel-local), for the drawn hands
  gripLocal(sd) { return new THREE.Vector3(sd * WHEEL.R * Math.cos(0.63), WHEEL.R * Math.sin(0.63), 0.016); }
  update(t, mph = 45, rpm = 2.4, steer = 0) {
    const ang = (v, max) => Math.PI * 0.75 + v / max * Math.PI * 1.5;
    this.needles[0].rotation.z = -(ang(mph, 120) - Math.PI * 1.5); this.needles[1].rotation.z = -(ang(rpm, 8) - Math.PI * 1.5);
    this.wheel.rotation.z = steer;
  }
}
