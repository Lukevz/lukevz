/**
 * Tag Navigation Module
 * Handles tag hierarchy, rendering, and navigation
 */

import { tagIcons } from '../../config/icons.js';
import { hiddenTags } from '../../config/constants.js';

/**
 * Build and render tag navigation from posts
 * @param {Object} state - App state containing posts and tags
 * @param {HTMLElement} tagListElement - DOM element to render tags into
 */
export function buildTagNav(state, tagListElement) {
  state.tags.clear();

  // Count posts per tag (excluding hidden tags)
  state.posts.forEach(post => {
    post.tags.forEach(tag => {
      // Skip hidden tags and their children
      const rootTag = tag.split('/')[0];
      if (hiddenTags.includes(rootTag)) return;
      state.tags.set(tag, (state.tags.get(tag) || 0) + 1);
    });
  });

  // Build hierarchical tag tree
  const tagTree = {};
  for (const [tag, count] of state.tags.entries()) {
    const parts = tag.split('/');
    let current = tagTree;
    let path = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      path = path ? `${path}/${part}` : part;

      if (!current[part]) {
        current[part] = {
          _fullPath: path,
          _count: 0,
          _children: {}
        };
      }

      // Only set count on the actual tag, not intermediate paths
      if (i === parts.length - 1) {
        current[part]._count = count;
      }

      current = current[part]._children;
    }
  }

  // Render tag tree recursively
  function renderTagTree(tree, depth = 0) {
    const entries = Object.entries(tree)
      .filter(([key]) => !key.startsWith('_'))
      .sort((a, b) => a[0].localeCompare(b[0]));

    return entries.map(([name, node]) => {
      const hasChildren = Object.keys(node._children).length > 0;
      const iconPath = tagIcons[node._fullPath] || tagIcons[name] || tagIcons.default;
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      const isExpanded = state.expandedTags?.has(node._fullPath) ?? true;

      let html = `
        <li class="tag-tree-item" data-depth="${depth}">
          <div class="tag-item-row">
            ${hasChildren ? `
              <button class="tag-toggle ${isExpanded ? 'expanded' : ''}" data-tag-path="${node._fullPath}" aria-label="Toggle ${displayName}">
                <svg class="icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ` : '<span class="tag-toggle-spacer"></span>'}
            <button class="tag-item${depth > 0 ? ' nested' : ''}" data-tag="${node._fullPath}">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                ${iconPath}
              </svg>
              <span>${displayName}</span>
            </button>
          </div>
          ${hasChildren ? `
            <ul class="tag-children ${isExpanded ? '' : 'collapsed'}">
              ${renderTagTree(node._children, depth + 1)}
            </ul>
          ` : ''}
        </li>
      `;
      return html;
    }).join('');
  }

  const tagButtons = renderTagTree(tagTree);

  // Find Garden Readme post
  const gardenReadme = state.posts.find(p => p.filename === 'Garden Readme.md');
  const gardenReadmeButton = gardenReadme ? `
    <li>
      <button class="tag-item garden-readme-item" data-filename="${gardenReadme.filename}" aria-label="Open ${gardenReadme.title}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Readme</span>
      </button>
    </li>
  ` : '';

  // Count total notes (excluding Garden Readme)
  const totalNotes = state.posts.filter(post => post.filename !== 'Garden Readme.md').length;

  // Render: "All Notes", Garden Readme, then tags
  tagListElement.innerHTML = `
    <li>
      <button class="tag-item active" data-tag="all" aria-current="true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>All Notes</span>
        <span class="tag-count" id="allNotesCount">${totalNotes}</span>
      </button>
    </li>
    ${gardenReadmeButton}
    ${tagButtons}
  `;
}
