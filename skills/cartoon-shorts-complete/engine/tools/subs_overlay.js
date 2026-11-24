// Our subtitle format (from The Ceasefire) as a transparent video, so subtitles can change without re-rendering the picture.
// usage: node tools/subs_overlay.js words.json out.mov frames [fps]   Then overlay it onto the clean picture with ffmpeg.
const fs = require('fs'), { spawn } = require('child_process'), { chromium } = require('playwright'), ffmpeg = require('ffmpeg-static');
const [wordsFile, out, framesArg, fpsArg] = process.argv.slice(2), frames = +framesArg, fps = +(fpsArg ?? 30);
const raw = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
const WORDS = (Array.isArray(raw) ? raw : raw.words).map((x) => ({ w: (x.w ?? x.word).trim(), s: x.s ?? x.start, e: x.e ?? x.end }));
WORDS.forEach((x, i) => { if (x.w.toLowerCase() === 'last' && WORDS[i + 1]?.w.toLowerCase().startsWith('chance')) x.w = 'Last'; });
const K = (t, w) => 1 + 0.15 * Math.max(0, 1 - (t - w.s) / 0.09);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent('<!doctype html><html style="background:transparent"><body style="margin:0;background:transparent"><canvas id="c" width="1080" height="1920" style="display:block"></canvas></body></html>');
  await page.evaluate(() => { const ui = document.getElementById('c').getContext('2d'); window.draw = (w, k) => { ui.clearRect(0, 0, 1080, 1920); if (!w) return; ui.save(); ui.translate(540, 1920 * 0.695); ui.scale(k, k); ui.font = '900 76px "Arial Black", Arial'; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.lineJoin = 'round'; ui.shadowColor = 'rgba(0,0,0,0.45)'; ui.shadowBlur = 10; ui.shadowOffsetY = 5; ui.lineWidth = 16; ui.strokeStyle = '#111'; ui.strokeText(w, 0, 0); ui.shadowColor = 'transparent'; ui.fillStyle = '#fff'; ui.fillText(w, 0, 0); ui.restore(); }; });
  const ff = spawn(ffmpeg, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'qtrle', '-pix_fmt', 'argb', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const cache = new Map();
  for (let f = 0; f < frames; f++) { const t = f / fps; let w = null; for (const x of WORDS) if (t >= x.s - 0.02 && t < x.e + 0.18) w = x; const k = w ? K(t, w) : 1, key = w ? w.w + '|' + k.toFixed(3) : ''; if (!cache.has(key)) { await page.evaluate(([a, b]) => window.draw(a, b), [w?.w ?? null, k]); cache.set(key, await page.screenshot({ type: 'png', omitBackground: true })); } if (!ff.stdin.write(cache.get(key))) await new Promise((ok) => ff.stdin.once('drain', ok)); }
  ff.stdin.end(); await new Promise((ok) => ff.on('close', ok)); await browser.close(); console.log('overlay', out, frames, 'frames', cache.size, 'unique');
})();
