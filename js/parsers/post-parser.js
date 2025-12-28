/**
 * Post Parser
 * Parses Bear-style markdown posts with frontmatter and hashtags
 */

/**
 * Parse Bear-style front matter and tags
 * Bear exports with tags as #tag in the content
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string|null} createdDate - Optional creation date from manifest (original Bear date)
 * @returns {Object} Parsed post object
 */
export function parsePost(content, filename, createdDate = null) {
  const lines = content.split('\n');
  let title = filename.replace('.md', '');
  // Use manifest date if provided, otherwise fall back to today
  let date = createdDate || new Date().toISOString().split('T')[0];
  const tags = [];
  let body = content;

  // Check for YAML front matter
  if (lines[0] === '---') {
    const endIndex = lines.indexOf('---', 1);
    if (endIndex !== -1) {
      const frontMatter = lines.slice(1, endIndex).join('\n');
      body = lines.slice(endIndex + 1).join('\n');

      // Parse front matter
      const titleMatch = frontMatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      const dateMatch = frontMatter.match(/^date:\s*["']?(.+?)["']?\s*$/m);
      const tagsMatch = frontMatter.match(/^tags:\s*\[([^\]]+)\]/m);

      if (titleMatch) title = titleMatch[1];
      if (dateMatch) date = dateMatch[1];
      if (tagsMatch) {
        tagsMatch[1].split(',').forEach(tag => {
          tags.push(tag.trim().replace(/["']/g, ''));
        });
      }
    }
  }

  // Extract Bear-style hashtags from body (supports nested tags like #clippings/vocab)
  const hashtagMatches = body.matchAll(/#([a-zA-Z][\w-]*(?:\/[\w-]+)*)/g);
  for (const match of hashtagMatches) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Extract title from first H1 if not in front matter
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && title === filename.replace('.md', '')) {
    title = h1Match[1];
    // Remove the first H1 from body since we're using it as title
    body = body.replace(/^#\s+.+\n?/, '');
  }

  // Clean hashtags from body for display (supports nested tags)
  const cleanBody = body.replace(/#([a-zA-Z][\w-]*(?:\/[\w-]+)*)/g, '').trim();

  // Debug: log if this post contains iframe
  if (cleanBody.includes('<iframe')) {
    console.log('[PARSE] Post with iframe detected:', filename);
    console.log('[PARSE] Body contains iframe:', cleanBody.substring(0, 300));
  }

  // Generate excerpt
  const excerpt = cleanBody
    .replace(/[#*_`\[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 120) + '...';

  return {
    title,
    date,
    tags: tags.length > 0 ? tags : ['notes'],
    body: cleanBody,
    excerpt,
    filename
  };
}
