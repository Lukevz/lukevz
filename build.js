#!/usr/bin/env node
/**
 * Build script - Auto-generates posts.js from /posts folder
 * Run: node build.js
 */

import { readdirSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');

// Get all markdown files
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

// Generate posts.js content
const content = `/**
 * Posts Manifest (auto-generated)
 * Using object format with created dates from filesystem
 * Run 'node build.js' to regenerate after adding new posts
 */

export default ${JSON.stringify(posts, null, 2)};
`;

writeFileSync(join(__dirname, 'posts.js'), content);

console.log(`✓ Generated posts.js with ${files.length} posts:`);
posts.forEach(p => console.log(`  - ${p.file} (${p.created})`));
