// Tiny static file server (same-origin like GitHub Pages, so canvas reads of assets/*.png work).
//   node tools/serve.js [port]          -> serves the repo root at http://127.0.0.1:8000/
//   const { start } = require('./serve'); const srv = await start(root); srv.url ... srv.close()
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function start(root, port = 0) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    });
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + server.address().port + '/', close: () => server.close() })));
}
module.exports = { start };
if (require.main === module) start(path.resolve(__dirname, '..'), +(process.argv[2] || 8000)).then(s => console.log('serving ' + s.url));
