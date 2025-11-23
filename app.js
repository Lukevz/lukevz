/**
 * Digital Garden - Bear-style note browser
 * Lightweight markdown blog with 3-pane layout
 */

// State
const state = {
  posts: [],
  tags: new Map(),
  currentTag: 'all',
  currentPost: null,
  currentView: 'home',
  expandedTags: new Set() // Track expanded parent tags
};

// DOM Elements
const elements = {
  tagList: document.getElementById('tagList'),
  postsList: document.getElementById('postsList'),
  currentTag: document.getElementById('currentTag'),
  postCount: document.getElementById('postCount'),
  noteView: document.getElementById('noteView'),
  noteEmpty: document.getElementById('noteEmpty'),
  noteContent: document.getElementById('noteContent'),
  noteTitle: document.getElementById('noteTitle'),
  noteDate: document.getElementById('noteDate'),
  noteTags: document.getElementById('noteTags'),
  noteBody: document.getElementById('noteBody'),
  mobileMenuToggle: document.getElementById('mobileMenuToggle')
};

// Tag icons (simple SVG paths)
const tagIcons = {
  default: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  ideas: '<path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/><path d="M9 21h6"/><path d="M9 18h6"/>',
  projects: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  journal: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  notes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  reading: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  design: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  life: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  // Additional icons
  clippings: '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  vocab: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h6"/>',
  work: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  travel: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  health: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  finance: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  food: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  shopping: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  learning: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  fitness: '<path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 10v4"/><path d="M21 10v4"/><rect x="5" y="8" width="3" height="8" rx="1"/><rect x="16" y="8" width="3" height="8" rx="1"/><path d="M12 8v8"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'
};

// Music folder tabs icons
const musicFolderIcons = {
  Ambience: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M7.75,2c-.689,0-1.25,.561-1.25,1.25s.561,1.25,1.25,1.25,1.25-.561,1.25-1.25-.561-1.25-1.25-1.25Z" fill="currentColor"></path><path d="M10.194,6.846l-4.273,5.812c-.486,.66-.014,1.592,.806,1.592H15.273c.82,0,1.291-.932,.806-1.592l-4.273-5.812c-.4-.543-1.212-.543-1.611,0Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M7.731,10.195l-2.128-2.879c-.3-.406-.906-.406-1.206,0l-2.763,3.738c-.366,.495-.012,1.196,.603,1.196h3.984" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>',
  Music: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M9.615,2.382l3.5-.477c.6-.082,1.135,.385,1.135,.991v1.731c0,.5-.369,.923-.865,.991l-4.635,.632V3.373c0-.5,.369-.923,.865-.991Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><line x1="8.75" y1="6.25" x2="8.75" y2="13.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line><circle cx="6" cy="13.5" r="2.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></circle><path d="M4.493,5.742l-.946-.315-.316-.947c-.102-.306-.609-.306-.711,0l-.316,.947-.946,.315c-.153,.051-.257,.194-.257,.356s.104,.305,.257,.356l.946,.315,.316,.947c.051,.153,.194,.256,.355,.256s.305-.104,.355-.256l.316-.947,.946-.315c.153-.051,.257-.194,.257-.356s-.104-.305-.257-.356Z" fill="currentColor"></path><path d="M16.658,10.99l-1.263-.421-.421-1.263c-.137-.408-.812-.408-.949,0l-.421,1.263-1.263,.421c-.204,.068-.342,.259-.342,.474s.138,.406,.342,.474l1.263,.421,.421,1.263c.068,.204,.26,.342,.475,.342s.406-.138,.475-.342l.421-1.263,1.263-.421c.204-.068,.342-.259,.342-.474s-.138-.406-.342-.474Z" fill="currentColor"></path><circle cx="5.25" cy="2.25" r=".75" fill="currentColor"></circle></svg>',
  Podcasts: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect x="5.75" y="1.75" width="6.5" height="9.5" rx="3.25" ry="3.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><path d="M15.25,8c0,3.452-2.798,6.25-6.25,6.25h0c-3.452,0-6.25-2.798-6.25-6.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><line x1="9" y1="14.25" x2="9" y2="16.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line></svg>'
};

