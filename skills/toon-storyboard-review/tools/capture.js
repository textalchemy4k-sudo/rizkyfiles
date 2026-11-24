// node tools/capture.js n1 n2 ...  -> cook/stills/cur/fNNN.png (NNN = reference frame number), prints errors
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), frames = process.argv.slice(2).map(Number);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
(async () => {
  const server = await new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, () => ok(s)); });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 400)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(`http://localhost:${server.address().port}/${process.env.PAGE || "index.html"}${process.env.Q || ""}`);
  await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 300000 });
  console.log('load', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const out = path.join(ROOT, 'cook/stills/cur'); fs.mkdirSync(out, { recursive: true });
  for (const n of frames) { await page.evaluate((k) => window.renderFrame(k), n); await page.screenshot({ path: path.join(out, `f${String(n).padStart(3, '0')}.png`) }); }
  console.log('done', frames.length);
  await browser.close(); server.close();
})();
