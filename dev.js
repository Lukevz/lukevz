#!/usr/bin/env node
/**
 * Dev server with auto-rebuild
 * Watches /posts folder and regenerates posts.js on changes
 */

import { readdirSync, writeFileSync, watch, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');
const thoughtTrainDir = join(__dirname, 'thought-train');
const labsDir = join(__dirname, 'labs');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

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
function buildPosts() {
  const files = readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // Get creation dates for each file
  const posts = files.map(file => {
    const filePath = join(postsDir, file);
    const stats = statSync(filePath);
    // Use birthtime (creation date) and format as YYYY-MM-DD
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Posts Manifest (auto-generated)
 * Using object format with created dates from filesystem
 */
export default ${JSON.stringify(posts, null, 2)};
`;

  writeFileSync(join(__dirname, 'posts.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt posts.js (${files.length} posts)`);
}

// Build thought-trains.js
function buildThoughtTrains() {
  const files = readdirSync(thoughtTrainDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // Get creation dates for each file
  const thoughtTrains = files.map(file => {
    const filePath = join(thoughtTrainDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Thought Trains Manifest (auto-generated)
 * Using object format with created dates from filesystem
 */
export default ${JSON.stringify(thoughtTrains, null, 2)};
`;

  writeFileSync(join(__dirname, 'thought-trains.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt thought-trains.js (${files.length} thought trains)`);
}

// Build labs.js
function buildLabs() {
  if (!existsSync(labsDir)) return;

  const files = readdirSync(labsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const labs = files.map(file => {
    const filePath = join(labsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Labs Manifest (auto-generated)
 */
export default ${JSON.stringify(labs, null, 2)};
`;

  writeFileSync(join(__dirname, 'labs.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt labs.js (${files.length} labs)`);
}

// Initial build
buildPosts();
buildThoughtTrains();
buildLabs();

// Watch for changes in posts
console.log(`\x1b[90m◉ Watching /posts for changes...\x1b[0m`);
watch(postsDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.md')) {
    console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
    buildPosts();
  }
});

// Watch for changes in thought-train
console.log(`\x1b[90m◉ Watching /thought-train for changes...\x1b[0m`);
watch(thoughtTrainDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.md')) {
    console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
    buildThoughtTrains();
  }
});

// Watch for changes in labs
if (existsSync(labsDir)) {
  console.log(`\x1b[90m◉ Watching /labs for changes...\x1b[0m`);
  watch(labsDir, { recursive: true }, (eventType, filename) => {
    if (filename?.endsWith('.md')) {
      console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
      buildLabs();
    }
  });
}

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

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' || HOST === '127.0.0.1' ? 'localhost' : HOST;
  console.log(`\n\x1b[1m  Digital Garden\x1b[0m`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m`);
  console.log(`  \x1b[36m➜\x1b[0m  http://${displayHost}:${PORT}`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m\n`);
});
