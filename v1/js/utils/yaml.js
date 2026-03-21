/**
 * YAML Frontmatter Parser
 * Shared utility for parsing YAML frontmatter from markdown files
 * Eliminates duplication between parseThoughtTrain() and parseLab()
 */

/**
 * Parse YAML frontmatter from markdown content
 * Handles strings and arrays in format:
 *   key: value
 *   key: [item1, item2, item3]
 *
 * @param {string} content - Markdown content with optional YAML frontmatter
 * @returns {Object} { frontmatter, body } - Parsed frontmatter and remaining body content
 */
export function parseYAMLFrontmatter(content) {
  let frontmatter = {};
  let body = content;

  // Extract YAML frontmatter (between --- delimiters)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return { frontmatter, body };
  }

  const yaml = frontmatterMatch[1];

  // Parse YAML fields line by line
  yaml.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    if (!key || !value) return;

    // Handle arrays: [item1, item2, item3]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const arrayContent = value.slice(1, -1);
        frontmatter[key] = arrayContent
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, '')) // Remove quotes
          .filter(item => item.length > 0);
      } catch (e) {
        frontmatter[key] = [];
      }
    } else {
      // Handle strings (remove surrounding quotes if present)
      frontmatter[key] = value.replace(/^["']|["']$/g, '');
    }
  });

  // Remove frontmatter from body
  body = content.replace(frontmatterMatch[0], '').trim();

  return { frontmatter, body };
}
