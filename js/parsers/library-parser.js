/**
 * Library Parser
 * Parses library.md into book objects with section grouping
 */

/**
 * Parse library.md markdown content
 * @param {string} markdown - Raw markdown content
 * @returns {Object} { sections: [...], allBooks: [...] }
 */
export function parseLibraryMd(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = null;
  const allBooks = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Section heading
    if (trimmed.startsWith('## ')) {
      const sectionName = trimmed.slice(3);
      currentSection = {
        name: sectionName,
        books: []
      };
      sections.push(currentSection);
      continue;
    }

    // Book entry
    if (trimmed.startsWith('- ') && currentSection) {
      const book = parseBookEntry(trimmed);
      if (book) {
        book.section = currentSection.name;
        currentSection.books.push(book);
        allBooks.push(book);
      }
    }
  }

  return { sections, allBooks };
}

/**
 * Parse individual book entry
 * Format: "- Title by Author ⭐⭐⭐⭐⭐ [note](filename.md)"
 * @param {string} line - Markdown list item
 * @returns {Object|null} Book object or null
 */
function parseBookEntry(line) {
  // Remove leading "- "
  const content = line.slice(2);

  // Regex: capture title, author, optional rating, optional note link
  const regex = /^(.+?)\s+by\s+(.+?)(?:\s+(⭐+))?(?:\s+\[note\]\((.+?)\))?$/;
  const match = content.match(regex);

  if (!match) return null;

  return {
    title: match[1].trim(),
    author: match[2].trim(),
    rating: match[3] || null,
    noteLink: match[4] || null,
    hasNote: !!match[4]
  };
}
