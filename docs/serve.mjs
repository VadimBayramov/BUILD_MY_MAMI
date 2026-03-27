#!/usr/bin/env node
/**
 * Standalone docs server — completely isolated from the FunnelBuilder app.
 * No shared code, no shared deps, no Vite, no React.
 * Pure Node.js built-ins only.
 *
 * Usage:
 *   node docs/serve.mjs          → http://localhost:4000
 *   PORT=9999 node docs/serve.mjs
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 4000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let url = (req.url ?? '/').split('?')[0];

  // All of these → architecture.html
  if (url === '/' || url === '/architecture' || url === '/docs/architecture') {
    url = '/architecture.html';
  }

  const filePath = path.resolve(__dirname, '.' + url);

  // Stay inside docs/
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(302, { Location: '/architecture' });
    res.end();
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  \x1b[36m📐 FunnelBuilder — Architecture Map\x1b[0m');
  console.log('');
  console.log(`  \x1b[32m➜\x1b[0m  http://localhost:${PORT}/architecture`);
  console.log('');
  console.log(
    '  \x1b[90m(isolated from the builder app · Ctrl+C to stop)\x1b[0m',
  );
  console.log('');
});
