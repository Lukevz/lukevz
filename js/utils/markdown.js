/**
 * Markdown Parser
 * Converts markdown text to HTML with support for:
 * - Headers, lists, code blocks, links, images
 * - Bold, italic, strikethrough
 * - Blockquotes, horizontal rules
 * - Task lists (checkboxes)
 * - Iframe preservation (for embedded content)
 * - Bear-style image path handling
 */

/**
 * Helper function to encode path segments properly
 * @param {string} path - Path to encode
 * @returns {string} Encoded path
 */
function encodePathSegments(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * Process markdown content (used for blockquotes and regular content)
 * @param {string} content - Content to process
 * @returns {string} Processed HTML
 */
function processMarkdownContent(content) {
  let processed = content;

  // Headers
  processed = processed.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  processed = processed.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  processed = processed.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // Images - fix Bear export paths (relative paths need posts/ prefix)
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (src && !src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      try {
        const decodedPath = decodeURIComponent(src);
        const encodedPath = encodePathSegments(decodedPath);
        src = `/posts/${encodedPath}`;
      } catch (e) {
        try {
          const encodedPath = encodePathSegments(src);
          src = `/posts/${encodedPath}`;
        } catch (e2) {
          src = `/posts/${src}`;
        }
      }
    }
    return `<img src="${src}" alt="${alt}" loading="lazy">`;
  });

  // Links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold and Italic (process bold before italic to avoid conflicts)
  processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__(.+?)__/g, '<strong>$1</strong>');
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
  processed = processed.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  processed = processed.replace(/~~(.+?)~~/g, '<del>$1</del>');

  return processed;
}

/**
 * Process paragraphs in content
 * @param {string} content - Content to process
 * @param {string} iframePlaceholder - Placeholder for iframes
 * @returns {string} Processed HTML
 */
function processParagraphsInContent(content, iframePlaceholder) {
  return content.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
        block.startsWith('<blockquote') || block.startsWith('<pre') || block.startsWith('<hr') ||
        block.startsWith('<p>') || block.startsWith(iframePlaceholder)) {
      return block;
    }
    // Wrap in paragraph if not already a block element
    if (!block.startsWith('<')) {
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }
    return block;
  }).join('\n');
}

/**
 * Process lists in content
 * @param {string} content - Content to process
 * @returns {string} Processed HTML
 */
function processListsInContent(content) {
  const listContentLines = content.split('\n');
  const listProcessedLines = [];
  let inList = false;
  let listItems = [];
  let listType = null;

  function flushList() {
    if (listItems.length > 0) {
      const tag = listType === 'ordered' ? 'ol' : 'ul';
      listProcessedLines.push(`<${tag}>${listItems.join('')}</${tag}>`);
      listItems = [];
    }
    inList = false;
    listType = null;
  }

  for (const line of listContentLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) flushList();
      listProcessedLines.push('');
      continue;
    }

    // Check if line is already HTML (from headers, etc.)
    if (line.startsWith('<')) {
      if (inList) flushList();
      listProcessedLines.push(line);
      continue;
    }

    // Check for checkbox items first
    const checkboxMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
    const unorderedMatch = !checkboxMatch ? line.match(/^\s*[-*+]\s+(.+)$/) : null;
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);

    if (checkboxMatch) {
      if (listType === 'ordered') flushList();
      inList = true;
      listType = 'unordered';
      const isChecked = checkboxMatch[1].toLowerCase() === 'x';
      const content = checkboxMatch[2];
      listItems.push(`<li class="task-item${isChecked ? ' completed' : ''}"><input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${content}</li>`);
    } else if (unorderedMatch) {
      if (listType === 'ordered') flushList();
      inList = true;
      listType = 'unordered';
      listItems.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (listType === 'unordered') flushList();
      inList = true;
      listType = 'ordered';
      listItems.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inList) flushList();
      listProcessedLines.push(line);
    }
  }
  flushList();
  return listProcessedLines.join('\n');
}

/**
 * Parse markdown text to HTML
 * @param {string} text - Markdown text
 * @returns {string} HTML output
 */
