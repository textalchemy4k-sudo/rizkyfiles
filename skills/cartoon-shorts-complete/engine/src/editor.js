// Camera editor: loads the animation, lets you scrub each shot, fly the camera, set/delete keys and save cameras.json.
window.EDIT = { free: false };
const $ = (id) => document.getElementById(id), stageEl = $('stage'), status = (m) => ($('status').textContent = m);
status('Loading the scene (about a minute)…');
await import('./anim.js');
const A = window.ANIM, { SH, stage, camera, renderer } = A, THREE = await import('three/webgpu');
// move the render canvases into the view and render at half resolution (fast enough to scrub)
renderer.setPixelRatio(0.5); renderer.setSize(1080, 1920, false);
stageEl.appendChild(renderer.domElement); stageEl.appendChild(A.ui.canvas); A.ui.canvas.style.pointerEvents = 'none';
let sel = -1, cur = 0, t = SH[0].a, busy = false, again = false, playing = false, pivot = new THREE.Vector3(), dist = 4;
const r3 = (x) => Math.round(x * 1000) / 1000;
// ---------------------------------------------------------------- sound: the final mix, its waveform, the spoken words
const WORDS = await fetch('words.json').then((r) => r.json()).then((j) => (Array.isArray(j) ? j : j.words).map((x) => ({ w: (x.w ?? x.word).trim(), s: x.s ?? x.start, e: x.e ?? x.end })));
const aud = new Audio('out/editor_audio.m4a'); aud.preload = 'auto';
let peaks = null; { const ac = new AudioContext(), buf = await ac.decodeAudioData(await (await fetch('out/editor_audio.m4a')).arrayBuffer()), d = buf.getChannelData(0), per = Math.floor(buf.sampleRate / 100); peaks = new Float32Array(Math.floor(d.length / per)); for (let i = 0; i < peaks.length; i++) { let m = 0; for (let j = i * per; j < (i + 1) * per; j += 8) m = Math.max(m, Math.abs(d[j])); peaks[i] = m; } ac.close(); }
let blipT = null;
function blip(at) { if (!$('snd').checked || !$('scrubsnd').checked || playing) return; aud.currentTime = at; aud.play().catch(() => {}); clearTimeout(blipT); blipT = setTimeout(() => aud.pause(), 220); }
function wave() {
  const c = $('wave'), g = c.getContext('2d'), s = SH[cur], W2 = c.width, H2 = c.height, x = (tt) => ((tt - s.a) / (s.b - s.a)) * W2;
  g.clearRect(0, 0, W2, H2); g.fillStyle = '#4a4d57';
  if (peaks) for (let px = 0; px < W2; px++) { const tt = s.a + (px / W2) * (s.b - s.a), v = peaks[Math.min(peaks.length - 1, Math.floor(tt * 100))] || 0, h = Math.max(1, v * H2 * 0.9); g.fillRect(px, (H2 - h) / 2, 1, h); }
  g.font = 'bold 20px system-ui'; g.textBaseline = 'top';
  for (const w of WORDS) if (w.e > s.a && w.s < s.b) { g.fillStyle = 'rgba(120,170,255,0.18)'; g.fillRect(x(w.s), 0, Math.max(1, x(w.e) - x(w.s)), H2); g.fillStyle = '#9fc0ff'; g.fillText(w.w, x(w.s) + 2, 2); }
  g.fillStyle = '#e8b21a'; for (const k of keysNow(s)) { const kx = x(k[0]); g.fillRect(kx - 2, H2 - 22, 4, 22); }
  g.fillStyle = '#ffffff'; g.fillRect(x(t) - 1, 0, 2, H2);
  const now = WORDS.filter((w) => t >= w.s - 0.02 && t < w.e + 0.15).pop(); $('caption').textContent = now ? now.w : '';
}
function wordsList() { const box = $('words'), s = SH[cur]; box.innerHTML = ''; for (const w of WORDS) if (w.e > s.a && w.s < s.b) { const b = document.createElement('button'); b.textContent = w.w; b.title = w.s.toFixed(2) + ' s'; b.onclick = () => { sel = -1; t = Math.min(s.b - 0.001, Math.max(s.a, w.s)); $('time').value = t; blip(t); draw(); }; b.dataset.s = w.s; b.dataset.e = w.e; box.appendChild(b); } }

