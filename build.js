#!/usr/bin/env node
/**
 * Build script - Auto-generates posts.js from /posts folder
 * Run: node build.js
 */

import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');

// Get all markdown files
const files = readdirSync(postsDir)
  .filter(file => file.endsWith('.md'))
  .sort();

// Generate posts.js content
const content = `/**
 * Posts Manifest (auto-generated)
 * Run 'node build.js' to regenerate after adding new posts
 */

export default ${JSON.stringify(files, null, 2)};
`;

writeFileSync(join(__dirname, 'posts.js'), content);

console.log(`✓ Generated posts.js with ${files.length} posts:`);
files.forEach(f => console.log(`  - ${f}`));