const defaultMusicFolders = ['Ambience', 'Music', 'Podcasts'];

/**
 * Lightweight Markdown Parser
 */
function parseMarkdown(text) {
  let html = text;

  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (before other transformations)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

  // Blockquotes
  html = html.replace(/^&gt; (.*$)/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?=\s*<li>)/g, '$1');

  // Paragraphs
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
        block.startsWith('<blockquote') || block.startsWith('<pre') || block.startsWith('<hr')) {
      return block;
    }
    // Wrap in paragraph if not already a block element
    if (!block.startsWith('<')) {
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }
    return block;
  }).join('\n');

  return html;
}

/**
 * Parse Bear-style front matter and tags
 * Bear exports with tags as #tag in the content
 */
function parsePost(content, filename) {
  const lines = content.split('\n');
  let title = filename.replace('.md', '');
  let date = new Date().toISOString().split('T')[0];
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

/**
 * Build tag navigation from posts with nested tag support
 */
function buildTagNav() {
  state.tags.clear();

  // Count posts per tag
  state.posts.forEach(post => {
    post.tags.forEach(tag => {
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

  // Keep "All Notes" and add tags
  elements.tagList.innerHTML = `
    <li>
      <button class="tag-item active" data-tag="all" aria-current="true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>All Notes</span>
      </button>
    </li>
    ${tagButtons}
  `;
}

/**
 * Render post list
 */
function renderPosts(tag = 'all') {
  const filtered = tag === 'all'
    ? state.posts
    : state.posts.filter(post =>
        post.tags.some(t => t === tag || t.startsWith(tag + '/'))
      );

  // Update header (show full path for nested tags)
  const displayTag = tag === 'all' ? 'All Notes' : tag.split('/').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  elements.currentTag.textContent = displayTag;
  elements.postCount.textContent = `${filtered.length} note${filtered.length !== 1 ? 's' : ''}`;

  // Update tag buttons
  document.querySelectorAll('.tag-item').forEach(btn => {
    const isActive = btn.dataset.tag === tag;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  if (filtered.length === 0) {
    elements.postsList.innerHTML = `
      <li class="empty-state">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No notes found</p>
      </li>
    `;
    return;
  }

  // Sort by date (newest first)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  elements.postsList.innerHTML = sorted.map(post => `
    <li class="post-item${state.currentPost?.filename === post.filename ? ' active' : ''}"
        data-filename="${post.filename}"
        tabindex="0"
        role="button"
        aria-label="Open ${post.title}">
      <h3 class="post-item-title">${post.title}</h3>
      <p class="post-item-excerpt">${post.excerpt}</p>
      <time class="post-item-date" datetime="${post.date}">${formatDate(post.date)}</time>
    </li>
  `).join('');
}

/**
 * Render note view
 */
function renderNote(post) {
  if (!post) {
    elements.noteEmpty.classList.remove('hidden');
    elements.noteContent.classList.add('hidden');
    return;
  }

  elements.noteEmpty.classList.add('hidden');
  elements.noteContent.classList.remove('hidden');

  elements.noteTitle.textContent = post.title;
  elements.noteDate.textContent = formatDate(post.date);
  elements.noteDate.setAttribute('datetime', post.date);

  elements.noteTags.innerHTML = post.tags
    .map(tag => `<span class="note-tag">#${tag}</span>`)
    .join('');

  elements.noteBody.innerHTML = parseMarkdown(post.body);

  // Add back button for mobile
  if (!document.querySelector('.note-back')) {
    const backBtn = document.createElement('button');
    backBtn.className = 'note-back';
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span>Back</span>
    `;
    backBtn.addEventListener('click', closeNote);
    elements.noteView.insertBefore(backBtn, elements.noteView.firstChild);
  }

  // Show note view on mobile
  elements.noteView.classList.add('active');

  // Update post list active state
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.toggle('active', item.dataset.filename === post.filename);
  });

  // Scroll to top of note
  elements.noteView.scrollTop = 0;
}

/**
 * Close note view (mobile)
 */
function closeNote() {
  elements.noteView.classList.remove('active');
  state.currentPost = null;
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.remove('active');
  });
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Toggle mobile sidebar
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.toggle('open');
  elements.mobileMenuToggle.setAttribute('aria-expanded', isOpen);

  // Handle overlay
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', toggleSidebar);
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active', isOpen);
}

/**
 * Event handlers
 */
function setupEventListeners() {
  // Tag navigation
  elements.tagList.addEventListener('click', (e) => {
    // Handle toggle button for nested tags
    const toggleBtn = e.target.closest('.tag-toggle');
    if (toggleBtn) {
      e.stopPropagation();
      const tagPath = toggleBtn.dataset.tagPath;
      const isExpanded = state.expandedTags.has(tagPath);

      if (isExpanded) {
        state.expandedTags.delete(tagPath);
      } else {
        state.expandedTags.add(tagPath);
      }

      // Toggle the expanded state
      toggleBtn.classList.toggle('expanded', !isExpanded);
      const childList = toggleBtn.closest('.tag-tree-item').querySelector('.tag-children');
      if (childList) {
        childList.classList.toggle('collapsed', isExpanded);
      }
      return;
    }

    const tagBtn = e.target.closest('.tag-item');
    if (tagBtn) {
      state.currentTag = tagBtn.dataset.tag;
      renderPosts(state.currentTag);

      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    }
  });

  // Post selection
  elements.postsList.addEventListener('click', (e) => {
    const postItem = e.target.closest('.post-item');
    if (postItem) {
      const post = state.posts.find(p => p.filename === postItem.dataset.filename);
      if (post) {
        state.currentPost = post;
        renderNote(post);
      }
    }
  });

  // Keyboard navigation for posts
  elements.postsList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const postItem = e.target.closest('.post-item');
      if (postItem) {
        e.preventDefault();
        postItem.click();
      }
    }
  });

  // Mobile menu toggle
  elements.mobileMenuToggle.addEventListener('click', toggleSidebar);

  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar.classList.contains('open')) {
        toggleSidebar();
      } else if (elements.noteView.classList.contains('active') && window.innerWidth <= 1024) {
        closeNote();
      }
    }
  });
}

/**
 * Load posts from posts.js manifest
 */
async function loadPosts() {
  try {
    // Load posts manifest
    const postsModule = await import('./posts.js');
    const postFiles = postsModule.default || postsModule.posts || [];

    // Load each post
    for (const file of postFiles) {
      try {
        const response = await fetch(`posts/${encodeURIComponent(file)}`);
        if (response.ok) {
          const content = await response.text();
          const post = parsePost(content, file);
          state.posts.push(post);
        }
      } catch (err) {
        console.warn(`Failed to load ${file}:`, err);
      }
    }

    // Build UI
    buildTagNav();
    renderPosts();

    // Open first post on desktop
    if (window.innerWidth > 1024 && state.posts.length > 0) {
      const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      state.currentPost = sorted[0];
      renderNote(sorted[0]);
    }
  } catch (err) {
    console.error('Failed to load posts manifest:', err);
    elements.postsList.innerHTML = `
      <li class="empty-state">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Add posts to the /posts folder<br>and register them in posts.js</p>
      </li>
    `;
  }
}

/**
 * Render latest post on home view
 */
function renderLatestPost() {
  const latestPostEl = document.getElementById('latestPost');
  if (!latestPostEl || state.posts.length === 0) return;

  const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];

  latestPostEl.innerHTML = `
    <h3 class="latest-post-title">${latest.title}</h3>
    <p class="latest-post-excerpt">${latest.excerpt}</p>
    <time class="latest-post-date">${formatDate(latest.date)}</time>
  `;

  // Click to navigate to notes and open the post
  latestPostEl.addEventListener('click', () => {
    switchView('notes');
    state.currentPost = latest;
    renderNote(latest);
  });
}

/**
 * Switch between views (home, tasks, notes)
 */
function switchView(viewName) {
  // Update view visibility
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`${viewName}View`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  state.currentView = viewName;
}

/**
 * Setup floating navigation
 */
function setupFloatingNav() {
  const floatingNav = document.getElementById('floatingNav');
  if (!floatingNav) return;

  floatingNav.addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab');
    if (tab) {
      const viewName = tab.dataset.view;
      switchView(viewName);
    }
  });
}

/**
 * Load and render goals from goals.md
 */
async function loadGoals() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  try {
    const response = await fetch('goals.md');
    if (!response.ok) throw new Error('Failed to load goals.md');

    const content = await response.text();
    const lines = content.split('\n');
    let html = '';
    let currentSection = null;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0 && currentSection) {
        html += `<section class="tasks-section">
          <h2>${currentSection}</h2>
          <ul class="tasks-list">
            ${listItems.join('')}
          </ul>
        </section>`;
        listItems = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // H1 header = section title
      if (trimmed.startsWith('# ')) {
        flushList();
        currentSection = trimmed.slice(2);
      }
      // Checkbox list item: - [x] or - [ ]
      else if (trimmed.match(/^- \[(x| )\] /)) {
        const isChecked = trimmed.startsWith('- [x]');
        let text = trimmed.slice(6); // Remove "- [x] " or "- [ ] "
        // Parse markdown links [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        listItems.push(`
          <li class="task-item${isChecked ? ' completed' : ''}">
            <span class="task-checkbox${isChecked ? ' checked' : ''}"></span>
            <span>${text}</span>
          </li>
        `);
      }
      // Regular list item: - text
      else if (trimmed.startsWith('- ')) {
        let text = trimmed.slice(2);
        // Parse markdown links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        listItems.push(`
          <li class="task-item">
            <span class="task-status active"></span>
            <span>${text}</span>
          </li>
        `);
      }
    }

    flushList();
    container.innerHTML = html;
  } catch (err) {
    console.warn('Could not load goals.md:', err);
    container.innerHTML = '<p class="empty-state">Add goals to goals.md</p>';
  }
}

/**
 * Update menu bar time
 */
function updateMenuTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours}:${minutes} ${ampm}`;

  // Update all time elements
  const timeElements = ['menuTime', 'notesMenuTime'];
  timeElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = timeString;
  });
}

/**
 * Weather condition to emoji mapping
 */
function getWeatherEmoji(code) {
  // WMO Weather interpretation codes
  // https://open-meteo.com/en/docs
  const weatherEmojis = {
    0: '☀️',   // Clear sky
    1: '🌤️',  // Mainly clear
    2: '⛅',   // Partly cloudy
    3: '☁️',   // Overcast
    45: '🌫️', // Fog
    48: '🌫️', // Depositing rime fog
    51: '🌧️', // Drizzle light
    53: '🌧️', // Drizzle moderate
    55: '🌧️', // Drizzle dense
    56: '🌧️', // Freezing drizzle light
    57: '🌧️', // Freezing drizzle dense
    61: '🌧️', // Rain slight
    63: '🌧️', // Rain moderate
    65: '🌧️', // Rain heavy
    66: '🌧️', // Freezing rain light
    67: '🌧️', // Freezing rain heavy
    71: '🌨️', // Snow fall slight
    73: '🌨️', // Snow fall moderate
    75: '🌨️', // Snow fall heavy
    77: '🌨️', // Snow grains
    80: '🌧️', // Rain showers slight
    81: '🌧️', // Rain showers moderate
    82: '🌧️', // Rain showers violent
    85: '🌨️', // Snow showers slight
    86: '🌨️', // Snow showers heavy
    95: '⛈️', // Thunderstorm
    96: '⛈️', // Thunderstorm with slight hail
    99: '⛈️', // Thunderstorm with heavy hail
  };
  return weatherEmojis[code] || '🌡️';
}

/**
 * Fetch weather for Atlanta, GA using Open-Meteo API (free, no API key required)
 */
async function fetchWeather() {
  try {
    // Atlanta, GA coordinates: 33.749, -84.388
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=33.749&longitude=-84.388&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York'
    );

    if (!response.ok) throw new Error('Weather fetch failed');

    const data = await response.json();
    const temp = Math.round(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;
    const emoji = getWeatherEmoji(weatherCode);
    const tempString = `${temp}°F`;

    // Update all weather elements
    const iconElements = ['weatherIcon', 'notesWeatherIcon'];
    const tempElements = ['weatherTemp', 'notesWeatherTemp'];

    iconElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = emoji;
    });

    tempElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = tempString;
    });
  } catch (err) {
    console.warn('Could not fetch weather:', err);
    ['weatherIcon', 'notesWeatherIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '🌡️';
    });
    ['weatherTemp', 'notesWeatherTemp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Atlanta';
    });
  }
}

