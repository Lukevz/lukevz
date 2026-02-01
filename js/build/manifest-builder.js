/**
 * Shared Manifest Builder
 * Eliminates duplication between build.js and dev.js
 */

import { readdirSync, statSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

// Known authors for popular books (fallback when not found in file)
const KNOWN_AUTHORS = {
  'Atomic Habits': 'James Clear',
  'Creativity, Inc.': 'Ed Catmull',
  'Steal Like An Artist': 'Austin Kleon',
  'The Ride of a Lifetime': 'Robert Iger',
  'The Speed of Trust': 'Stephen M.R. Covey',
  'Building A Second Brain': 'Tiago Forte',
  'Feel-Good Productivity': 'Ali Abdaal',
  'Show Your Work': 'Austin Kleon',
};

/**
 * Parse book metadata from markdown content
 * Handles various formats:
 *   # B. Title       # B. Title
 *   Author           #tag
 *   Rating: N        By Author
 *                    Rating: N
 * @param {string} markdown - Raw markdown content
 * @param {string} filename - Book filename
 * @returns {Object} {title, author, rating}
 */
function parseBookMetadata(markdown, filename) {
  const lines = markdown.split('\n').map(line => line.trim());

  // Extract title from H1, removing "B. " prefix
  let title = '';
  const h1Match = lines[0]?.match(/^#\s+(.+)/);
  if (h1Match) {
    title = h1Match[1].replace(/^b\.\s*/i, '').trim();
  } else {
    title = filename.replace(/\.md$/i, '').replace(/^b\.\s*/i, '').trim();
  }

  // Find author - check various patterns
  let author = null;
  for (let i = 1; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip markdown formatting and non-author content
    if (line.startsWith('#')) continue;  // Hashtags or headers
    if (line.startsWith('>')) continue;  // Blockquotes
    if (line.startsWith('*')) continue;  // Italics/bold/lists
    if (line.startsWith('-')) continue;  // Lists
    if (line.startsWith('!')) continue;  // Images ![](...)
    if (line.startsWith('[')) continue;  // Links
    if (line.match(/^\d+\./)) continue;  // Numbered lists
    if (line.match(/^rating:/i)) continue;  // Rating line
    if (line.match(/^url:/i)) continue;  // URL line
    if (line.match(/^created/i)) continue;  // Created time
    if (line.match(/^".*"$/)) continue;  // Quoted text
    if (line.match(/^---$/)) continue;  // Horizontal rule

    // Check for "Author: Name" format
    const authorMatch = line.match(/^author:\s*(.+)/i);
    if (authorMatch) {
      author = authorMatch[1].trim();
      break;
    }

    // Check for "By Author" format
    const byMatch = line.match(/^by\s+(.+)/i);
    if (byMatch) {
      author = byMatch[1].trim();
      break;
    }
  }

  // Fallback to known authors if not found
  if (!author) {
    author = KNOWN_AUTHORS[title] || 'Unknown Author';
  }

  // Find rating anywhere in first 15 lines
  let rating = 0;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const ratingMatch = lines[i]?.match(/^rating:\s*(\d+)/i);
    if (ratingMatch) {
      rating = parseInt(ratingMatch[1], 10);
      break;
    }
  }

  return { title, author, rating };
}

/**
 * Generate a safe filename from book title
 * @param {string} title - Book title
 * @returns {string} Safe filename
 */
function titleToFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Download a book cover from Open Library API
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @param {string} destPath - Destination file path
 * @returns {Promise<boolean>} Success status
 */
async function downloadCover(title, author, destPath) {
  try {
    // Search Open Library for the book
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5&language=eng`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.warn(`    API error for "${title}": ${response.status}`);
      return false;
    }

    const data = await response.json();
    if (!data.docs || data.docs.length === 0) {
      console.warn(`    No results for "${title}"`);
      return false;
    }

    // Find the best match - prefer editions with cover_i and English language
    let coverId = null;
    for (const doc of data.docs) {
      if (doc.cover_i) {
        coverId = doc.cover_i;
        break;
      }
    }

    if (!coverId) {
      console.warn(`    No cover image for "${title}"`);
      return false;
    }

    // Get large cover from Open Library covers API
    const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

    // Download the image
    const imageResponse = await fetch(coverUrl);
    if (!imageResponse.ok) {
      console.warn(`    Failed to download cover for "${title}"`);
      return false;
    }

    const buffer = await imageResponse.arrayBuffer();
    writeFileSync(destPath, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.warn(`    Error downloading cover for "${title}":`, err.message);
    return false;
  }
}

/**
 * Build covers manifest and download missing covers
 * @param {string} postsDir - Path to posts directory
 * @param {string} coversDir - Path to covers directory
 * @param {boolean} downloadCovers - Whether to download missing covers (default: true)
 * @returns {Promise<Array>} Array of {file, cover, title, author, rating} objects
 */
export async function buildCoversManifest(postsDir, coversDir, downloadCovers = true) {
  // Create covers directory if it doesn't exist
  if (!existsSync(coversDir)) {
    mkdirSync(coversDir, { recursive: true });
  }

  // Find all book files (b. prefix)
  const bookFiles = readdirSync(postsDir)
    .filter(file => file.toLowerCase().startsWith('b.') && file.endsWith('.md'))
    .sort();

  const manifest = [];

  for (const file of bookFiles) {
    const filePath = join(postsDir, file);
    const markdown = readFileSync(filePath, 'utf-8');
    const { title, author, rating } = parseBookMetadata(markdown, file);

    const coverFilename = titleToFilename(title) + '.jpg';
    const coverPath = join(coversDir, coverFilename);
    const coverExists = existsSync(coverPath);

    // Download cover if missing (uses Open Library - no API key needed)
    if (!coverExists && downloadCovers) {
      console.log(`  → Downloading cover: ${title}`);
      await downloadCover(title, author, coverPath);
    }

    manifest.push({
      file,
      cover: existsSync(coverPath) ? `covers/${coverFilename}` : null,
      title,
      author,
      rating
    });
  }

  return manifest;
}
