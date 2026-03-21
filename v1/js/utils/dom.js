/**
 * DOM Utility Functions
 * Helper functions for date formatting, slug conversion, and post lookup
 */

/**
 * Format date string to human-readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2025")
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Convert filename to URL-safe slug
 * @param {string} filename - File name (with or without .md extension)
 * @returns {string} URL-safe slug
 */
export function filenameToSlug(filename) {
  if (!filename) return '';
  // Remove .md extension
  let slug = filename.replace(/\.md$/i, '');
  // Replace spaces and special chars with hyphens
  slug = slug.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  return slug;
}

/**
 * Find post by slug in posts array
 * @param {Array} posts - Array of post objects
 * @param {string} slug - URL slug to search for
 * @returns {Object|undefined} Post object or undefined if not found
 */
export function findPostBySlugInArray(posts, slug) {
  return posts.find(post => filenameToSlug(post.filename) === slug);
}
