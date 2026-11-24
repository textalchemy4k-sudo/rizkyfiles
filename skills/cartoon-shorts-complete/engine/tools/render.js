// node tools/render.js <out.mp4> --range a,b   (PAGE env = page) : renders frames [a,b) to an mp4 (jpeg pipe into ffmpeg)
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), out = process.argv[2], rg = process.argv.indexOf('--range'), [f0, f1] = process.argv[rg + 1].split(',').map(Number);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
(async () => {
  const server = await new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, () => ok(s)); });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/${process.env.PAGE || 'anim.html'}`); await page.waitForFunction(() => window.ready === true, null, { timeout: 600000 });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) { await page.evaluate((k) => window.renderFrame(k), f); const buf = await page.screenshot({ type: 'jpeg', quality: 95 }); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); if ((f - f0) % 30 === 0) console.log('frame', f, ((Date.now() - t0) / 1000 / Math.max(1, f - f0)).toFixed(2) + ' s/f'); }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('done', f0, f1); await browser.close(); server.close();
})();
