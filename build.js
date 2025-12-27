#!/usr/bin/env node
/**
 * Build script - Auto-generates posts.js from /posts folder
 * Run: node build.js
 */

import { readdirSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');
const thoughtTrainDir = join(__dirname, 'thought-train');
const soundsDir = join(__dirname, 'sounds');

// Get all markdown files from posts
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

// Get all markdown files from thought-train
const thoughtTrainFiles = readdirSync(thoughtTrainDir)
  .filter(file => file.endsWith('.md'))
  .sort();

// Get creation dates for each thought train file
const thoughtTrains = thoughtTrainFiles.map(file => {
  const filePath = join(thoughtTrainDir, file);
  const stats = statSync(filePath);
  const created = stats.birthtime.toISOString().split('T')[0];
  return { file, created };
});

// Generate thought-trains.js content
const thoughtTrainContent = `/**
 * Thought Trains Manifest (auto-generated)
 * Using object format with created dates from filesystem
 * Run 'node build.js' to regenerate after adding new thought trains
 */

export default ${JSON.stringify(thoughtTrains, null, 2)};
`;

writeFileSync(join(__dirname, 'thought-trains.js'), thoughtTrainContent);

console.log(`✓ Generated thought-trains.js with ${thoughtTrainFiles.length} thought trains:`);
thoughtTrains.forEach(p => console.log(`  - ${p.file} (${p.created})`));

// Get all markdown files from labs (if folder exists)
const labsDir = join(__dirname, 'labs');

if (existsSync(labsDir)) {
  const labsFiles = readdirSync(labsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const labs = labsFiles.map(file => {
    const filePath = join(labsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  // Generate labs.js content
  const labsContent = `/**
 * Labs Manifest (auto-generated)
 * Run 'node build.js' to regenerate after adding new labs
 */

export default ${JSON.stringify(labs, null, 2)};
`;

  writeFileSync(join(__dirname, 'labs.js'), labsContent);

  console.log(`✓ Generated labs.js with ${labsFiles.length} labs:`);
  labs.forEach(p => console.log(`  - ${p.file} (${p.created})`));
}

// Get all audio files from sounds directory (if folder exists)
if (existsSync(soundsDir)) {
  // Common audio formats
  const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac', '.webm'];
  const soundsFiles = readdirSync(soundsDir)
    .filter(file => audioExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .sort();

  const sounds = soundsFiles.map(file => {
    const filePath = join(soundsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  // Generate sounds.js content
  const soundsContent = `/**
 * Sounds Manifest (auto-generated)
 * Lists all audio files in the sounds/ directory
 * Run 'node build.js' to regenerate after adding new sounds
 */

export default ${JSON.stringify(sounds, null, 2)};
`;

  writeFileSync(join(__dirname, 'sounds.js'), soundsContent);

  console.log(`✓ Generated sounds.js with ${soundsFiles.length} sounds:`);
  sounds.forEach(s => console.log(`  - ${s.file} (${s.created})`));
}
