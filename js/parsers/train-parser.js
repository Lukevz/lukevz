/**
 * Thought Train Parser
 * Parses thought train markdown with custom frontmatter
 */

import { parseYAMLFrontmatter } from '../utils/yaml.js';

/**
 * Parse Thought Train markdown with custom frontmatter
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string|null} createdDate - Optional creation date from manifest
 * @returns {Object} Parsed thought train object
 */
export function parseThoughtTrain(content, filename, createdDate = null) {
  // Use shared YAML parser
  const { frontmatter, body } = parseYAMLFrontmatter(content);

  // Extract Bear hashtags from body
  const hashtagMatches = body.matchAll(/#([a-zA-Z][\w-]*(?:\/[\w-]+)*)/g);
  const tags = [...new Set([
    ...(frontmatter.tags || []),
    ...Array.from(hashtagMatches, m => m[1])
  ])];

  // Clean body of hashtags for display
  const cleanBody = body.replace(/#([a-zA-Z][\w-]*(?:\/[\w-]+)*)/g, '').trim();

  return {
    title: frontmatter.title || filename.replace('.md', ''),
    date: frontmatter.date || createdDate || new Date().toISOString().split('T')[0],
    startPoint: frontmatter.startPoint || '',
    endPoint: frontmatter.endPoint || '',
    route: Array.isArray(frontmatter.route) ? frontmatter.route : [],
    takeaways: frontmatter.takeaways || '',
    quote: frontmatter.quote || '',
    whyCared: frontmatter.whyCared || '',
    nextRabbitHole: frontmatter.nextRabbitHole || '',
    tags,
    body: cleanBody,
    filename
  };
}