const keysNow = (s) => JSON.parse(JSON.stringify(A.CAMS[s.id] || A.calm(s.keys)));   // the shot's keys as stored (default ones until you change them)
async function draw() {
  if (busy) { again = true; return; } busy = true;
  do { again = false; const s = SH[cur]; A.ui.clearRect(0, 0, 1080, 1920); await stage(s, t); } while (again);
  busy = false; refresh();
}
function refresh() {
  const s = SH[cur]; wave(); for (const b of $('words').children) b.classList.toggle('cur', t >= +b.dataset.s - 0.02 && t < +b.dataset.e + 0.1); $('tlabel').textContent = `t = ${t.toFixed(2)} s   (shot ${s.a.toFixed(2)}–${s.b.toFixed(2)} s)${A.CAMS[s.id] ? '   edited' : '   default'}${s.pov && !A.CAMS[s.id] ? ' (scripted POV look)' : ''}`;
  $('fov').value = camera.fov; $('fovv').textContent = camera.fov.toFixed(0) + '°';
  $('setkey').textContent = sel >= 0 ? 'Replace selected key' : 'Add key here'; $('deselect').style.display = sel >= 0 ? '' : 'none';
  const ks = keysNow(s), box = $('keys'); box.innerHTML = '';
  ks.forEach((k, i) => { const d = document.createElement('div'); if (i === sel) d.className = 'cur';
    d.innerHTML = `<span>${k[0].toFixed(2)} s · fov ${Math.round(k[3])}</span>`;
    const go = document.createElement('button'); go.textContent = i === sel ? 'Selected' : 'Select'; go.onclick = () => { sel = i; status(`Key at ${k[0].toFixed(2)} s selected: move the camera, then click "Replace selected key".`); setMode(false); t = Math.min(s.b - 0.001, Math.max(s.a, k[0])); $('time').value = t; draw(); };
    const cp = document.createElement('button'); cp.textContent = 'Copy here'; cp.title = 'Copy this view to the current time';
    cp.onclick = () => { const k2 = keysNow(s), nk = [r3(t), k[1].slice(), k[2].slice(), k[3], k[4]], j = k2.findIndex((q) => Math.abs(q[0] - t) < 0.02); if (j >= 0) k2[j] = nk; else k2.push(nk); k2.sort((a, b) => a[0] - b[0]);
      A.CAMS[s.id] = k2; sel = -1; status(`View of the ${k[0].toFixed(2)} s key copied to ${t.toFixed(2)} s. Click "Save cameras" to keep it.`); setMode(false); draw(); };
    const del = document.createElement('button'); del.textContent = 'Delete'; del.onclick = () => { sel = -1; const k2 = keysNow(s); k2.splice(i, 1); if (k2.length) A.CAMS[s.id] = k2; else delete A.CAMS[s.id]; status('Key deleted (not saved yet).'); draw(); };
    d.append(go, cp, del); box.appendChild(d); });
}
function pickShot(i) { sel = -1; cur = i; const s = SH[i]; $('time').min = s.a; $('time').max = s.b - 0.001; t = s.a + 0.001; $('time').value = t; wordsList(); setMode(false); draw(); }
SH.forEach((s, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `Shot ${s.id.slice(1)}  ·  ${s.a.toFixed(1)}–${s.b.toFixed(1)} s${s.scene === 'town' ? '  ·  town' : ''}${s.pov ? '  ·  POV' : ''}`; $('shot').appendChild(o); });
$('shot').onchange = (e) => pickShot(+e.target.value);
$('time').oninput = (e) => { sel = -1; t = +e.target.value; blip(t); draw(); };
$('wave').onclick = (e) => { sel = -1; const r = e.target.getBoundingClientRect(), s = SH[cur]; t = Math.min(s.b - 0.001, s.a + ((e.clientX - r.left) / r.width) * (s.b - s.a)); $('time').value = t; blip(t); draw(); };
$('prev').onclick = () => { sel = -1; t = Math.max(SH[cur].a, t - 1 / 30); $('time').value = t; blip(t); draw(); };
$('next').onclick = () => { sel = -1; t = Math.min(SH[cur].b - 0.001, t + 1 / 30); $('time').value = t; blip(t); draw(); };
$('play').onclick = async () => { if (playing) { playing = false; return; } setMode(false); playing = true; $('play').textContent = 'Stop'; const s = SH[cur]; if (t > s.b - 0.05) t = s.a;
  const useSnd = $('snd').checked; let t0 = performance.now(), s0 = t; if (useSnd) { aud.currentTime = t; await aud.play().catch(() => {}); }
  while (playing) { t = useSnd ? aud.currentTime : s0 + (performance.now() - t0) / 1000; if (t >= s.b - 0.001) break; $('time').value = t; await draw(); }
  aud.pause(); t = Math.min(t, s.b - 0.001); $('time').value = t; playing = false; $('play').textContent = 'Play shot'; draw(); };