/**
 * Initialize menu bar
 */
function initMenuBar() {
  // Update time immediately and every minute
  updateMenuTime();
  setInterval(updateMenuTime, 60000);

  // Fetch weather immediately and refresh every 30 minutes
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);
}

/**
 * Music Player State
 */
const musicState = {
  allTracks: [],
  tracks: [],
  folders: [...defaultMusicFolders],
  activeFolder: 'Music',
  currentIndex: -1,
  isPlaying: false,
  player: null,
  apiReady: false,
  pendingVideoId: null,
  progressTimer: null
};

const defaultArtworkMarkup = document.getElementById('artworkContainer')
  ? document.getElementById('artworkContainer').innerHTML
  : '';

/**
 * Load and parse music.md for tracks
 */
async function loadMusic() {
  const playlist = document.getElementById('musicPlaylist');
  if (!playlist) return;

  try {
    const response = await fetch('music.md');
    if (!response.ok) throw new Error('Failed to load music.md');

    const content = await response.text();
    const { tracks, folders } = await parseMusicMd(content);
    await enrichTrackMetadata(tracks);
    musicState.allTracks = tracks;
    musicState.folders = mergeFolders(folders);
    if (!musicState.folders.includes(musicState.activeFolder)) {
      musicState.activeFolder = musicState.folders.find(folder => folder === 'Music')
        || musicState.folders[0]
        || 'Music';
    }

    const activeHasTracks = musicState.allTracks.some(track => track.folder === musicState.activeFolder);
    if (!activeHasTracks) {
      const firstWithTracks = musicState.folders.find(folder =>
        musicState.allTracks.some(track => track.folder === folder)
      );
      if (firstWithTracks) {
        musicState.activeFolder = firstWithTracks;
      }
    }

    applyFolderFilter(true);
    renderMusicFolders();
    renderPlaylist();
    loadYouTubeIframeAPI();

  } catch (err) {
    console.warn('Could not load music.md:', err);
    musicState.allTracks = [];
    musicState.tracks = [];
    renderMusicFolders();
    playlist.innerHTML = `
      <div class="playlist-empty">
        <p>Create <code>music.md</code> to add music</p>
      </div>
    `;
  }
}

