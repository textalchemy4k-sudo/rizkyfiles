// Camera editor server: serves the project and saves cameras.json (POST /save). node tools/editor_server.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), PORT = +(process.argv[2] || 5179);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4' };
http.createServer((q, r) => {
  if (q.method === 'POST' && q.url === '/save') {
    let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => {
      try { const j = JSON.parse(b); const f = path.join(ROOT, 'cameras.json'); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(ROOT, 'cameras.backup.json')); fs.writeFileSync(f, JSON.stringify(j, null, 1)); r.writeHead(200); r.end('saved'); }
      catch (e) { r.writeHead(400); r.end(String(e)); } });
    return;
  }
  if (q.method === 'POST' && q.url === '/choose') {   // the music picker's choice: { track, file, db }
    let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => { try { const j = JSON.parse(b); fs.writeFileSync(path.join(ROOT, 'music_choice.json'), JSON.stringify(j, null, 1)); r.writeHead(200); r.end('saved'); } catch (e) { r.writeHead(400); r.end(String(e)); } });
    return;
  }
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0] === '/' ? '/editor.html' : q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
}).listen(PORT, () => console.log('camera editor on http://localhost:' + PORT));
