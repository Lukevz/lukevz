/**
 * URL Router Module
 * Handles URL-based note navigation and deep linking
 */

import { filenameToSlug, findPostBySlugInArray } from '../../utils/dom.js';

/**
 * Get current note from URL hash
 * Expected format: #note/slug or #note/slug?tag=tagname
 * @param {Array} posts - Array of all posts
 * @returns {Object|null} - Post object or null
 */
export function getNoteFromUrl(posts) {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#note/')) return null;

  // Extract slug (everything after #note/ until ? or end)
  const match = hash.match(/#note\/([^?]+)/);
  if (!match) return null;

  const slug = match[1];
  return findPostBySlugInArray(posts, slug);
}

/**
 * Update URL to reflect current note
 * @param {Object|null} post - Post object or null to clear
 */
export function updateNoteUrl(post) {
  if (!post) {
    // Clear the note hash but keep the view
    const hash = window.location.hash;
    if (hash.startsWith('#note/')) {
      window.history.pushState(null, '', '#notes');
    }
    return;
  }

  const slug = filenameToSlug(post.filename);
  const newHash = `#note/${slug}`;

  // Only update if different from current hash
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash);
  }
}