/**
 * Parse music.md content to extract tracks
 */
async function parseMusicMd(content) {
  const tracks = [];
  const lines = content.split('\n');
  let currentFolder = 'Music';
  const folderOrder = [];

  const recordFolder = (folder) => {
    if (!folder) return;
    if (!folderOrder.includes(folder)) folderOrder.push(folder);
  };

  recordFolder(currentFolder);

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headings define folders
    const headingMatch = trimmed.match(/^##\s+(.+)/);
    if (headingMatch) {
      currentFolder = headingMatch[1].trim() || currentFolder;
      recordFolder(currentFolder);
      continue;
    }

    // Match markdown link format: [Title - Artist](url)
    const linkMatch = trimmed.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, text, url] = linkMatch;
      const videoId = extractYouTubeId(url);
      if (videoId) {
        const hasArtist = text.includes(' - ');
        const [title, artist] = hasArtist
          ? text.split(' - ', 2)
          : [text, 'Unknown Artist'];
        tracks.push({
          title: title.trim(),
          artist: artist.trim(),
          videoId,
          url,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          needsMetadata: !hasArtist,
          folder: currentFolder
        });
      }
      continue;
    }

    // Match plain URL format: - https://youtube.com/...
    const urlMatch = trimmed.match(/^-\s*(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      const videoId = extractYouTubeId(url);
      if (videoId) {
        tracks.push({
          title: 'YouTube Video',
          artist: 'Unknown',
          videoId,
          url,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          needsMetadata: true,
          folder: currentFolder
        });
      }
    }
  }

  return {
    tracks,
    folders: folderOrder
  };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch and hydrate metadata for tracks that only had URLs
 */
