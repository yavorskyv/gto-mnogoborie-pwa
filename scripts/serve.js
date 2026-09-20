/**
 * High-performance lightweight HTTP server for "Игры ГТО 2026" PWA
 * Supports MIME types, CORS, SPA fallback and binds to 0.0.0.0
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8080', 10);
const WEB_DIR = path.join(__dirname, '..', 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL pathname
  let reqPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safeWebDir = path.resolve(WEB_DIR);
  let filePath = path.resolve(safeWebDir, '.' + reqPath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(safeWebDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        // Fallback for SPA routing: serve index.html if file has no extension
        if (!path.extname(reqPath)) {
          const indexPath = path.join(WEB_DIR, 'index.html');
          fs.readFile(indexPath, (indexErr, indexContent) => {
            if (indexErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
              res.end(indexContent);
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Content-Length': content.length
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=== Сервер приложения «Игры ГТО 2026» запущен! ===`);
  console.log(`Локальный адрес:   http://localhost:${PORT}`);
  console.log(`Для смартфона/Wi-Fi: http://172.20.10.5:${PORT}`);
  console.log(`Директория файлов:  ${WEB_DIR}`);
});
