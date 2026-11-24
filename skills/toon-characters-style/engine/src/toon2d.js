// A 2D cartoon character redrawn every frame from a 3D skeleton (after the reference shorts), in the RefFolk look.
// - skeleton(p) poses an invisible 3D skeleton (2-bone IK arms/legs, spine bend). Hand targets blend from the rest pose
//   by weight; feet come in as planted world positions (the caller plans the footsteps), so nothing slides or jumps.
// - joints are projected along the camera ray onto camera-facing cards, so a drawn hand lands exactly where a 3D prop
//   at that point renders. Two cards: the body card just in front of the root, and a front card for arms that hold
//   something in front of the body (hands over the prop, prop over the torso).
// - far-side arm/leg always behind the torso; near-side ones in front only when their joint is in front of the body.
// - head = RefFolk face, always facing the camera, tilted in the picture plane; pupils look at the target (clamped
//   inside the eye); a squash-stretch bounce on every expression change.
// - body = egg: narrower at the top (tucked under the head), wider at the bottom, flat-ish base.
// - colour rule (from the references): the side away from the light is the lighter tone, the colour darkens toward
//   the light side, and thin shine lines run inside the outline on the light side. Body, cap and hair all follow it.
// - the cap and hair are 2D, redrawn every frame for the look direction, with a spring that lets the cap bounce.
import * as THREE from 'three/webgpu';
import { pose as facePose, INK, HEADK, changeFace, headBase } from './refface.js';
import { draw as faceDraw, sweat as faceSweat } from './face2d.js';
import { unTonedCardMaterial } from './unTone.js';
HEADK.on = 1;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export const BODY = { legLen: 0.84, thigh: 0.44, shin: 0.44, hipW: 0.075, torso: 0.46, torsoTop: 0.13, torsoBot: 0.19, shoulderW: 0.11, upperArm: 0.32, foreArm: 0.32, headR: 0.31, neck: 0.02 };
const HAIR_BUZZ = [[-1.0, -0.26], [-0.92, -0.72], [-0.5, -1.04], [0.1, -1.1], [0.66, -0.96], [1.0, -0.56], [1.02, -0.22], [0.86, -0.56], [0.5, -0.8], [0, -0.86], [-0.52, -0.8], [-0.86, -0.52]];

function ik2(A, T, l1, l2, pole) {
  const d = T.clone().sub(A); let L = d.length(); const maxL = (l1 + l2) * 0.999; if (L > maxL) { d.multiplyScalar(maxL / L); L = maxL; }
  const dir = d.clone().normalize(); const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L); const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return { J: A.clone().add(dir.clone().multiplyScalar(a)).add(pp.multiplyScalar(h)), E: A.clone().add(d) };
}
// p: { root, yaw, crouch, bend, hand: {L:{pos,w}, R:{pos,w}}, feet: {L:{pos,yaw}, R:{pos,yaw}}, bob }
export function skeleton(p) {
  const B = BODY, fwd = V(Math.sin(p.yaw), 0, Math.cos(p.yaw)), right = V(Math.cos(p.yaw), 0, -Math.sin(p.yaw)), up = V(0, 1, 0);
  const hipH = B.legLen * (1 - 0.58 * p.crouch) + (p.bob || 0);
  const hip = p.root.clone().addScaledVector(up, hipH).addScaledVector(fwd, -0.16 * p.crouch);
  const spineDir = up.clone().multiplyScalar(Math.cos(p.bend)).addScaledVector(fwd, Math.sin(p.bend));
  const chest = hip.clone().addScaledVector(spineDir, B.torso);
  const head = chest.clone().add(spineDir.clone().lerp(up, 0.12).normalize().multiplyScalar(B.neck + B.headR * 0.95));
  const shoulder = chest.clone().addScaledVector(spineDir, -0.035);
  const sL = shoulder.clone().addScaledVector(right, -B.shoulderW), sR = shoulder.clone().addScaledVector(right, B.shoulderW);
  const hL = hip.clone().addScaledVector(right, -B.hipW), hR = hip.clone().addScaledVector(right, B.hipW);
  const kneePole = fwd.clone().addScaledVector(up, 0.35);
  const legL = ik2(hL, p.feet.L.pos, B.thigh, B.shin, kneePole.clone().addScaledVector(right, -0.25)), legR = ik2(hR, p.feet.R.pos, B.thigh, B.shin, kneePole.clone().addScaledVector(right, 0.25));
  const rest = (s, sh) => sh.clone().add(V(0, -0.58, 0)).addScaledVector(right, s * 0.08).addScaledVector(fwd, 0.04);
  const hand = (s, sh, q) => q && q.w > 0 ? rest(s, sh).lerp(q.pos, q.w) : rest(s, sh);
  const elbowPole = (s) => fwd.clone().multiplyScalar(-0.5).add(V(0, -0.5, 0)).addScaledVector(right, s * 0.9);
  const armL = ik2(sL, hand(-1, sL, p.hand?.L), B.upperArm, B.foreArm, elbowPole(-1)), armR = ik2(sR, hand(1, sR, p.hand?.R), B.upperArm, B.foreArm, elbowPole(1));
  return { hip, chest, head, sL, sR, hL, hR, kL: legL.J, kR: legR.J, fL: legL.E, fR: legR.E, eL: armL.J, eR: armR.J, wL: armL.E, wR: armR.E, fwd, right, up, spineDir };
}
const WOB = [0.014, -0.018, 0.021, -0.009, 0.016, -0.022, 0.01, 0.018, -0.013, 0.007, -0.016, 0.02, -0.008, 0.013, -0.019, 0.011, 0.005, -0.012, 0.015, -0.006];
const smoothClosed = (pts) => { const P = new Path2D(), n = pts.length; P.moveTo(...pts[0]); for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; P.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); } P.closePath(); return P; };
const canvas = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
const mix = (a, b, k) => { const A = new THREE.Color(a), B2 = new THREE.Color(b); return '#' + A.lerp(B2, k).getHexString(); };