async function enrichTrackMetadata(tracks) {
  const pending = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => track.needsMetadata);

  if (pending.length === 0) return;

  await Promise.all(pending.map(async ({ track }) => {
    const meta = await fetchYouTubeMetadata(track.url);
    if (!meta) return;

    const parsed = extractMetadataFromTitle(meta.title || track.title);
    track.title = parsed.title;
    track.artist = track.artist === 'Unknown' && meta.author
      ? meta.author
      : parsed.artist || meta.author || track.artist;
    track.thumbnail = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
    track.needsMetadata = false;
  }));
}

/**
 * Retrieve lightweight oEmbed metadata from YouTube
 */
async function fetchYouTubeMetadata(url) {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembed);
    if (!res.ok) throw new Error('oEmbed request failed');
    const data = await res.json();
    return {
      title: data.title,
      author: data.author_name
    };
  } catch (err) {
    console.warn('Could not fetch YouTube metadata:', err);
    return null;
  }
}

/**
 * Try to split a YouTube title into artist/title
 */
function extractMetadataFromTitle(rawTitle) {
  if (!rawTitle) return { title: 'YouTube Video', artist: 'Unknown' };
  const separator = rawTitle.indexOf(' - ');
  if (separator > 0 && separator < rawTitle.length - 3) {
    const artist = rawTitle.slice(0, separator).trim();
    const title = rawTitle.slice(separator + 3).trim();
    return { title, artist };
  }
  return { title: rawTitle.trim(), artist: '' };
}

