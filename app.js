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
  life: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'
};

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
 * Initialize app
 */
async function init() {
  setupEventListeners();
  setupFloatingNav();
  await loadPosts();
  renderLatestPost();
  await loadGoals();
}

// Start the app
init();
