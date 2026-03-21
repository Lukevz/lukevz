/**
 * Gallery Parser
 * Parses album data from gallery manifest
 */

/**
 * Parse album data and extract title/date from folder name
 * @param {Object} albumData - Album data from manifest {folder, images, thumbs, created}
 * @returns {Object} Parsed album with id, title, date, images, thumbs, etc.
 */
export function parseAlbum(albumData) {
  // Extract title and date from folder name
  // Examples:
  //   "Trip to Japan 2024" → title: "Trip to Japan", date: "2024"
  //   "Wedding NYC Dec 2023" → title: "Wedding NYC", date: "Dec 2023"
  //   "Summer Vibes" → title: "Summer Vibes", date: ""

  const folderName = albumData.folder;

  // Match year (2000-2099) or month name + year
  const dateRegex = /\b(20\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i;
  const dateMatch = folderName.match(dateRegex);

  // Remove date from folder name to get title
  const title = dateMatch
    ? folderName.replace(dateMatch[0], '').trim()
    : folderName;

  // Create URL-safe ID from folder name
  const id = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    id,
    title,
    date: dateMatch ? dateMatch[0] : '',
    images: albumData.images,
    thumbs: albumData.thumbs || albumData.images, // Fallback to full images if no thumbs
    created: albumData.created,
    folderName: albumData.folder
  };
}