function mergeFolders(foundFolders = []) {
  const seen = new Set();
  const ordered = [];

  [...defaultMusicFolders, ...foundFolders].forEach((folder) => {
    if (!folder || seen.has(folder)) return;
    seen.add(folder);
    ordered.push(folder);
  });

  return ordered;
}

function applyFolderFilter(resetPlayer = false) {
  musicState.tracks = musicState.allTracks.filter(track => track.folder === musicState.activeFolder);
  if (resetPlayer) resetPlayerForFolder();
}

function switchFolder(folder) {
  if (!folder || musicState.activeFolder === folder) return;
  musicState.activeFolder = folder;
  applyFolderFilter(true);
  renderMusicFolders();
  renderPlaylist();
}

function resetPlayerForFolder() {
  musicState.currentIndex = -1;
  musicState.isPlaying = false;
  stopProgressTimer();

  const titleEl = document.getElementById('playerTitle');
  const artistEl = document.getElementById('playerArtist');
  const currentEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const fill = document.getElementById('progressFill');
  const hasTracks = musicState.tracks.length > 0;

  if (titleEl) titleEl.textContent = hasTracks
    ? 'Select a track below'
    : `No ${musicState.activeFolder} tracks yet`;
  if (artistEl) artistEl.textContent = 'Add tracks to music.md';
  if (currentEl) currentEl.textContent = '0:00';
  if (durationEl) durationEl.textContent = '0:00';
  if (fill) fill.style.width = '0%';

  if (musicState.player && musicState.apiReady && window.YT) {
    if (typeof musicState.player.stopVideo === 'function') {
      musicState.player.stopVideo();
    }
    if (typeof musicState.player.destroy === 'function') {
      musicState.player.destroy();
    }
  }
  musicState.player = null;
  musicState.pendingVideoId = null;

  const artworkContainer = document.getElementById('artworkContainer');
  if (artworkContainer && defaultArtworkMarkup) {
    artworkContainer.classList.remove('is-video');
    artworkContainer.innerHTML = defaultArtworkMarkup;
  }

  updatePlayButton();
}

