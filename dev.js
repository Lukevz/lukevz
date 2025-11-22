#!/usr/bin/env node
/**
 * Dev server with auto-rebuild
 * Watches /posts folder and regenerates posts.js on changes
 */

import { readdirSync, writeFileSync, watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');
const PORT = 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Build posts.js
function build() {
  const files = readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const content = `/**
 * Posts Manifest (auto-generated)
 */
export default ${JSON.stringify(files, null, 2)};
`;

  writeFileSync(join(__dirname, 'posts.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt posts.js (${files.length} posts)`);
}

// Initial build
build();

// Watch for changes
console.log(`\x1b[90m◉ Watching /posts for changes...\x1b[0m`);
watch(postsDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.md')) {
    console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
    build();
  }
});

// Simple static server
const server = createServer(async (req, res) => {
  const decodedUrl = decodeURIComponent(req.url);
  let filePath = join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n\x1b[1m  Digital Garden\x1b[0m`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m`);
  console.log(`  \x1b[36m➜\x1b[0m  http://localhost:${PORT}`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m\n`);
});
