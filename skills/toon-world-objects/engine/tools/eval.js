// node tools/eval.js "<js expression using window.dbg>"
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
(async () => {
  const server = await new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, () => ok(s)); });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/${process.env.PAGE || 'index.html'}`); await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
  const res = JSON.stringify(await page.evaluate(process.argv[2])); if (process.env.OUT) require('fs').writeFileSync(process.env.OUT, res); else console.log(res);
  await browser.close(); server.close();
})();