export class Toon2D {
  constructor(opts = {}) {
    this.o = { top: '#3e7a5a', shirt: '#f2ecd8', tie: '#a8483a', btn: '#e8dca8', cap: '#c4402e', capFront: '#f4efe4', hair: '#3a2a20', skin: '#ffffff', stache: '#3a2a20', seed: 9.1, ...opts };
    this.res = 1536; this.size = 2.6; this.lift = 0.12;
    this.cards = ['body', 'front'].map(() => {
      const cv = canvas(this.res), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const geo = new THREE.PlaneGeometry(this.size, this.size); geo.translate(0, this.size / 2 - this.lift, 0);
      const mesh = new THREE.Mesh(geo, unTonedCardMaterial(tex, 1.0));
      const shadow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide, colorWrite: false, depthWrite: false })); shadow.castShadow = true;
      return { cv, g: cv.getContext('2d'), tex, mesh, shadow };
    });
    this.L1 = canvas(this.res); this.L2 = canvas(this.res); this.SH = canvas(128);
    this.group = new THREE.Group(); for (const c of this.cards) this.group.add(c.mesh, c.shadow);
  }
  pose(p) { this.J = skeleton(p); this.p = p; }
  draw(camera) {
    const R = this.res, S = this.size, J = this.J, p = this.p;
    const cam = camera.position, toCam = cam.clone().sub(p.root); toCam.y = 0; toCam.normalize();
    const cr = V(toCam.z, 0, -toCam.x), cu = V(0, 1, 0), sun = p.sun;
    this.Lc = { x: sun.dot(cr), y: sun.dot(cu), z: sun.dot(toCam) };
    const depth = (w) => w.clone().sub(p.root).dot(toCam);
    // one projection per card plane
    const proj = (card, off) => {
      const P0 = p.root.clone().addScaledVector(toCam, off);
      const onPlane = (w) => { const d = w.clone().sub(cam), t = P0.clone().sub(cam).dot(toCam) / d.dot(toCam); return cam.clone().addScaledVector(d, t); };
      const O = onPlane(p.root), k = O.distanceTo(cam) / p.root.distanceTo(cam), m = R / S;
      card.mesh.position.copy(O); card.mesh.rotation.set(0, Math.atan2(toCam.x, toCam.z), 0);
      card.shadow.position.copy(p.root); card.shadow.rotation.set(0, Math.atan2(sun.x, sun.z), 0); card.shadow.scale.setScalar(1 / k);
      const back = (x, y) => { const P = O.clone().addScaledVector(cr, (x - R / 2) / m).addScaledVector(cu, (R - y) / m - this.lift), d = P.sub(cam), t = p.root.clone().sub(cam).dot(toCam) / d.dot(toCam); return cam.clone().addScaledVector(d, t); };
      return { px: (w) => { const q = onPlane(w).sub(O); return [R / 2 + q.dot(cr) * m, R - (q.dot(cu) + this.lift) * m]; }, back, ms: m * k, O, k, m };
    };
    const B = proj(this.cards[0], 0.12), F = proj(this.cards[1], 0.55);
    for (const c of this.cards) { c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, R, R); c.g.lineCap = 'round'; c.g.lineJoin = 'round'; }
    const turn = Math.atan2(J.fwd.dot(cr), J.fwd.dot(toCam));
    const limb = (g, P, a, b, c, foot) => {
      const A = P.px(a), Bp = P.px(b), C = P.px(c), ms = P.ms;
      g.strokeStyle = INK; g.lineWidth = 0.046 * ms; g.beginPath(); g.moveTo(...A);
      g.quadraticCurveTo(2 * Bp[0] - (A[0] + C[0]) / 2, 2 * Bp[1] - (A[1] + C[1]) / 2, C[0], C[1]); g.stroke();
      g.fillStyle = INK; g.beginPath();
      if (!foot) g.arc(C[0], C[1], 0.037 * ms, 0, 7);
      else { const fw = V(Math.sin(foot.yaw), 0, Math.cos(foot.yaw)), T = P.px(c.clone().addScaledVector(fw, 0.07)), H0 = P.px(c.clone().addScaledVector(fw, -0.02)); const ang = Math.atan2(T[1] - H0[1], T[0] - H0[0]), len = Math.hypot(T[0] - H0[0], T[1] - H0[1]); g.ellipse((T[0] + H0[0]) / 2, (T[1] + H0[1]) / 2, Math.max(0.03 * ms, len / 2 + 0.018 * ms), 0.025 * ms, ang, 0, 7); }
      g.fill();
    };
    const nearR = depth(J.hR) - depth(J.hL), torsoD = (depth(J.hip) + depth(J.chest)) / 2;
    const front = (sg, mid, ext) => sg * nearR > -0.03 && Math.max(depth(mid), depth(ext)) > torsoD + 0.02;
    const legLf = front(-1, J.kL, J.fL), legRf = front(1, J.kR, J.fR);
    const armLf = front(-1, J.eL, J.wL) || depth(J.wL) > torsoD + 0.2, armRf = front(1, J.eR, J.wR) || depth(J.wR) > torsoD + 0.2;
    this.order = { legLf, legRf, armLf, armRf };
    const g = this.cards[0].g;
    const legs = [[legLf, () => limb(g, B, J.hL, J.kL, J.fL, p.feet.L)], [legRf, () => limb(g, B, J.hR, J.kR, J.fR, p.feet.R)]];
    const armOn = (s) => p.armsFront ? () => limb(this.cards[1].g, F, s ? J.sR : J.sL, s ? J.eR : J.eL, s ? J.wR : J.wL, null) : () => limb(g, B, s ? J.sR : J.sL, s ? J.eR : J.eL, s ? J.wR : J.wL, null);
    const arms = [[armLf, armOn(0)], [armRf, armOn(1)]];
    for (const [f, d] of legs) if (!f) d(); if (!p.armsFront) for (const [f, d] of arms) if (!f) d();
    this.g = g; this.torso(B.px, B.ms, turn);
    for (const [f, d] of legs) if (f) d();
    this.lit(g, () => this.head(B.px, B.ms, toCam, cr), (G) => this.shadeSphere(G));
    this.faceShine(g, B.ms);
    this.g = g; this.hat(B.ms, toCam, cr, cu);
    if (!p.armsFront) { for (const [f, d] of arms) if (f) d(); } else { for (const [, d] of arms) d(); }
    this.scr = {}; for (const n of ['head', 'chest', 'hip', 'kL', 'kR', 'fL', 'fR', 'eL', 'eR', 'wL', 'wR']) this.scr[n] = B.px(J[n]).map(Math.round);
    if (p.shade) { this.shadeCard(this.cards[0], B, ['head', 'chest', 'hip', 'kL', 'kR', 'fL', 'fR', 'eL', 'eR', 'wL', 'wR'], 0.36); if (p.armsFront) this.shadeCard(this.cards[1], F, ['eL', 'eR', 'wL', 'wR', 'chest'], 0.12); }
    for (const c of this.cards) c.tex.needsUpdate = true;
  }
  // shade from scene occluders (e.g. a tree canopy): sample a grid over the drawing, ask the scene how much sun each
  // point loses, and lay a low-opacity blue-grey layer over only the drawn pixels there (soft-edged, dappled)
  shadeCard(card, P, names, pad) {
    const J = this.J, pts = names.map((n) => P.px(J[n])), m = P.ms, R = this.res;
    let x0 = Math.min(...pts.map((q) => q[0])) - pad * m * 1.4, x1 = Math.max(...pts.map((q) => q[0])) + pad * m * 1.4, y0 = Math.min(...pts.map((q) => q[1])) - pad * m * 1.6, y1 = Math.max(...pts.map((q) => q[1])) + pad * m * 0.5;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(R, x1); y1 = Math.min(R, y1); if (x1 <= x0 || y1 <= y0) return;
    const gw = 40, gh = 56; if (!this.SM) { this.SM = canvas(64); this.SM.width = gw; this.SM.height = gh; }
    const sg = this.SM.getContext('2d'), img = sg.createImageData(gw, gh); let any = 0;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const w = P.back(x0 + (i + 0.5) / gw * (x1 - x0), y0 + (j + 0.5) / gh * (y1 - y0)), s = this.p.shade(w), q = (j * gw + i) * 4; img.data[q] = 120; img.data[q + 1] = 140; img.data[q + 2] = 190; img.data[q + 3] = 255 * 0.55 * s; any += s; }
    if (!any) return; sg.putImageData(img, 0, 0);
    // multiply a blue-grey tint (white where lit) over the drawing, so ink stays black and colours dim slightly
    const b = this.L2.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.filter = 'none'; b.fillStyle = '#ffffff'; b.fillRect(0, 0, R, R); b.imageSmoothingEnabled = true; b.filter = `blur(${Math.round(0.01 * m)}px)`; b.drawImage(this.SM, x0, y0, x1 - x0, y1 - y0); b.filter = 'none';
    b.globalCompositeOperation = 'destination-in'; b.drawImage(card.cv, 0, 0); b.globalCompositeOperation = 'source-over';
    const g = card.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(this.L2, 0, 0); g.restore();
  }
  lit(g0, drawFn, shadeFn) {
    const R = this.res, a = this.L1.getContext('2d'), b = this.L2.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, R, R); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, R, R);
    this.g = a; a.lineCap = 'round'; a.lineJoin = 'round'; drawFn(); this.g = g0;
    shadeFn(b); b.globalCompositeOperation = 'destination-in'; b.drawImage(this.L1, 0, 0); b.globalCompositeOperation = 'source-over';
    a.globalCompositeOperation = 'multiply'; a.drawImage(this.L2, 0, 0); a.globalCompositeOperation = 'source-over';
    g0.drawImage(this.L1, 0, 0);
  }
  // face, cel-shaded: one light main tone, and a hard-edged darker crescent along the light-side edge (the shine sits in it)
  shadeSphere(G) {
    const H = this.hd, Lc = this.Lc, n = 256; if (!this.SH2) this.SH2 = canvas(n);
    const sg = this.SH2.getContext('2d'), img = sg.createImageData(n, n), d = img.data;
    const lxy = Math.hypot(Lc.x, Lc.y) || 1, ux = Lc.x / lxy, uy = -Lc.y / lxy;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * 2 - 1, y = (j + 0.5) / n * 2 - 1, q = (j * n + i) * 4;
      const cel = sm(0.885, 0.905, Math.hypot(x + ux * 0.2, y + uy * 0.2));
      d[q] = 255 - 62 * cel; d[q + 1] = 254 - 58 * cel; d[q + 2] = 255 - 30 * cel; d[q + 3] = 255;
    }
    sg.putImageData(img, 0, 0); G.fillStyle = '#fff'; G.fillRect(0, 0, this.res, this.res);
    const r = H.r * 1.04; G.drawImage(this.SH2, H.C[0] - r, H.C[1] - r, r * 2, r * 2);
  }
  // the colour rule: lighter on the side away from the light, darker toward it
  shadeShine(g, path, x0, x1, y0, y1, side) {
    g.save(); g.clip(path);
    const gr = g.createLinearGradient(side > 0 ? x0 : x1, 0, side > 0 ? x1 : x0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(20,16,40,0.12)'); gr.addColorStop(1, 'rgba(20,16,40,0.3)');
    g.fillStyle = gr; g.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
    g.restore();
  }
  // a shine that follows the shape's own outline: the outline pulled in a little toward (cx,cy), stroked only on the light
  // side (u = light direction on the canvas), fading out at both ends. blur > 0 gives a soft cloth sheen instead of a line.
  rimShine(g, path, cx, cy, sx, sy, ux, uy, span, w, alpha, from, blur = 0) {
    g.save(); const big = 5000, px = -uy, py = ux, ox = cx + ux * from * span, oy = cy + uy * from * span;
    const c = new Path2D(); c.moveTo(ox + px * big, oy + py * big); c.lineTo(ox - px * big, oy - py * big); c.lineTo(ox - px * big + ux * big, oy - py * big + uy * big); c.lineTo(ox + px * big + ux * big, oy + py * big + uy * big); c.closePath(); g.clip(c);
    const gr = g.createLinearGradient(cx - px * span, cy - py * span, cx + px * span, cy + py * span);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.28, `rgba(255,255,255,${alpha})`); gr.addColorStop(0.72, `rgba(255,255,255,${alpha})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    if (blur) g.filter = `blur(${blur}px)`;
    g.translate(cx, cy); g.scale(sx, sy); g.translate(-cx, -cy);
    g.strokeStyle = gr; g.lineCap = 'round'; g.lineWidth = w / Math.min(sx, sy); g.stroke(path); g.restore();
  }
  torso(px, m, turn) {
    const g = this.g, J = this.J, o = this.o, B = BODY, Lc = this.Lc;
    const A = px(J.hip.clone().addScaledVector(J.spineDir, -0.13)), Bp = px(J.chest.clone().addScaledVector(J.spineDir, 0.1));
    const dx = Bp[0] - A[0], dy = Bp[1] - A[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) + Math.PI / 2;
    const side = Math.abs(Math.cos(turn)), wb = 2 * B.torsoBot * m * (0.86 + 0.14 * side), wt = 2 * B.torsoTop * m * (0.86 + 0.14 * side), h = len;
    g.save(); g.translate((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2); g.rotate(ang);
    // egg: top (under the head) narrower, sides swell out, wide flat-ish base with rounded corners
    const top = -h / 2, bot = h / 2, P = new Path2D();
    P.moveTo(-wt / 2, top);
    P.bezierCurveTo(-wt / 2 - (wb - wt) * 0.35, top + h * 0.3, -wb / 2, bot - h * 0.55, -wb / 2, bot - h * 0.28);
    P.bezierCurveTo(-wb / 2, bot - h * 0.06, -wb * 0.3, bot, 0, bot);
    P.bezierCurveTo(wb * 0.3, bot, wb / 2, bot - h * 0.06, wb / 2, bot - h * 0.28);
    P.bezierCurveTo(wb / 2, bot - h * 0.55, wt / 2 + (wb - wt) * 0.35, top + h * 0.3, wt / 2, top);
    P.quadraticCurveTo(0, top - wt * 0.12, -wt / 2, top); P.closePath();
    g.fillStyle = o.top; g.fill(P); g.save(); g.clip(P);
    const W = wb, X = (phi) => (W / 2) * Math.sin(phi);
    for (let i = -12; i <= 12; i++) { const phi = i * 0.3 + turn; if (Math.cos(phi) < 0.02) continue; const x = X(phi), bw = W * 0.065 * Math.cos(phi); g.fillStyle = i % 2 ? 'rgba(30,62,48,0.55)' : 'rgba(232,220,168,0.22)'; g.fillRect(x - bw / 2, -h, i % 2 ? bw : bw * 0.35, h * 2); }
    for (let y = top; y < bot; y += W * 0.14) { g.fillStyle = 'rgba(30,62,48,0.5)'; g.fillRect(-W, y, W * 2, W * 0.045); g.fillStyle = 'rgba(232,220,168,0.2)'; g.fillRect(-W, y + W * 0.085, W * 2, W * 0.011); }
    const cf = Math.cos(turn);
    if (cf > 0.05) {
      const x0 = X(turn) * 0.92, sc = cf, nt = top + h * 0.12;
      g.fillStyle = o.shirt; g.beginPath(); g.moveTo(x0 - W * 0.17 * sc, top - 5); g.lineTo(x0, nt + W * 0.5); g.lineTo(x0 + W * 0.17 * sc, top - 5); g.closePath(); g.fill();
      g.fillStyle = o.tie; g.strokeStyle = INK; g.lineWidth = 0.006 * m; g.beginPath(); g.moveTo(x0 - W * 0.03 * sc, nt); g.lineTo(x0 + W * 0.03 * sc, nt); g.lineTo(x0 + W * 0.045 * sc, nt + W * 0.42); g.lineTo(x0, nt + W * 0.49); g.lineTo(x0 - W * 0.045 * sc, nt + W * 0.42); g.closePath(); g.fill(); g.stroke();
      g.lineWidth = 0.009 * m; g.beginPath(); g.moveTo(x0 - W * 0.17 * sc, top - 5); g.lineTo(x0, nt + W * 0.5); g.lineTo(x0 + W * 0.17 * sc, top - 5); g.stroke();
      g.beginPath(); g.moveTo(x0, nt + W * 0.5); g.lineTo(x0, bot); g.stroke();
      g.fillStyle = o.btn; for (let b = 0; b < 2; b++) { g.beginPath(); g.ellipse(x0 + W * 0.045 * sc, nt + W * 0.66 + b * W * 0.26, 0.011 * m * sc + 0.002 * m, 0.011 * m, 0, 0, 7); g.fill(); g.lineWidth = 0.004 * m; g.stroke(); }
    }
    g.restore();
    // light direction in the torso's own frame, biased sideways so the shine runs down the side of the body
    const lx0 = Lc.x * Math.cos(ang) - Lc.y * Math.sin(ang), ly0 = -Lc.x * Math.sin(ang) - Lc.y * Math.cos(ang), ll = Math.hypot(lx0, ly0 * 0.5) || 1, ux = lx0 / ll, uy = ly0 * 0.5 / ll;
    this.shadeShine(g, P, -wb / 2, wb / 2, top, bot, Math.sign(ux) || 1);
    g.save(); g.clip(P);
    this.rimShine(g, P, 0, 0, 0.78, 0.88, ux, uy, h * 0.6, wb * 0.16, 0.22, 0.05, wb * 0.06);   // cloth sheen
    this.rimShine(g, P, 0, 0, 0.935, 0.965, ux, uy, h * 0.6, 0.01 * m, 0.5, 0.25);               // shine line hugging the edge
    this.rimShine(g, P, 0, 0, 0.86, 0.93, ux, uy, h * 0.45, 0.006 * m, 0.38, 0.5);
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.022 * m; g.stroke(P); g.restore();
  }
  head(px, m, toCam, cr) {
    const g = this.g, J = this.J, o = this.o, p = this.p;
    const C = px(J.head), r = BODY.headR * m, N = px(J.chest);
    const tilt = Math.atan2(C[0] - N[0], N[1] - C[1]) * 1.05;
    let lx = 0, ly = 0; if (p.lookAt) { const T = px(p.lookAt); const dx = T[0] - C[0], dy = T[1] - C[1], l = Math.hypot(dx, dy) || 1; lx = dx / l; ly = dy / l; }
    const c = Math.cos(-tilt), s = Math.sin(-tilt), f = p.face;   // f = features worked out this frame from the emotions
    const look = { x: (lx * c - ly * s) * 0.12, y: (lx * s + ly * c) * 0.09 };
    const sq = p.bounce || 0;
    this.hd = { C, r, tilt, sq };
    // look direction relative to the camera (-1 left .. 1 right) for the cap and hair
    const lk = p.lookAt ? p.lookAt.clone().sub(J.head).setY(0).normalize() : J.fwd.clone();
    this.hd.lookDown = p.lookAt ? Math.max(0, Math.min(0.3, (J.head.y - p.lookAt.y) * 0.22)) : 0;
    this.hd.lyaw = Math.max(-1, Math.min(1, lk.dot(cr) * 0.8 + J.fwd.dot(cr) * 0.2));
    g.save(); g.translate(C[0], C[1]); g.rotate(tilt); g.scale(1 + sq, 1 - sq); headBase(g, r, o.seed, o.skin); faceDraw(g, r, f, look, p.t || 0); g.restore();
    g.save(); g.translate(C[0], C[1]); g.rotate(tilt); faceSweat(g, r, f); g.restore();
    // moustache follows the mouth: width with the mouth, ends droop with a frown
    g.save(); g.translate(C[0], C[1]); g.rotate(tilt); g.scale(1 + sq, 1 - sq); g.fillStyle = o.stache; g.strokeStyle = INK; g.lineWidth = r * 0.03;
    const my = Math.max(r * 0.21, f.my * r - r * 0.115 - (f.mH > 0.03 ? f.mH * r * (0.35 + 1.6 * Math.max(0, -f.mC)) : 0)), sw = r * Math.max(0.2, f.mW * 0.5), droop = -Math.min(0, f.mC) * r * 0.9 + Math.max(0, f.mC) * -r * 0.3;
    for (const sd of [-1, 1]) {
      const tip = sd * sw * 1.02, ty = my - r * 0.02 + droop, P = new Path2D();
      P.moveTo(sd * r * 0.015, my - r * 0.055);
      P.bezierCurveTo(sd * sw * 0.35, my - r * 0.1, sd * sw * 0.8, my - r * 0.075 + droop * 0.5, tip, ty - r * 0.035);
      P.quadraticCurveTo(tip + sd * r * 0.05, ty - r * 0.07, tip + sd * r * 0.03, ty - r * 0.1);
      P.quadraticCurveTo(tip + sd * r * 0.085, ty - r * 0.06, tip + sd * r * 0.02, ty + r * 0.02);
      P.bezierCurveTo(sd * sw * 0.75, my + r * 0.085 + droop * 0.6, sd * sw * 0.3, my + r * 0.08, sd * r * 0.01, my + r * 0.035);
      P.quadraticCurveTo(0, my - r * 0.01, sd * r * 0.015, my - r * 0.055); P.closePath();
      g.fillStyle = o.stache; g.fill(P); g.strokeStyle = INK; g.lineWidth = r * 0.032; g.stroke(P);
      g.save(); g.clip(P); g.strokeStyle = 'rgba(255,235,210,0.4)'; g.lineWidth = r * 0.016; g.beginPath(); g.moveTo(sd * sw * 0.2, my - r * 0.045); g.quadraticCurveTo(sd * sw * 0.55, my - r * 0.07 + droop * 0.3, sd * sw * 0.85, my - r * 0.04 + droop * 0.7); g.stroke(); g.restore();
    }
    g.restore();
  }
  // face shine: lines following the head's curve inside the cel crescent, one along the upper edge, one round the jaw corner
  faceShine(g, m) {
    const H = this.hd, Lc = this.Lc, lxy = Math.hypot(Lc.x, Lc.y) || 1, ux = Lc.x / lxy, uy = -Lc.y / lxy, r = H.r;
    const head = new Path2D(); head.arc(H.C[0], H.C[1], r, 0, Math.PI * 2);
    this.rimShine(g, head, H.C[0], H.C[1], 0.915, 0.915, ux, uy, r, 0.016 * m, 0.95, 0.22);
    const a = 0.85, jx = ux * Math.cos(a) - uy * Math.sin(a), jy = ux * Math.sin(a) + uy * Math.cos(a);   // turned toward the jaw
    this.rimShine(g, head, H.C[0], H.C[1], 0.9, 0.9, jx, jy, r * 0.75, 0.01 * m, 0.85, 0.6);
  }
  // hair tufts and the cap, drawn in the head frame for the look direction; the cap pitches forward with the bend and
  // sits on a spring. Hand-drawn: every outline point carries a fixed wobble, nothing is a perfect ellipse.
  hat(m, toCam, cr, cu) {
    const g = this.g, H = this.hd, o = this.o, p = this.p, r = H.r, ly = H.lyaw, sp = p.hatSpring || { x: 0, y: 0, rot: 0 };
    const pitch = Math.max(0, Math.min(1, (p.bend || 0) * 0.6 + (H.lookDown || 0)));
    const ct = Math.cos(-H.tilt), st = Math.sin(-H.tilt); let ux = this.Lc.x * ct + this.Lc.y * st, uy = this.Lc.x * st - this.Lc.y * ct; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    g.save(); g.translate(H.C[0], H.C[1]); g.rotate(H.tilt); g.scale(1 + H.sq, 1 - H.sq);
    // hair: tufts poking out under the cap on both sides, head-sized; the side the head turns away from shows more
    for (const sd of [-1, 1]) {
      const vis = Math.max(0.55, Math.min(1.3, 1 - sd * ly * 0.45)), P = new Path2D(), pt = (th, R) => { const a = sd > 0 ? th : Math.PI - th; return [Math.cos(a) * R * r, Math.sin(a) * R * r]; };
      const T = [[-0.7, 1.13, 0.0], [-0.46, 1.17, 0.02], [-0.22, 1.1, -0.01]];
      P.moveTo(...pt(-0.82, 0.86)); P.lineTo(...pt(-0.82, 0.99));
      T.forEach(([th, R, wv], i) => { const tip = pt(th + 0.12, 1 + (R - 1) * vis + wv), base = pt(th + 0.2, 0.985), ctl = pt(th + 0.02, 1.02 + (R - 1) * vis * 0.6); P.quadraticCurveTo(ctl[0], ctl[1], tip[0], tip[1]); P.quadraticCurveTo(...pt(th + 0.17, 1.02), base[0], base[1]); });
      P.lineTo(...pt(-0.02, 0.86)); P.closePath();
      g.fillStyle = o.hair; g.fill(P);
      if (sd * ux > -0.2) { g.save(); g.clip(P); g.strokeStyle = 'rgba(255,240,225,0.6)'; g.lineCap = 'round'; g.lineWidth = r * 0.03; const a0 = pt(-0.76, 1.0), a1 = pt(-0.44, 1.08), a2 = pt(-0.12, 1.0); g.beginPath(); g.moveTo(...a0); g.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]); g.stroke(); g.lineWidth = r * 0.016; const b0 = pt(-0.7, 0.93), b1 = pt(-0.5, 0.95); g.beginPath(); g.moveTo(...b0); g.lineTo(...b1); g.stroke(); g.restore(); }
      g.strokeStyle = INK; g.lineWidth = r * 0.04; g.lineJoin = 'round'; g.stroke(P);
    }
    g.translate(sp.x * m, -sp.y * m); g.rotate(sp.rot);
    const tw = -ly * 0.16, lift = pitch * 0.16, low = pitch * 0.1, x0 = ly * 0.26;
    const crownPts = [[-1.04, -0.62 + low * 0.4], [-1.11, -0.88], [-0.99, -1.17 - lift * 0.5], [-0.56 + tw, -1.37 - lift], [0.04 + tw, -1.43 - lift], [0.6 + tw, -1.36 - lift], [1.0, -1.15 - lift * 0.5], [1.11, -0.86], [1.04, -0.6 + low * 0.4], [0.56 + x0 * 0.6, -0.5 + low], [x0, -0.46 + low], [-0.56 + x0 * 0.6, -0.5 + low]]
      .map(([x, y], i) => [(x + WOB[i]) * r, (y + WOB[i + 6]) * r]);
    const crown = smoothClosed(crownPts);
    const capDark = mix(o.cap, '#2a1020', 0.3);
    g.fillStyle = o.cap; g.fill(crown);
    g.save(); g.clip(crown);
    // front panel (cream) and seams ride the look direction; the panel narrows as the cap turns
    const fw = 0.5 * (1 - 0.45 * Math.abs(ly)), topY = -1.43 - lift, fp = new Path2D();
    fp.moveTo((x0 - fw - 0.04) * r, -0.4 * r + low * r); fp.bezierCurveTo((x0 - fw * 1.1) * r, -0.95 * r, (x0 * 0.4 - fw * 0.75 + tw * 0.5) * r, (topY + 0.12) * r, (tw * 0.6 + 0.04) * r, (topY + 0.01) * r);
    fp.bezierCurveTo((x0 * 0.4 + fw * 0.75 + tw * 0.5) * r, (topY + 0.12) * r, (x0 + fw * 1.1) * r, -0.95 * r, (x0 + fw + 0.04) * r, -0.4 * r + low * r); fp.closePath();
    g.fillStyle = o.capFront; g.fill(fp); g.strokeStyle = INK; g.lineWidth = r * 0.03; g.stroke(fp);
    g.strokeStyle = mix(o.capFront, '#6a5040', 0.45); g.lineWidth = r * 0.02; g.beginPath(); g.moveTo((tw * 0.6 + 0.04) * r, (topY + 0.03) * r); g.quadraticCurveTo((x0 * 0.7 + tw * 0.3) * r, -0.9 * r, x0 * r, (-0.44 + low) * r); g.stroke();
    g.strokeStyle = capDark; for (const k of [-1, 1]) { g.beginPath(); g.moveTo((tw * 0.6 + 0.04) * r, (topY + 0.03) * r); g.quadraticCurveTo((x0 + k * (fw + 0.42)) * r, -1.0 * r, (x0 + k * (fw + 0.5)) * r, -0.5 * r); g.stroke(); }
    g.restore();
    this.shadeShine(g, crown, -1.1 * r, 1.1 * r, (topY) * r, -0.4 * r, Math.sign(ux) || 1);
    g.save(); g.clip(crown);
    this.rimShine(g, crown, tw * 0.3 * r, -0.95 * r, 0.88, 0.86, ux, uy * 0.6, r * 1.1, 0.012 * m, 0.5, 0.15);
    this.rimShine(g, crown, tw * 0.3 * r, -0.95 * r, 0.76, 0.72, ux, uy * 0.6, r * 0.8, 0.007 * m, 0.35, 0.35);
    g.restore();
    g.strokeStyle = INK; g.lineWidth = r * 0.05; g.lineJoin = 'round'; g.stroke(crown);
    // brim: follows the bottom of the crown; it grows toward the look side and drops/deepens as he pitches forward
    const ext = (s) => Math.max(0, s * ly) * 0.45, dep = 0.085 + 0.07 * pitch;
    const brimPts = [[-1.05 - ext(-1), -0.6 + low * 0.4], [-0.55 + x0 * 0.6, -0.49 + low], [x0, -0.45 + low], [0.55 + x0 * 0.6, -0.49 + low], [1.05 + ext(1), -0.6 + low * 0.4],
      [1.0 + ext(1) * 1.1, -0.52 + low * 0.4 + dep * 0.4], [0.55 + x0 * 0.7, -0.45 + low + dep * 0.95], [x0 * 1.1, -0.42 + low + dep * 1.1], [-0.55 + x0 * 0.7, -0.45 + low + dep * 0.95], [-1.0 - ext(-1) * 1.1, -0.52 + low * 0.4 + dep * 0.4]]
      .map(([x, y], i) => [(x + WOB[i + 3] * 0.6) * r, (y + WOB[i + 9] * 0.4) * r]);
    const brim = smoothClosed(brimPts);
    g.fillStyle = mix(o.cap, '#2a1020', 0.08); g.fill(brim);
    g.save(); g.clip(brim); g.fillStyle = capDark; g.beginPath(); g.moveTo(-2 * r, (-0.4 + low + dep * 0.75) * r); g.quadraticCurveTo(x0 * r, (-0.38 + low + dep * 1.0) * r, 2 * r, (-0.4 + low + dep * 0.75) * r); g.lineTo(2 * r, 0); g.lineTo(-2 * r, 0); g.closePath(); g.fill(); g.restore();   // underside edge
    this.shadeShine(g, brim, -1.1 * r, 1.1 * r, -0.6 * r, -0.2 * r, Math.sign(ux) || 1);
    g.save(); g.clip(brim); this.rimShine(g, brim, x0 * r, -0.4 * r, 0.9, 0.55, ux, 0.15, r * 1.0, 0.007 * m, 0.45, 0.2); g.restore();
    g.strokeStyle = INK; g.lineWidth = r * 0.048; g.stroke(brim);
    // button on top
    g.fillStyle = capDark; g.beginPath(); g.ellipse((tw * 0.6 + 0.04) * r, (topY + 0.03) * r, r * 0.075, r * 0.04, 0.05, 0, 7); g.fill(); g.lineWidth = r * 0.028; g.stroke();
    g.restore();
  }
}
export { facePose, changeFace };
