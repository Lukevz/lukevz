/**
 * Lab Parser
 * Parses lab markdown files with frontmatter
 */

import { parseYAMLFrontmatter } from '../utils/yaml.js';

/**
 * Parse lab markdown file with frontmatter
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string|null} createdDate - Optional creation date from manifest
 * @returns {Object} Parsed lab object
 */
export function parseLab(content, filename, createdDate = null) {
  // Use shared YAML parser
  const { frontmatter, body } = parseYAMLFrontmatter(content);

  return {
    title: frontmatter.title || filename.replace('.md', ''),
    description: frontmatter.description || '',
    thumbnail: frontmatter.thumbnail || '',
    url: frontmatter.url || '',
    view: frontmatter.view || '',
    tags: frontmatter.tags || [],
    date: frontmatter.date || createdDate || new Date().toISOString().split('T')[0],
    body,
    filename
  };
}
