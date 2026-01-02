/**
 * Shared Manifest Builder
 * Eliminates duplication between build.js and dev.js
 */

import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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

/**
 * Generate a thumbnail for an image using macOS sips
 * @param {string} srcPath - Source image path
 * @param {string} thumbPath - Destination thumbnail path
 * @param {number} maxWidth - Maximum thumbnail width (default 800)
 */
function generateThumbnail(srcPath, thumbPath, maxWidth = 800) {
  try {
    // Use sips to resize (macOS built-in, no dependencies)
    execSync(`sips -Z ${maxWidth} "${srcPath}" --out "${thumbPath}" 2>/dev/null`, {
      stdio: 'pipe'
    });
    return true;
  } catch (e) {
    console.warn(`  ⚠ Failed to generate thumbnail for ${srcPath}`);
    return false;
  }
}

/**
 * Build gallery manifest from album folders
 * @param {string} galleryDir - Path to gallery directory
 * @returns {Array} Array of {folder, images, thumbs, created} objects
 */
export function buildGalleryManifest(galleryDir) {
  // Common image formats
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

  // Get all subdirectories (each is an album), excluding thumbs folders
  const folders = readdirSync(galleryDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'thumbs')
    .map(dirent => dirent.name)
    .sort();

  return folders.map(folder => {
    const folderPath = join(galleryDir, folder);
    const thumbsPath = join(folderPath, 'thumbs');

    // Create thumbs directory if it doesn't exist
    if (!existsSync(thumbsPath)) {
      mkdirSync(thumbsPath, { recursive: true });
    }

    // Get all image files in this album folder (not in thumbs subfolder)
    const imageFiles = readdirSync(folderPath)
      .filter(file => {
        const filePath = join(folderPath, file);
        const stats = statSync(filePath);
        return stats.isFile() && imageExtensions.some(ext => file.toLowerCase().endsWith(ext));
      });

    // Sort images: KEY prefix first, then alphabetically
    const sortedImages = imageFiles.sort((a, b) => {
      const aIsKey = a.toUpperCase().startsWith('KEY');
      const bIsKey = b.toUpperCase().startsWith('KEY');

      if (aIsKey && !bIsKey) return -1;
      if (!aIsKey && bIsKey) return 1;
      return a.localeCompare(b);
    });

    // Generate thumbnails for each image
    const images = [];
    const thumbs = [];

    sortedImages.forEach(file => {
      const srcPath = join(folderPath, file);
      const thumbFile = file;
      const thumbFilePath = join(thumbsPath, thumbFile);

      images.push(`gallery/${folder}/${file}`);
      thumbs.push(`gallery/${folder}/thumbs/${thumbFile}`);

      // Generate thumbnail if it doesn't exist or source is newer
      if (!existsSync(thumbFilePath)) {
        console.log(`  → Generating thumbnail: ${folder}/thumbs/${file}`);
        generateThumbnail(srcPath, thumbFilePath);
      } else {
        // Check if source is newer than thumbnail
        const srcStats = statSync(srcPath);
        const thumbStats = statSync(thumbFilePath);
        if (srcStats.mtime > thumbStats.mtime) {
          console.log(`  → Updating thumbnail: ${folder}/thumbs/${file}`);
          generateThumbnail(srcPath, thumbFilePath);
        }
      }
    });

    // Get oldest file creation date as album date
    let oldestDate = new Date();
    imageFiles.forEach(file => {
      const filePath = join(folderPath, file);
      const stats = statSync(filePath);
      if (stats.birthtime < oldestDate) {
        oldestDate = stats.birthtime;
      }
    });

    return {
      folder,
      images,
      thumbs,
      created: oldestDate.toISOString().split('T')[0]
    };
  });
}
