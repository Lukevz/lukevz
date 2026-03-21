/**
 * Gallery URL Router Module
 * Handles URL-based gallery navigation and deep linking
 */

/**
 * Get album ID from URL hash
 * Expected format: #gallery/album-id
 * @returns {string|null} - Album ID or null
 */
export function getAlbumFromUrl() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#gallery/')) return null;

  // Extract album ID (everything after #gallery/)
  const match = hash.match(/#gallery\/([^?]+)/);
  if (!match) return null;

  return match[1];
}

/**
 * Update URL to reflect current album
 * @param {string|null} albumId - Album ID or null to clear
 */
export function updateAlbumUrl(albumId) {
  if (!albumId) {
    // Clear the album hash but keep the view
    const hash = window.location.hash;
    if (hash.startsWith('#gallery/')) {
      window.history.pushState(null, '', '#gallery');
    }
    return;
  }

  const newHash = `#gallery/${albumId}`;

  // Only update if different from current hash
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash);
  }
}