function renderMusicFolders() {
  const folderBar = document.getElementById('musicFolders');
  if (!folderBar) return;

  const folders = musicState.folders.length ? musicState.folders : defaultMusicFolders;

  folderBar.innerHTML = folders.map((folder) => {
    const isActive = folder === musicState.activeFolder;
    const icon = musicFolderIcons[folder] || '';
    return `
      <button class="folder-tab${isActive ? ' active' : ''}" data-folder="${folder}" role="tab" aria-selected="${isActive}" tabindex="${isActive ? '0' : '-1'}">
        <span class="folder-icon">${icon}</span>
        <span class="folder-label">${folder}</span>
      </button>
    `;
  }).join('');

  folderBar.querySelectorAll('.folder-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchFolder(btn.dataset.folder));
  });
}

/**
 * Render the playlist
 */
function renderPlaylist() {
  const playlist = document.getElementById('musicPlaylist');
  if (!playlist) return;

  if (musicState.tracks.length === 0) {
    playlist.innerHTML = `
      <div class="playlist-empty">
        <p>No ${musicState.activeFolder} tracks yet</p>
        <p>Add YouTube links to <code>music.md</code></p>
      </div>
    `;
    return;
  }

  playlist.innerHTML = musicState.tracks.map((track, index) => `
    <div class="playlist-item${index === musicState.currentIndex ? ' active playing' : ''}" data-index="${index}">
      <div class="playlist-thumb">
        <img src="${track.thumbnail}" alt="${track.title}" loading="lazy">
      </div>
      <div class="playlist-info">
        <div class="playlist-title">${track.title}</div>
        <div class="playlist-artist">${track.artist}</div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  playlist.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index, 10);
      playTrack(index);
    });
  });
}

/**
 * Play a specific track
 */
function playTrack(index) {
  if (index < 0 || index >= musicState.tracks.length) return;

  const track = musicState.tracks[index];
  musicState.currentIndex = index;
  stopProgressTimer();

  // Update UI
  document.getElementById('playerTitle').textContent = track.title;
  document.getElementById('playerArtist').textContent = track.artist;
  const fill = document.getElementById('progressFill');
  const currentEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  if (fill) fill.style.width = '0%';
  if (currentEl) currentEl.textContent = '0:00';
  if (durationEl) durationEl.textContent = '0:00';

  // Update artwork
  const artworkContainer = document.getElementById('artworkContainer');
  if (artworkContainer) {
    artworkContainer.classList.remove('is-video');
    artworkContainer.innerHTML = `<img src="${track.thumbnail}" alt="${track.title}">`;
  }

  // Update playlist active state
  document.querySelectorAll('.playlist-item').forEach((item, i) => {
    item.classList.toggle('active', i === index);
    item.classList.toggle('playing', i === index && musicState.isPlaying);
  });

  musicState.isPlaying = true;
  ensureYouTubePlayer(track.videoId);
  updatePlayButton();
}

/**
 * Toggle play/pause
 */
function togglePlay() {
  if (musicState.tracks.length === 0) return;

  if (musicState.currentIndex === -1) {
    playTrack(0);
    return;
  }

  if (musicState.player && musicState.apiReady && window.YT) {
    const state = musicState.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      musicState.player.pauseVideo();
    } else {
      musicState.player.playVideo();
    }
  } else {
    playTrack(musicState.currentIndex);
  }
}

/**
 * Inject YouTube Iframe API script once
 */
function loadYouTubeIframeAPI() {
  if (document.getElementById('youtube-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id = 'youtube-iframe-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(tag);
}

/**
 * Prepare container and create/load player
 */
function ensureYouTubePlayer(videoId) {
  const artworkContainer = document.getElementById('artworkContainer');
  if (artworkContainer) {
    artworkContainer.classList.add('is-video');
    artworkContainer.innerHTML = `<div class="video-frame" id="youtubePlayer"></div>`;
  }

  musicState.pendingVideoId = videoId;

  if (musicState.apiReady && window.YT && window.YT.Player) {
    createYouTubePlayer(videoId);
  }
  loadYouTubeIframeAPI();
}

/**
 * Create or reuse iframe player
 */
function createYouTubePlayer(videoId) {
  if (musicState.player) {
    musicState.player.loadVideoById(videoId);
    musicState.player.playVideo();
    startProgressTimer();
    musicState.isPlaying = true;
    updatePlayButton();
    musicState.pendingVideoId = null;
    return;
  }

  const mount = document.getElementById('youtubePlayer');
  if (!mount) return;

  musicState.player = new YT.Player(mount, {
    videoId,
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      fs: 0,
      iv_load_policy: 3
    },
    events: {
      onReady: (event) => {
        event.target.playVideo();
        musicState.isPlaying = true;
        updatePlayButton();
        startProgressTimer();
        updateDuration();
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          musicState.isPlaying = true;
          updatePlayButton();
          startProgressTimer();
        } else if (event.data === YT.PlayerState.PAUSED) {
          musicState.isPlaying = false;
          updatePlayButton();
          stopProgressTimer();
        } else if (event.data === YT.PlayerState.ENDED) {
          musicState.isPlaying = false;
          updatePlayButton();
          stopProgressTimer();
          playNext();
        }
      }
    }
  });
  musicState.pendingVideoId = null;
}

// YouTube API global callback
window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
  musicState.apiReady = true;
  if (musicState.pendingVideoId) {
    createYouTubePlayer(musicState.pendingVideoId);
  }
};

/**
 * Play next track
 */
function playNext() {
  if (musicState.tracks.length === 0) return;
  const nextIndex = (musicState.currentIndex + 1) % musicState.tracks.length;
  playTrack(nextIndex);
}

/**
 * Play previous track
 */
function playPrev() {
  if (musicState.tracks.length === 0) return;
  const prevIndex = musicState.currentIndex <= 0
    ? musicState.tracks.length - 1
    : musicState.currentIndex - 1;
  playTrack(prevIndex);
}

/**
 * Update play button icon
 */
function updatePlayButton() {
  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;

  const iconPlay = playBtn.querySelector('.icon-play');
  const iconPause = playBtn.querySelector('.icon-pause');

  if (musicState.isPlaying) {
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
  } else {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
  }

  document.querySelectorAll('.playlist-item').forEach((item, index) => {
    item.classList.toggle('playing', musicState.isPlaying && index === musicState.currentIndex);
  });
}

/**
 * Update progress bar based on YouTube player time
 */
function updateProgress() {
  if (!musicState.player || !musicState.apiReady || !window.YT) return;

  const duration = musicState.player.getDuration();
  const current = musicState.player.getCurrentTime();
  if (!duration || Number.isNaN(duration)) return;

  const percent = (current / duration) * 100;
  const fill = document.getElementById('progressFill');
  const currentEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  if (fill) fill.style.width = `${percent}%`;
  if (currentEl) currentEl.textContent = formatTime(current);
  if (durationEl) durationEl.textContent = formatTime(duration);
}

/**
 * Update duration display (called when metadata loads)
 */
function updateDuration() {
  if (!musicState.player || !musicState.apiReady || !window.YT) return;
  const duration = musicState.player.getDuration();
  if (!duration || Number.isNaN(duration)) return;
  const durationEl = document.getElementById('duration');
  if (durationEl) durationEl.textContent = formatTime(duration);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function startProgressTimer() {
  stopProgressTimer();
  musicState.progressTimer = setInterval(updateProgress, 500);
}

function stopProgressTimer() {
  if (musicState.progressTimer) {
    clearInterval(musicState.progressTimer);
    musicState.progressTimer = null;
  }
}

/**
 * Setup music player controls
 */
function setupMusicPlayer() {
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressBar = document.getElementById('progressBar');

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', playPrev);
  if (nextBtn) nextBtn.addEventListener('click', playNext);

  // Progress bar seeking (placeholder)
  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!musicState.player || !musicState.apiReady || !window.YT) return;
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const duration = musicState.player.getDuration();
      if (!duration || Number.isNaN(duration)) return;
      musicState.player.seekTo(duration * percent, true);
    });
  }
}

/**
 * Initialize app
 */
async function init() {
  setupEventListeners();
  setupFloatingNav();
  setupMusicPlayer();
  initMenuBar();
  await loadPosts();
  renderLatestPost();
  await loadGoals();
  await loadMusic();
}

// Start the app
init();
