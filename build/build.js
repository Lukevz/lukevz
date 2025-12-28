#!/usr/bin/env node
/**
 * Build script - Auto-generates manifest files
 * Run: node build/build.js
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPostsManifest, buildThoughtTrainsManifest, buildLabsManifest, buildSoundsManifest } from '../js/build/manifest-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const postsDir = join(rootDir, 'posts');
const thoughtTrainDir = join(rootDir, 'thought-train');
const labsDir = join(rootDir, 'labs');
const soundsDir = join(rootDir, 'sounds');

// Build posts manifest
const posts = buildPostsManifest(postsDir);
const postsContent = `/**
 * Posts Manifest (auto-generated)
 * Using object format with created dates from filesystem
 * Run 'node build/build.js' to regenerate after adding new posts
 */

export default ${JSON.stringify(posts, null, 2)};
`;
writeFileSync(join(rootDir, 'posts.js'), postsContent);
console.log(`✓ Generated posts.js with ${posts.length} posts`);

// Build thought trains manifest
const thoughtTrains = buildThoughtTrainsManifest(thoughtTrainDir);
const thoughtTrainContent = `/**
 * Thought Trains Manifest (auto-generated)
 * Using object format with created dates from filesystem
 * Run 'node build/build.js' to regenerate after adding new thought trains
 */

export default ${JSON.stringify(thoughtTrains, null, 2)};
`;
writeFileSync(join(rootDir, 'thought-trains.js'), thoughtTrainContent);
console.log(`✓ Generated thought-trains.js with ${thoughtTrains.length} thought trains`);

// Build labs manifest (if directory exists)
if (existsSync(labsDir)) {
  const labs = buildLabsManifest(labsDir);
  const labsContent = `/**
 * Labs Manifest (auto-generated)
 * Run 'node build/build.js' to regenerate after adding new labs
 */

export default ${JSON.stringify(labs, null, 2)};
`;
  writeFileSync(join(rootDir, 'labs.js'), labsContent);
  console.log(`✓ Generated labs.js with ${labs.length} labs`);
}

// Build sounds manifest (if directory exists)
if (existsSync(soundsDir)) {
  const sounds = buildSoundsManifest(soundsDir);
  const soundsContent = `/**
 * Sounds Manifest (auto-generated)
 * Lists all audio files in the sounds/ directory
 * Run 'node build/build.js' to regenerate after adding new sounds
 */

export default ${JSON.stringify(sounds, null, 2)};
`;
  writeFileSync(join(rootDir, 'sounds.js'), soundsContent);
  console.log(`✓ Generated sounds.js with ${sounds.length} sounds`);
}