// ---------------------------------------------------------------- fly mode
function setMode(fly) {
  window.EDIT.free = fly; $('mode').classList.toggle('on', fly); stageEl.classList.toggle('fly', fly); $('mode').textContent = fly ? 'Flying (click to stop)' : 'Fly camera';
  if (fly) { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); pivot.copy(camera.position).addScaledVector(f, dist); camera.up.set(0, 1, 0); camera.lookAt(pivot); }
}
$('mode').onclick = () => { setMode(!window.EDIT.free); draw(); };
const fwd = () => new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right = () => new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), upv = () => new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
const apply = () => { camera.up.set(0, 1, 0); camera.lookAt(pivot); camera.updateMatrixWorld(); draw(); };
let drag = null;
stageEl.addEventListener('contextmenu', (e) => e.preventDefault());
stageEl.addEventListener('pointerdown', (e) => { if (!window.EDIT.free) setMode(true); drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; stageEl.setPointerCapture(e.pointerId); });
stageEl.addEventListener('pointerup', () => (drag = null));
stageEl.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.pan) { const k = dist * 0.002; const m = right().multiplyScalar(-dx * k).add(upv().multiplyScalar(dy * k)); camera.position.add(m); pivot.add(m); }
  else { const off = camera.position.clone().sub(pivot); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * 0.005); const ax = right(); const off2 = off.clone().applyAxisAngle(ax, -dy * 0.005); if (Math.abs(off2.clone().normalize().y) < 0.98) off.copy(off2); camera.position.copy(pivot).add(off); }
  apply();
});
stageEl.addEventListener('wheel', (e) => { e.preventDefault(); if (!window.EDIT.free) setMode(true); const step = Math.sign(e.deltaY) * Math.max(0.05, dist * 0.12); const nd = Math.max(0.3, dist + step); camera.position.addScaledVector(fwd(), dist - nd); dist = nd; apply(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (!window.EDIT.free || e.target.tagName === 'INPUT') return; const k = e.shiftKey ? 1.0 : 0.12, h = fwd().setY(0).normalize(), m = new THREE.Vector3();
  if (e.code === 'KeyW') m.add(h); if (e.code === 'KeyS') m.sub(h); if (e.code === 'KeyD') m.add(right()); if (e.code === 'KeyA') m.sub(right()); if (e.code === 'KeyE') m.y += 1; if (e.code === 'KeyQ') m.y -= 1;
  if (m.lengthSq()) { m.multiplyScalar(k); camera.position.add(m); pivot.add(m); apply(); }
});
$('fov').oninput = (e) => { if (!window.EDIT.free) setMode(true); camera.fov = +e.target.value; camera.updateProjectionMatrix(); draw(); };
// ---------------------------------------------------------------- keys
$('setkey').onclick = () => {
  const s = SH[cur], F = s.F; if (!F) { status('Render the shot once first.'); return; }
  if (!window.EDIT.free) { const f = fwd(); pivot.copy(camera.position).addScaledVector(f, dist); }
  const p = F.from(camera.position.clone()), q = F.from(pivot.clone()), key = [r3(t), p.toArray().map(r3), q.toArray().map(r3), Math.round(camera.fov * 10) / 10, 0];
  // keep every existing key: replace the selected one (it keeps its time), else replace a key at this time, else add one
  const ks = keysNow(s);
  if (sel >= 0 && sel < ks.length) { key[0] = ks[sel][0]; ks[sel] = key; }
  else { const i = ks.findIndex((k) => Math.abs(k[0] - t) < 0.02); if (i >= 0) ks[i] = key; else ks.push(key); }
  ks.sort((a, b) => a[0] - b[0]); sel = ks.indexOf(key);
  A.CAMS[s.id] = ks; status(`Key at ${key[0].toFixed(2)} s set (${ks.length} key${ks.length > 1 ? 's' : ''} in this shot). Click "Save cameras" to keep it.`); setMode(false); draw();
};
$('deselect').onclick = () => { sel = -1; status('No key selected: "Add key here" adds a new key at the current time.'); refresh(); };
$('reset').onclick = () => { sel = -1; delete A.CAMS[SH[cur].id]; status('Shot back to its default camera (not saved yet).'); setMode(false); draw(); };
$('save').onclick = async () => { const r = await fetch('/save', { method: 'POST', body: JSON.stringify(A.CAMS) }); status(r.ok ? 'Saved to cameras.json. The next render uses it.' : 'Save failed: ' + (await r.text())); };
pickShot(0); status('Ready. Pick a shot, scrub, Fly camera, Set key here, Save.');
