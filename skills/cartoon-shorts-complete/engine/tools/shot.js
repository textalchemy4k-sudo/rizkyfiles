// node tools/shot.js <html relative to project> <query> <out.png>: full-page screenshot of a static page
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
(async () => {
  const server = await new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, () => ok(s)); });
  const browser = await chromium.launch({ channel: 'chrome', headless: true }); const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
  await page.goto(`http://localhost:${server.address().port}/${process.argv[2]}${process.argv[3]}`); await page.waitForFunction(() => window.done === true);
  await page.screenshot({ path: process.argv[4], fullPage: true, type: 'jpeg', quality: 88 }); await browser.close(); server.close();
})();
