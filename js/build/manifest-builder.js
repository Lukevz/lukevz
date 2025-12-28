/**
 * Shared Manifest Builder
 * Eliminates duplication between build.js and dev.js
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Build posts manifest from markdown files
 * @param {string} postsDir - Path to posts directory
 * @returns {Array} Array of {file, created} objects
 */
export function buildPostsManifest(postsDir) {
  const files = readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  return files.map(file => {
    const filePath = join(postsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });
}

/**
 * Build thought trains manifest from markdown files
 * @param {string} trainDir - Path to thought-train directory
 * @returns {Array} Array of {file, created} objects
 */
export function buildThoughtTrainsManifest(trainDir) {
  const files = readdirSync(trainDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  return files.map(file => {
    const filePath = join(trainDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });
}

/**
 * Build labs manifest from markdown files
 * @param {string} labsDir - Path to labs directory
 * @returns {Array} Array of {file, created} objects
 */
export function buildLabsManifest(labsDir) {
  const files = readdirSync(labsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  return files.map(file => {
    const filePath = join(labsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });
}

/**
 * Build sounds manifest from audio files
 * @param {string} soundsDir - Path to sounds directory
 * @returns {Array} Array of {file, created} objects
 */
export function buildSoundsManifest(soundsDir) {
  // Common audio formats
  const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac', '.webm', '.qta'];

  const files = readdirSync(soundsDir)
    .filter(file => audioExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .sort();

  return files.map(file => {
    const filePath = join(soundsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });
}
