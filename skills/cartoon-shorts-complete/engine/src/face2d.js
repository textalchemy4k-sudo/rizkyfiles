// A face drawn every frame from what the character feels (not from presets), in the reference shorts' style.
// Measured on the reference faces (head radius R = 1):
//   eyes: small solid black ovals ~0.05 x 0.075, centres at x = +-0.2, y = -0.02. Surprise turns them into white circles
//         (r up to ~0.15) with a thick outline and a small round pupil. Tired / doubtful / angry: a flat, thick lid line cuts
//         the top of the eye, a little wider than the eye. Strain: thick ">" "<" chevrons. Blink: a short downward arc.
//   brows: short (~0.24), thick (~0.06) bars with rounded ends, gently arched, ~0.19 above the eyes, often uneven.
//   mouth: centred at y ~0.3, compact. Closed: a short line whose corners follow the feeling. Open: dark mouth with a red
//          tongue; with teeth: a white tooth row with tooth lines (a grin when happy or talking, a gritted grid when
//          straining or angry). Shock / fear: a rounded open mouth taller than wide, corners pulled down.
// emotions (0..1): surprise, fear, anger, joy, sad, effort, doubt, tired, blow. life: blink, browJit, talk.
import { INK, drop } from './refface.js';
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const L = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };

export function features(E, life = {}) {
  const s = E.surprise || 0, f = E.fear || 0, a = E.anger || 0, j = E.joy || 0, sd = E.sad || 0, ef = E.effort || 0, d = E.doubt || 0, tr = E.tired || 0, bw = E.blow || 0;
  const squeeze = cl((ef - 0.62) / 0.25);
  const wide = cl(s * 1.05 + f * 0.8 - a * 0.5 - ef * 0.8 - tr * 0.6 - d * 0.4);
  const side = (k) => {                                   // k = -1 his right (screen left), +1 screen right; doubt lifts the screen-right brow
    const up = k > 0;
    return {
      lid: Math.max(cl(tr * 0.55 + a * 0.38 + d * 0.34 + sd * 0.15 - (wide > 0.38 ? 1 : 0)) * (1 - squeeze), cl(life.blink || 0)),   // a blink closes either eye type   // same lid on both eyes: never two eye types at once
      lidA: a * 0.35 - (sd + f) * 0.22 + d * 0.05,   // + inner end down (glare), - inner end up (worry)
      bY: -0.23 - s * 0.1 - f * 0.06 + a * 0.05 + ef * 0.03 - sd * 0.01 + (up ? -d * 0.08 : d * 0.025) + (life.browJit || 0) * (up ? 1 : 0.6) + (up ? 0.008 : -0.006),
      bA: a * 0.45 + ef * 0.3 - f * 0.4 - sd * 0.42 - s * 0.05 + (up ? -d * 0.25 : d * 0.18),
    };
  };
  const talk = life.talk || 0;
  const open = cl(s * 0.34 + f * 0.2 + ef * 0.05 + a * 0.05 + talk * 0.1 + j * 0.06 - bw * 0.2, 0, 0.24);
  const teeth = cl(sm(0.3, 0.55, ef) + sm(0.55, 0.8, a) + sm(0.25, 0.5, j) * (open > 0.05 ? 1 : 0));
  return {
    wide, squeeze, Ls: side(-1), Rs: side(1),
    mW: bw > 0.3 ? L(0.2, 0.09, sm(0.3, 0.8, bw)) : 0.24 + ef * 0.3 + a * 0.1 + j * 0.3 + f * 0.05 - s * 0.07 + talk * 0.05,
    mH: bw > 0.3 ? L(open, 0.075, sm(0.3, 0.8, bw)) : open,
    mC: j * 0.09 - sd * 0.07 - f * 0.08 - s * 0.05 - a * 0.05 - ef * 0.03 - d * 0.015,
    mSkew: d * 0.035 + j * 0.0, teeth, blow: bw,
    happyEyes: sm(0.6, 0.85, j),                         // a big laugh closes the eyes into arcs
    sweat: f > 0.55 || ef > 0.65 ? 1 : 0, drops: f > 0.85 ? 1 : 0, my: 0.37,
  };
}