export function parseMarkdown(text) {
  let html = text;

  // Preserve iframes and other allowed HTML elements before escaping
  const preservedElements = [];
  const iframePlaceholder = '\u0000\u0001IFRAMEBLOCK';

  // Extract and preserve iframes
  html = html.replace(/<iframe[^>]*>.*?<\/iframe>/gs, (match) => {
    preservedElements.push(match);
    const placeholder = `${iframePlaceholder}${preservedElements.length}\u0001\u0000`;
    console.log('Preserved iframe:', match.substring(0, 100));
    console.log('Placeholder:', placeholder);
    return placeholder;
  });

  // Escape HTML (but not our placeholders)
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (before other transformations)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Process blockquotes FIRST (before other markdown)
  const blockquoteLines = html.split('\n');
  const blockquoteProcessedLines = [];
  let blockquoteContent = [];
  let inBlockquote = false;

  function flushBlockquote() {
    if (blockquoteContent.length > 0) {
      const content = blockquoteContent.join('\n');
      const processed = processMarkdownContent(content);
      const listProcessed = processListsInContent(processed);
      const paragraphProcessed = processParagraphsInContent(listProcessed, iframePlaceholder);
      blockquoteProcessedLines.push(`<blockquote>${paragraphProcessed}</blockquote>`);
      blockquoteContent = [];
    }
    inBlockquote = false;
  }

  for (let i = 0; i < blockquoteLines.length; i++) {
    const line = blockquoteLines[i];
    if (line.startsWith('&gt; ')) {
      inBlockquote = true;
      blockquoteContent.push(line.substring(5)); // Remove '&gt; ' prefix
    } else {
      if (inBlockquote) {
        flushBlockquote();
      }
      blockquoteProcessedLines.push(line);
    }
  }
  flushBlockquote();

  html = blockquoteProcessedLines.join('\n');

  // Now process markdown for non-blockquote content
  // Headers (allow optional space after #)
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // Images - fix Bear export paths
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (src && !src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      try {
        const decodedPath = decodeURIComponent(src);
        const encodedPath = encodePathSegments(decodedPath);
        src = `/posts/${encodedPath}`;
      } catch (e) {
        try {
          const encodedPath = encodePathSegments(src);
          src = `/posts/${encodedPath}`;
        } catch (e2) {
          src = `/posts/${src}`;
        }
      }
    }
    return `<img src="${src}" alt="${alt}" loading="lazy">`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Only match italic if not inside quotes (HTML attributes)
  html = html.replace(/_(.+?)_/g, (match, content, offset, fullString) => {
    const before = fullString.substring(0, offset);
    const after = fullString.substring(offset + match.length);
    const quotesBefore = (before.match(/[^\\]"/g) || []).length;
    const quotesAfter = (after.match(/[^\\]"/g) || []).length;
    if (quotesBefore % 2 !== 0) {
      return match;
    }
    return `<em>${content}</em>`;
  });

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Process lists
  const lines = html.split('\n');
  const processedLines = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let listItems = [];

  function flushList() {
    if (listItems.length > 0) {
      const tag = inOrderedList ? 'ol' : 'ul';
      processedLines.push(`<${tag}>${listItems.join('')}</${tag}>`);
      listItems = [];
    }
    inUnorderedList = false;
    inOrderedList = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (inUnorderedList || inOrderedList) {
        flushList();
      }
      processedLines.push('');
      continue;
    }

    // Check for checkbox items first
    const checkboxMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
    const unorderedMatch = !checkboxMatch ? line.match(/^\s*[-*+]\s+(.+)$/) : null;
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);

    if (checkboxMatch) {
      if (inOrderedList) {
        flushList();
      }
      inUnorderedList = true;
      const isChecked = checkboxMatch[1].toLowerCase() === 'x';
      const content = checkboxMatch[2];
      listItems.push(`<li class="task-item${isChecked ? ' completed' : ''}"><input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${content}</li>`);
    } else if (unorderedMatch) {
      if (inOrderedList) {
        flushList();
      }
      inUnorderedList = true;
      listItems.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (inUnorderedList) {
        flushList();
      }
      inOrderedList = true;
      listItems.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inUnorderedList || inOrderedList) {
        flushList();
      }
      processedLines.push(line);
    }
  }
  flushList();

  html = processedLines.join('\n');

  // Paragraphs
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
        block.startsWith('<blockquote') || block.startsWith('<pre') || block.startsWith('<hr') ||
        block.startsWith('<p>') || block.startsWith(iframePlaceholder)) {
      return block;
    }
    if (!block.startsWith('<')) {
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }
    return block;
  }).join('\n');

  // Restore preserved iframes
  html = html.replace(/\u0000\u0001IFRAMEBLOCK(\d+)\u0001\u0000/g, (_match, index) => {
    console.log('Restoring iframe at index:', index);
    const iframe = preservedElements[parseInt(index) - 1];
    console.log('Restored iframe:', iframe ? iframe.substring(0, 100) : 'NOT FOUND');
    return iframe;
  });

  console.log('Final HTML contains iframe tag:', html.includes('<iframe'));

  return html;
}
