/**
 * Parses book metadata from markdown files with "b." prefix
 * Handles various formats:
 *   # B. Title       # B. Title
 *   Author           #tag
 *   Rating: N        By Author
 *                    Rating: N
 */

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

export function parseBook(markdown, filename) {
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