export function draw(g, R, F, look = { x: 0, y: 0 }, t = 0) {
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = INK;
  const ex = 0.27, ey = -0.06;
  const ring = F.wide > 0.38 ? 1 : 0;                     // dot eyes or ring eyes, switched outright (never faded); the caller hides the switch in a blink
  for (const k of [-1, 1]) {
    const S = k < 0 ? F.Ls : F.Rs, x = (k * ex - k * 0.02 * F.wide) * R, y = ey * R;
    if (F.squeeze > 0.5) { g.lineWidth = R * 0.07; const sz = 0.1 * R; g.beginPath(); g.moveTo(x + k * sz, y - sz); g.lineTo(x - k * sz * 0.7, y); g.lineTo(x + k * sz, y + sz); g.stroke(); }
    else if (F.happyEyes > 0.5) { g.lineWidth = R * 0.045; g.beginPath(); g.arc(x, y + R * 0.04, R * 0.07, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else {
      const blink = cl(S.lid);
      const rx = L(0.082, 0.19, ring) * R, ry = L(0.122, 0.195, ring) * R;
      if (blink > 0.94) { g.lineWidth = R * 0.04; g.beginPath(); g.arc(x, y - R * 0.05, R * 0.07, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
      else {
        g.save();
        // the lid: everything above a flat (slanted) line is cut away
        const lidY = y - ry + blink * ry * 2, kk = S.lidA * R * 0.12;
        if (blink > 0.01) { const cp = new Path2D(); cp.moveTo(x - rx * 3, lidY + k * kk * 3); cp.lineTo(x + rx * 3, lidY - k * kk * 3); cp.lineTo(x + rx * 3, y + R); cp.lineTo(x - rx * 3, y + R); cp.closePath(); g.clip(cp); }
        const lx = look.x * R, ly = look.y * R;
        if (ring > 0.01) {
          g.globalAlpha = ring; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.lineWidth = R * 0.042; g.strokeStyle = INK; g.stroke(); g.globalAlpha = 1;
          const pr = R * 0.075, room = Math.min(rx, ry) - pr - R * 0.03, ll = Math.hypot(lx, ly), sc = ll > room ? room / (ll || 1) : 1;
          g.fillStyle = INK; g.globalAlpha = ring; g.beginPath(); g.arc(x + lx * sc, y + ly * sc, pr, 0, 7); g.fill(); g.globalAlpha = 1;
        }
        if (ring < 0.99) { g.globalAlpha = 1 - ring; g.fillStyle = INK; const mv = 0.35; g.beginPath(); g.ellipse(x + lx * mv, y + ly * mv, rx, ry, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
        g.restore();
        if (blink > 0.06) { g.lineWidth = R * 0.075; const hw = rx * 1.55 + R * 0.02; g.beginPath(); g.moveTo(x - hw, lidY + k * kk * hw / rx); g.lineTo(x + hw, lidY - k * kk * hw / rx); g.stroke(); }
      }
    }
    // brow: a thick rounded bar, gently arched; angle and height from the feeling
    const by = y + S.bY * R - (ring * 0.07) * R, len = 0.29 * R, A = S.bA, ix = x - k * len / 2, ox = x + k * len / 2, iy = by + A * len * 0.5, oy = by - A * len * 0.5;
    g.lineWidth = R * 0.075; g.strokeStyle = INK; g.beginPath(); g.moveTo(ix, iy); g.quadraticCurveTo(x, (iy + oy) / 2 - R * 0.035, ox, oy); g.stroke();
  }
  // mouth
  const w = F.mW * R, h = F.mH * R, c = F.mC * R, my = F.my * R, sk = F.mSkew * R;
  g.strokeStyle = INK; g.fillStyle = INK;
  if (F.blow > 0.6) { g.lineWidth = R * 0.04; g.beginPath(); g.ellipse(0, my, w * 0.5, h * 0.6 + R * 0.03, 0, 0, 7); g.fill(); g.fillStyle = '#d8505a'; g.beginPath(); g.ellipse(0, my + R * 0.012, w * 0.22, R * 0.018, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = R * 0.03; for (let i = 0; i < 3; i++) { const yy = my + (i - 1) * R * 0.07, x0 = R * (0.12 + ((t * 3 + i * 0.3) % 1) * 0.22); g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo(x0 + R * 0.06, yy - R * 0.025, x0 + R * 0.12, yy); g.stroke(); }
    return { my: F.my, mW: F.mW, mH: F.mH, mC: F.mC };
  }
  if (h < R * 0.025 && F.teeth < 0.3) {                   // closed: a short line, corners from the feeling
    const bw = Math.max(R * 0.1, w * 0.62), th = R * (0.05 + 0.012 * Math.abs(F.mC) * 10), bend = c * 1.1, lx = -bw / 2, rx2 = bw / 2;
    const P = new Path2D(); P.moveTo(lx, my - bend + sk);
    P.bezierCurveTo(lx + bw * 0.25, my - th * 0.62 + bend * 0.1, rx2 - bw * 0.3, my - th * 0.5 + bend * 0.1, rx2, my - bend - sk - th * 0.05);
    P.bezierCurveTo(rx2 + th * 0.55, my - bend - sk + th * 0.35, rx2 - bw * 0.05, my + th * 0.62 + bend * 0.15, rx2 - bw * 0.35, my + th * 0.55 + bend * 0.9);
    P.bezierCurveTo(lx + bw * 0.3, my + th * 0.5 + bend * 0.9, lx - th * 0.4, my + th * 0.3 - bend * 0.5 + sk, lx, my - bend + sk); P.closePath();
    g.fill(P); g.lineWidth = R * 0.018; g.stroke(P);
  } else if (F.teeth >= 0.3) {                             // teeth: grin (corners up), grit (flat box) or a grimace (corners down)
    const hh = Math.max(h, R * 0.07), topY = my - hh * 0.45 - c * 0.3, botY = my + hh * 0.55 + c * 0.9;
    const P = new Path2D(); P.moveTo(-w / 2, my - c * 0.9 + sk); P.quadraticCurveTo(0, topY - c * 0.2, w / 2, my - c * 0.9 - sk); P.quadraticCurveTo(w * 0.46, botY, 0, botY); P.quadraticCurveTo(-w * 0.46, botY, -w / 2, my - c * 0.9 + sk); P.closePath();
    g.fillStyle = '#fffdf6'; g.fill(P);
    g.save(); g.clip(P); g.lineWidth = R * 0.018; g.strokeStyle = INK;
    const n = Math.max(4, Math.round(w / (R * 0.06))); g.beginPath(); for (let i = 1; i < n; i++) { const tx = -w / 2 + i * w / n; g.moveTo(tx, topY - hh); g.lineTo(tx, botY + hh); }
    const midY = (topY + botY) / 2; g.moveTo(-w, midY + c * 0.2); g.quadraticCurveTo(0, midY + c * 0.6, w, midY + c * 0.2); g.stroke(); g.restore();
    g.lineWidth = R * 0.04; g.stroke(P);
  } else {                                                 // open: dark mouth with a tongue; frightened = taller than wide, corners down
    const frown = Math.max(0, -F.mC), ww = Math.max(w, R * 0.24 + h * 0.85), cy = my + frown * R * 0.2;
    const P = new Path2D(); P.moveTo(-ww / 2, cy); P.bezierCurveTo(-ww * 0.45, cy - h * (0.9 + frown * 3), ww * 0.45, cy - h * (0.9 + frown * 3), ww / 2, cy); P.bezierCurveTo(ww * 0.5, cy + h * 1.1, -ww * 0.5, cy + h * 1.1, -ww / 2, cy); P.closePath();
    g.fill(P); g.save(); g.clip(P); g.fillStyle = '#d8505a'; g.beginPath(); g.ellipse(0, cy + h * 0.75, ww * 0.32, h * 0.5, 0, 0, 7); g.fill();
    const tt = cy - h * (0.9 + frown * 3) * 0.75; if (h > R * 0.075) { g.fillStyle = '#fffdf6'; g.beginPath(); g.moveTo(-ww, tt - R); g.lineTo(ww, tt - R); g.lineTo(ww, tt + R * 0.06); g.quadraticCurveTo(0, tt + R * 0.085, -ww, tt + R * 0.06); g.closePath(); g.fill(); } g.restore();
    g.lineWidth = R * 0.04; g.stroke(P);
  }
  return { my: F.my, mW: F.mW, mH: F.mH, mC: F.mC };
}
export function sweat(g, R, F) {
  if (F.sweat) drop(g, R * 0.58, -R * 0.28, R * 0.13, 0.15);
  if (F.drops) for (const [a, d, s] of [[-2.5, 1.22, 0.08], [-0.55, 1.26, 0.09]]) drop(g, Math.cos(a) * R * d, Math.sin(a) * R * d, R * s, a + Math.PI / 2);
}
