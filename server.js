/**
 * Minimal local dev server — zero dependencies, Node built-ins only.
 * - Loads .env.local into process.env
 * - Serves public/ as static files
 * - Routes POST /api/generate to api/generate.js
 */

import { createServer } from 'node:http';
import { readFile, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val;
  }
  console.log('[server] Loaded .env.local');
} catch {
  console.warn('[server] No .env.local found — env vars will be missing');
}

// ── Import API handler ───────────────────────────────────────────────────────
const { default: handler } = await import('./api/generate.js');

// ── Static file helpers ──────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── Server ───────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  // API route
  if (req.url === '/api/generate') {
    if (req.method !== 'POST') {
      res.writeHead(405).end('Method not allowed');
      return;
    }

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = {};
      }
      // Mimic Vercel's res helpers
      res.status = (code) => { res.statusCode = code; return res; };
      res.json   = (obj)  => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
      };
      try {
        await handler(req, res);
      } catch (err) {
        console.error('[server] Handler error:', err);
        res.writeHead(500).end('Internal server error');
      }
    });
    return;
  }

  // Static files
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = join(__dirname, 'public', urlPath);

  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    const mime = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] Ready at http://localhost:${PORT}`);
});
