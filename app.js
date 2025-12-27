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
  currentView: null,
  expandedTags: new Set(), // Track expanded parent tags
  windows: {
    openWindows: new Set() // Track which windows are open
  },
  thoughtTrains: [],            // Array of parsed train objects
  currentTrainIndex: 0,         // Currently focused card index
  filteredTrains: [],           // Trains after tag filtering
  trainTags: new Map(),         // Tag → count mapping
  currentTrainTag: 'all',       // Active tag filter
  isTrainExpanded: false,       // Track if detail view is open
  labs: []                      // Array of parsed lab objects
};

// DOM Elements
const elements = {
  tagList: document.getElementById('tagList'),
  postsList: document.getElementById('postsList'),
  noteView: document.getElementById('noteView'),
  noteEmpty: document.getElementById('noteEmpty'),
  noteContent: document.getElementById('noteContent'),
  noteTitle: document.getElementById('noteTitle'),
  noteDate: document.getElementById('noteDate'),
  noteTags: document.getElementById('noteTags'),
  noteBody: document.getElementById('noteBody'),
  mobileMenuToggle: document.getElementById('mobileMenuToggle')
};

// ==========================================
// View Management System
// ==========================================

const LAST_OPEN_WINDOW_STORAGE_KEY = 'lastOpenWindowId';

function getLastOpenWindowId() {
  try {
    return localStorage.getItem(LAST_OPEN_WINDOW_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setLastOpenWindowId(windowId) {
  try {
    if (!windowId) {
      localStorage.removeItem(LAST_OPEN_WINDOW_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LAST_OPEN_WINDOW_STORAGE_KEY, windowId);
  } catch {
    // ignore
  }
}

/**
 * Check if we're on mobile
 */
function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * Setup view management (simplified - no dragging/resizing)
 */
function setupWindowManagement() {
  // No setup needed - views are full-screen now
}

/**
 * Close a window
 */
function closeWindow(window) {
  const windowId = window.id.replace('View', '');
  window.classList.remove('active');
  state.windows.openWindows.delete(windowId);

  // Update nav icon button state
  const navBtn = document.querySelector(`.nav-icon-btn[data-view="${windowId}"]`);
  if (navBtn) {
    navBtn.classList.remove('active');
  }

  // Special handling for Notes view
  if (windowId === 'notes') {
    // Close the note view if it's open
    if (elements.noteView) {
      elements.noteView.classList.remove('active');
    }
    // Clear current post
    state.currentPost = null;
    // Clear active state from post items
    document.querySelectorAll('.post-item').forEach(item => {
      item.classList.remove('active');
    });
    // Close sidebar if it's open on mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      toggleSidebar();
    }
  }

  // Special handling for Music view
  if (windowId === 'music') {
    // If media is playing (or was playing), show mini player
    if (musicState.isPlaying || musicState.playingTrack) {
      showMiniPlayer();
    } else {
      hideMiniPlayer();
    }
  }

  // Update top menu bar - remove solid state when no apps are active
  if (state.windows.openWindows.size === 0) {
    setLastOpenWindowId(null);
    const topMenuBar = document.getElementById('topMenuBar');
    if (topMenuBar) {
      topMenuBar.classList.remove('app-active');
    }
  }
}

/**
 * Open a window
 */
async function openWindow(windowId) {
  const window = document.getElementById(`${windowId}View`);
  if (!window) {
    setLastOpenWindowId(null);
    return;
  }

  window.classList.add('active');
  state.windows.openWindows.add(windowId);
  setLastOpenWindowId(windowId);

  // Update nav icon button state
  const navBtn = document.querySelector(`.nav-icon-btn[data-view="${windowId}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
  }

  // Update top menu bar to solid state when app is active
  const topMenuBar = document.getElementById('topMenuBar');
  if (topMenuBar) {
    topMenuBar.classList.add('app-active');
  }

  // Handle special cases for specific windows
  if (windowId === 'notes' && state.posts.length > 0) {
    const noteFromUrl = getNoteFromUrl();
    if (noteFromUrl) {
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, false);
    } else {
      // If no note in URL, always default to Garden Readme first
      const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
      if (defaultPost) {
        state.currentPost = defaultPost;
        renderNote(defaultPost);
      } else if (state.currentPost) {
        // Fall back to current post if Garden Readme doesn't exist
        renderNote(state.currentPost);
      }
    }
  }

  // Hide mini player when music window is opened
  if (windowId === 'music') {
    hideMiniPlayer();
  }

  // Initialize life stories when opened
  if (windowId === 'lifeStories') {
    initLifeStories();
  }

  // Initialize thought train when opened
  if (windowId === 'thoughtTrain') {
    if (state.thoughtTrains.length === 0) {
      await loadThoughtTrains();
    }
    renderThoughtTrainCards();
  }

  state.currentView = windowId;
}

/**
 * Toggle view open/closed (single view mode - only one view at a time)
 */
function toggleWindow(windowId) {
  if (state.windows.openWindows.has(windowId)) {
    // If clicking the same view, close it
    const window = document.getElementById(`${windowId}View`);
    closeWindow(window);
  } else {
    // Close all other views first (single view mode)
    const openWindows = Array.from(state.windows.openWindows);
    openWindows.forEach(openWindowId => {
      if (openWindowId !== windowId) {
        const win = document.getElementById(`${openWindowId}View`);
        if (win) closeWindow(win);
      }
    });
    openWindow(windowId);
  }
}

// Tag icons (Lucide icon SVG paths - https://lucide.dev/icons/)
const tagIcons = {
  // Default tag icon
  default: '<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>',

  // Your actual tags
  // Briefcase for business
  business: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  // Video for uxwithluke
  uxwithluke: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  // Library/notebook for commonplace
  commonplace: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  // Book for books
  books: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  // Quote for quotes
  quotes: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  // Heart for life
  life: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  // Compass for northstar
  northstar: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  // Circle-check for status
  status: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  // Check-circle for complete
  complete: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  // Pen for writing
  writing: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',

  // Additional common icons
  // Lightbulb for ideas
  ideas: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  // Folder for projects
  projects: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  // Book for journal
  journal: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  // File text for notes
  notes: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  // Book open for reading
  reading: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  // Code for code
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  // Palette for design
  design: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2Z"/>',
  // Clipboard for clippings
  clippings: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  // Languages/book-a for vocab
  vocab: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  // Briefcase for work
  work: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  // Plane for travel
  travel: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  // Music for music
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  // Camera for photo
  photo: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  // Activity/heart pulse for health
  health: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  // Wallet for finance
  finance: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  // Utensils for food
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  // Shopping cart for shopping
  shopping: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  // Graduation cap for learning
  learning: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  // Dumbbell for fitness
  fitness: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
  // Home for home
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  // Star for star
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  // Archive for archive
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  // Bookmark for bookmarks
  bookmarks: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  // Sparkles for inspiration
  inspiration: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  // Podcast for podcasts
  podcasts: '<path d="M16.85 18.58a9 9 0 1 0-9.7 0"/><path d="M8 14a5 5 0 1 1 8 0"/><circle cx="12" cy="11" r="1"/><path d="M13 17a1 1 0 1 0-2 0l.5 4.5a.5.5 0 1 0 1 0Z"/>'
};

// Music folder tabs icons
const musicFolderIcons = {
  Ambience: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M7.75,2c-.689,0-1.25,.561-1.25,1.25s.561,1.25,1.25,1.25,1.25-.561,1.25-1.25-.561-1.25-1.25-1.25Z" fill="currentColor"></path><path d="M10.194,6.846l-4.273,5.812c-.486,.66-.014,1.592,.806,1.592H15.273c.82,0,1.291-.932,.806-1.592l-4.273-5.812c-.4-.543-1.212-.543-1.611,0Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M7.731,10.195l-2.128-2.879c-.3-.406-.906-.406-1.206,0l-2.763,3.738c-.366,.495-.012,1.196,.603,1.196h3.984" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>',
  Music: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M9.615,2.382l3.5-.477c.6-.082,1.135,.385,1.135,.991v1.731c0,.5-.369,.923-.865,.991l-4.635,.632V3.373c0-.5,.369-.923,.865-.991Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><line x1="8.75" y1="6.25" x2="8.75" y2="13.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line><circle cx="6" cy="13.5" r="2.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></circle><path d="M4.493,5.742l-.946-.315-.316-.947c-.102-.306-.609-.306-.711,0l-.316,.947-.946,.315c-.153,.051-.257,.194-.257,.356s.104,.305,.257,.356l.946,.315,.316,.947c.051,.153,.194,.256,.355,.256s.305-.104,.355-.256l.316-.947,.946-.315c.153-.051,.257-.194,.257-.356s-.104-.305-.257-.356Z" fill="currentColor"></path><path d="M16.658,10.99l-1.263-.421-.421-1.263c-.137-.408-.812-.408-.949,0l-.421,1.263-1.263,.421c-.204,.068-.342,.259-.342,.474s.138,.406,.342,.474l1.263,.421,.421,1.263c.068,.204,.26,.342,.475,.342s.406-.138,.475-.342l.421-1.263,1.263-.421c.204-.068,.342-.259,.342-.474s-.138-.406-.342-.474Z" fill="currentColor"></path><circle cx="5.25" cy="2.25" r=".75" fill="currentColor"></circle></svg>',
  Podcasts: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect x="5.75" y="1.75" width="6.5" height="9.5" rx="3.25" ry="3.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><path d="M15.25,8c0,3.452-2.798,6.25-6.25,6.25h0c-3.452,0-6.25-2.798-6.25-6.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><line x1="9" y1="14.25" x2="9" y2="16.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line></svg>',
  Sounds: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect x="2" y="5" width="2" height="8" rx="1" fill="currentColor"/><rect x="6" y="3" width="2" height="12" rx="1" fill="currentColor"/><rect x="10" y="7" width="2" height="6" rx="1" fill="currentColor"/><rect x="14" y="9" width="2" height="2" rx="1" fill="currentColor"/></svg>'
};

const defaultMusicFolders = ['Ambience', 'Music', 'Podcasts', 'Sounds'];

/**
 * Lightweight Markdown Parser
 */
function parseMarkdown(text) {
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

  // Helper function to encode path segments properly
  function encodePathSegments(path) {
    // Split by /, encode each segment, then rejoin
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }

  // Helper function to process markdown content (used for blockquotes and regular content)
  function processMarkdownContent(content) {
    let processed = content;
    
    // Headers
    processed = processed.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
    processed = processed.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
    processed = processed.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
    
    // Images - fix Bear export paths (relative paths need posts/ prefix)
    // Process BEFORE text formatting to prevent mangling of URLs with underscores
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (src && !src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        try {
          // Decode the URL-encoded path from Bear export
          const decodedPath = decodeURIComponent(src);
          // Encode each path segment separately to handle special characters like commas
          const encodedPath = encodePathSegments(decodedPath);
          // Use absolute path from root to avoid any base path issues
          src = `/posts/${encodedPath}`;
        } catch (e) {
          // If decoding fails, try encoding the original path segment by segment
          try {
            const encodedPath = encodePathSegments(src);
            src = `/posts/${encodedPath}`;
          } catch (e2) {
            // Last resort: use original path with absolute path
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

  // Process blockquotes FIRST (before other markdown) so we can process markdown inside them
  // Group consecutive blockquote lines together
  const blockquoteLines = html.split('\n');
  const blockquoteProcessedLines = [];
  let blockquoteContent = [];
  let inBlockquote = false;
  
  function flushBlockquote() {
    if (blockquoteContent.length > 0) {
      const content = blockquoteContent.join('\n');
      const processed = processMarkdownContent(content);
      // Process lists inside blockquote
      const listProcessed = processListsInContent(processed);
      // Process paragraphs inside blockquote
      const paragraphProcessed = processParagraphsInContent(listProcessed);
      blockquoteProcessedLines.push(`<blockquote>${paragraphProcessed}</blockquote>`);
      blockquoteContent = [];
    }
    inBlockquote = false;
  }
  
  function processParagraphsInContent(content) {
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

  // Images - fix Bear export paths (relative paths need posts/ prefix)
  // Process BEFORE text formatting to prevent mangling of URLs with underscores
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    // If the path is relative (doesn't start with /, http://, or https://), prepend posts/
    // Bear exports create paths like "Note Name/Image.png" which need to be "posts/Note Name/Image.png"
    if (src && !src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      // Decode URL-encoded paths (Bear exports use %20 for spaces, etc.)
      try {
        const decodedPath = decodeURIComponent(src);
        // Encode each path segment separately to handle special characters like commas
        const encodedPath = encodePathSegments(decodedPath);
        // Use absolute path from root to avoid any base path issues
        src = `/posts/${encodedPath}`;
      } catch (e) {
        // If decoding fails, try encoding the original path segment by segment
        try {
          const encodedPath = encodePathSegments(src);
          src = `/posts/${encodedPath}`;
        } catch (e2) {
          // Last resort: use original path with absolute path
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
  // Only match italic if not inside quotes (HTML attributes are in quotes)
  // This prevents matching underscores in img src="..." or other attributes
  html = html.replace(/_(.+?)_/g, (match, content, offset, fullString) => {
    // Check if we're inside quotes (HTML attribute)
    const before = fullString.substring(0, offset);
    const after = fullString.substring(offset + match.length);
    // Count unescaped quotes before and after
    const quotesBefore = (before.match(/[^\\]"/g) || []).length;
    const quotesAfter = (after.match(/[^\\]"/g) || []).length;
    // If odd number of quotes before, we're inside an attribute
    if (quotesBefore % 2 !== 0) {
      return match; // Return unchanged if inside HTML attribute
    }
    return `<em>${content}</em>`;
  });

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Process lists - need to handle before paragraph wrapping
  // Split into lines to process lists properly
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

    // Skip empty lines but don't break lists
    if (!trimmedLine) {
      // Empty line - flush list if we're in one, but don't add the empty line yet
      if (inUnorderedList || inOrderedList) {
        flushList();
      }
      processedLines.push('');
      continue;
    }

    // Check for checkbox items first (before regular list items)
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
      // Not a list item - flush any current list
      if (inUnorderedList || inOrderedList) {
        flushList();
      }
      processedLines.push(line);
    }
  }
  // Flush any remaining list
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
    // Wrap in paragraph if not already a block element
    if (!block.startsWith('<')) {
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }
    return block;
  }).join('\n');

  // Restore preserved iframes
  html = html.replace(/\u0000\u0001IFRAMEBLOCK(\d+)\u0001\u0000/g, (_match, index) => {
    console.log('Restoring iframe at index:', index);
    const iframe = preservedElements[parseInt(index) - 1]; // -1 because we used length (1-based) not index (0-based)
    console.log('Restored iframe:', iframe ? iframe.substring(0, 100) : 'NOT FOUND');
    return iframe;
  });

  console.log('Final HTML contains iframe tag:', html.includes('<iframe'));

  return html;
}

/**
 * Parse Bear-style front matter and tags
 * Bear exports with tags as #tag in the content
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string|null} createdDate - Optional creation date from manifest (original Bear date)
 */
function parsePost(content, filename, createdDate = null) {
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

/**
 * Parse Thought Train markdown with custom frontmatter
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string|null} createdDate - Optional creation date from manifest
 */
function parseThoughtTrain(content, filename, createdDate = null) {
  let frontmatter = {};
  let body = content;

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];

    // Parse YAML fields
    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (!key || !value) return;

      // Handle arrays (route field)
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          // Parse array, handling both single and double quotes
          const arrayContent = value.slice(1, -1);
          frontmatter[key] = arrayContent
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(item => item.length > 0);
        } catch (e) {
          frontmatter[key] = [];
        }
      } else {
        // Remove quotes from string values
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    });

    body = content.replace(frontmatterMatch[0], '').trim();
  }

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

/**
 * Parse lab markdown file with frontmatter
 */
function parseLab(content, filename, createdDate = null) {
  let frontmatter = {};
  let body = content;

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];

    // Parse YAML fields
    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (!key || !value) return;

      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          const arrayContent = value.slice(1, -1);
          frontmatter[key] = arrayContent
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(item => item.length > 0);
        } catch (e) {
          frontmatter[key] = [];
        }
      } else {
        // Remove quotes from string values
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    });

    body = content.replace(frontmatterMatch[0], '').trim();
  }

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

// Tags to hide from the sidebar (internal/system tags)
const hiddenTags = ['status'];

/**
 * Build tag navigation from posts with nested tag support
 */
function buildTagNav() {
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

  // Keep "All Notes", add Garden Readme, then add tags
  elements.tagList.innerHTML = `
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

/**
 * Render post list
 */
function renderPosts(tag = 'all') {
  // Include all posts (including Garden Readme)
  const filtered = tag === 'all'
    ? state.posts
    : state.posts.filter(post =>
        post.tags.some(t => t === tag || t.startsWith(tag + '/'))
      );

  // Update count in sidebar for "All Notes"
  if (tag === 'all') {
    const allNotesCount = document.getElementById('allNotesCount');
    if (allNotesCount) {
      allNotesCount.textContent = filtered.length;
    }
  }

  // Update tag buttons
  document.querySelectorAll('.tag-item').forEach(btn => {
    const isActive = btn.dataset.tag === tag;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  // Clear Garden Readme active state when a tag is selected
  const gardenReadmeBtn = document.querySelector('.garden-readme-item');
  if (gardenReadmeBtn) {
    gardenReadmeBtn.classList.remove('active');
    gardenReadmeBtn.removeAttribute('aria-current');
  }

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
      <time class="post-item-date" datetime="${post.date}">${formatDate(post.date)}</time>
    </li>
  `).join('');
}

/**
 * Render note view
 */
function renderNote(post, updateUrl = true) {
  if (!post) {
    elements.noteEmpty.classList.remove('hidden');
    elements.noteContent.classList.add('hidden');
    if (updateUrl) {
      updateNoteUrl(null);
    }
    return;
  }

  elements.noteEmpty.classList.add('hidden');
  elements.noteContent.classList.remove('hidden');

  elements.noteTitle.textContent = post.title;
  elements.noteDate.textContent = formatDate(post.date);
  elements.noteDate.setAttribute('datetime', post.date);

  // Filter out status/complete and other status/* tags from display
  const visibleTags = post.tags.filter(tag => {
    const rootTag = tag.split('/')[0];
    return !hiddenTags.includes(rootTag);
  });
  
  elements.noteTags.innerHTML = visibleTags
    .map(tag => `<span class="note-tag">#${tag}</span>`)
    .join('');

  const parsedContent = parseMarkdown(post.body);
  console.log('[NOTE] Post body length:', post.body.length);
  console.log('[NOTE] Post body contains <iframe:', post.body.includes('<iframe'));
  console.log('[NOTE] Parsed content length:', parsedContent.length);
  console.log('[NOTE] Parsed content contains <iframe:', parsedContent.includes('<iframe'));
  console.log('[NOTE] First 500 chars of parsed:', parsedContent.substring(0, 500));
  elements.noteBody.innerHTML = parsedContent;

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
    
    // Track if touch was used to prevent double-firing
    let touchUsed = false;
    
    // Handle touch events for better mobile responsiveness
    backBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchUsed = true;
      closeNote();
      // Reset flag after a short delay
      setTimeout(() => { touchUsed = false; }, 300);
    });
    
    // Handle click for desktop and as fallback
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Skip if touch already handled this
      if (touchUsed) return;
      closeNote();
    });
    
    elements.noteView.insertBefore(backBtn, elements.noteView.firstChild);
  }

  // Show note view on mobile
  elements.noteView.classList.add('active');

  // Update post list active state
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.toggle('active', item.dataset.filename === post.filename);
  });

  // Update Garden Readme button active state
  const gardenReadmeBtn = document.querySelector('.garden-readme-item');
  if (gardenReadmeBtn) {
    const isGardenReadme = post.filename === 'Garden Readme.md';
    gardenReadmeBtn.classList.toggle('active', isGardenReadme);
    gardenReadmeBtn.setAttribute('aria-current', isGardenReadme ? 'true' : 'false');
    
    // Also update tag buttons to remove active state when Garden Readme is open
    if (isGardenReadme) {
      document.querySelectorAll('.tag-item:not(.garden-readme-item)').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      });
    }
  }

  // Scroll to top of note
  elements.noteView.scrollTop = 0;

  // Update URL to reflect current note
  if (updateUrl) {
    updateNoteUrl(post);
  }
}

/**
 * Close note view (mobile)
 */
function closeNote() {
  if (elements.noteView) {
    elements.noteView.classList.remove('active');
  }
  state.currentPost = null;
  document.querySelectorAll('.post-item').forEach(item => {
    item.classList.remove('active');
  });
  // Update URL to clear note hash
  updateNoteUrl(null);
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
 * Convert filename to URL-safe slug
 */
function filenameToSlug(filename) {
  if (!filename) return '';
  // Remove .md extension
  let slug = filename.replace(/\.md$/i, '');
  // Replace spaces and special chars with hyphens
  slug = slug.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  return slug;
}

/**
 * Find post by slug
 */
function findPostBySlug(slug) {
  return state.posts.find(post => filenameToSlug(post.filename) === slug);
}

/**
 * Get current note from URL hash
 * Expected format: #note/slug or #note/slug?tag=tagname
 */
function getNoteFromUrl() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#note/')) return null;

  // Extract slug (everything after #note/ until ? or end)
  const match = hash.match(/#note\/([^?]+)/);
  if (!match) return null;

  const slug = match[1];
  return findPostBySlug(slug);
}

/**
 * Update URL to reflect current note
 */
function updateNoteUrl(post) {
  if (!post) {
    // Clear the note hash but keep the view
    const hash = window.location.hash;
    if (hash.startsWith('#note/')) {
      window.history.pushState(null, '', '#notes');
    }
    return;
  }

  const slug = filenameToSlug(post.filename);
  const newHash = `#note/${slug}`;

  // Only update if different from current hash
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash);
  }
}

/**
 * Toggle mobile sidebar
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.toggle('open');
  elements.mobileMenuToggle.setAttribute('aria-expanded', isOpen);

  // Handle overlay
  const notesView = document.querySelector('.notes-view');
  const overlayParent = notesView || document.body;
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', toggleSidebar);
    overlayParent.appendChild(overlay);
  } else if (overlay.parentElement !== overlayParent) {
    // Ensure overlay lives in the notes view stacking context
    overlayParent.appendChild(overlay);
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
      e.preventDefault();
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

    // Handle Garden Readme button click
    const gardenReadmeBtn = e.target.closest('.garden-readme-item');
    if (gardenReadmeBtn) {
      e.preventDefault();
      const filename = gardenReadmeBtn.dataset.filename;
      const post = state.posts.find(p => p.filename === filename);
      if (post) {
        state.currentPost = post;
        renderNote(post);
        
        // Update active states
        document.querySelectorAll('.tag-item').forEach(btn => {
          btn.classList.remove('active');
          btn.removeAttribute('aria-current');
        });
        gardenReadmeBtn.classList.add('active');
        gardenReadmeBtn.setAttribute('aria-current', 'true');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
          }
        }
      }
      return;
    }

    const tagBtn = e.target.closest('.tag-item');
    if (tagBtn) {
      e.preventDefault();
      state.currentTag = tagBtn.dataset.tag;
      renderPosts(state.currentTag);

      // Update active states
      document.querySelectorAll('.tag-item').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      });
      tagBtn.classList.add('active');
      tagBtn.setAttribute('aria-current', 'true');

      // Close note view if open on mobile
      if (window.innerWidth <= 1024 && elements.noteView && elements.noteView.classList.contains('active')) {
        closeNote();
      }

      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          toggleSidebar();
        }
      }
    }
  });

  // Post selection
  elements.postsList.addEventListener('click', (e) => {
    const postItem = e.target.closest('.post-item');
    if (postItem) {
      e.preventDefault();
      const post = state.posts.find(p => p.filename === postItem.dataset.filename);
      if (post) {
        state.currentPost = post;
        renderNote(post);

        // On mobile, close sidebar after selecting a post
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
          }
        }
      }
    }
  });

  // Tag clicks in note content
  elements.noteView.addEventListener('click', (e) => {
    const noteTag = e.target.closest('.note-tag');
    if (noteTag) {
      e.preventDefault();
      // Extract tag from text content (remove the # prefix)
      const tagText = noteTag.textContent.trim().replace(/^#/, '');

      // Find matching tag button in sidebar
      const tagBtn = document.querySelector(`.tag-item[data-tag="${tagText}"]`);
      if (tagBtn) {
        // Update state and filter posts
        state.currentTag = tagText;
        renderPosts(tagText);

        // Update active states
        document.querySelectorAll('.tag-item').forEach(btn => {
          btn.classList.remove('active');
          btn.removeAttribute('aria-current');
        });
        tagBtn.classList.add('active');
        tagBtn.setAttribute('aria-current', 'true');

        // Close note view if open on mobile
        if (window.innerWidth <= 1024 && elements.noteView && elements.noteView.classList.contains('active')) {
          closeNote();
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
          }
        }
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

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const noteFromUrl = getNoteFromUrl();
    if (noteFromUrl) {
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, false); // Don't update URL since we're responding to URL change
      // Switch to notes view if not already there
      if (state.currentView !== 'notes') {
        performViewSwitch('notes');
      }
    } else {
      // No note in URL, close note view on mobile/tablet
      // This handles the case where user presses browser back button
      if (elements.noteView && elements.noteView.classList.contains('active')) {
        elements.noteView.classList.remove('active');
      }
      state.currentPost = null;
      document.querySelectorAll('.post-item').forEach(item => {
        item.classList.remove('active');
      });
      // Show empty state
      if (elements.noteEmpty) {
        elements.noteEmpty.classList.remove('hidden');
      }
      if (elements.noteContent) {
        elements.noteContent.classList.add('hidden');
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
    for (const entry of postFiles) {
      // Support both string (legacy) and object { file, created } formats
      const file = typeof entry === 'string' ? entry : entry.file;
      const createdDate = typeof entry === 'object' ? entry.created : null;

      try {
        const response = await fetch(`posts/${encodeURIComponent(file)}`);
        if (response.ok) {
          const content = await response.text();
          const post = parsePost(content, file, createdDate);
          state.posts.push(post);
        }
      } catch (err) {
        console.warn(`Failed to load ${file}:`, err);
      }
    }

    // Build UI
    buildTagNav();
    renderPosts();

    // Always start on homepage - clear any stray hashes
    if (window.location.hash && window.location.hash !== '#home') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    // If there's a note in the URL, prepare it for when user opens notes view
    // but don't automatically open the notes window
    const noteFromUrl = getNoteFromUrl();
    if (noteFromUrl) {
      state.currentPost = noteFromUrl;
      // Don't render or open anything - just prepare the state
    } else {
      // On desktop, preload Garden Readme for notes view but stay on home
      if (window.innerWidth > 1024 && state.posts.length > 0) {
        const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
        const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
        const postToOpen = defaultPost || sorted[0];
        state.currentPost = postToOpen;
        // Don't render the note here - let it be opened when user clicks notes
      }
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
 * Load thought trains from thought-trains.js manifest
 */
async function loadThoughtTrains() {
  try {
    const { default: manifest } = await import('./thought-trains.js');

    const trains = await Promise.all(
      manifest.map(async ({ file, created }) => {
        try {
          const response = await fetch(`thought-train/${encodeURIComponent(file)}`);
          if (response.ok) {
            const content = await response.text();
            return parseThoughtTrain(content, file, created);
          }
        } catch (err) {
          console.warn(`Failed to load thought train ${file}:`, err);
        }
        return null;
      })
    );

    state.thoughtTrains = trains
      .filter(t => t !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    state.filteredTrains = state.thoughtTrains;

    buildTrainTagMap();
  } catch (err) {
    console.error('Failed to load thought trains:', err);
    state.thoughtTrains = [];
  }
}

/**
 * Build tag map for thought trains
 */
function buildTrainTagMap() {
  state.trainTags.clear();

  state.thoughtTrains.forEach(train => {
    train.tags.forEach(tag => {
      state.trainTags.set(tag, (state.trainTags.get(tag) || 0) + 1);
    });
  });
}

/**
 * Load labs from labs/ folder
 */
async function loadLabs() {
  try {
    const { default: manifest } = await import('./labs.js');

    const labs = await Promise.all(
      manifest.map(async ({ file, created }) => {
        try {
          const response = await fetch(`labs/${encodeURIComponent(file)}`);
          if (response.ok) {
            const content = await response.text();
            return parseLab(content, file, created);
          }
        } catch (err) {
          console.warn(`Failed to load lab ${file}:`, err);
        }
        return null;
      })
    );

    state.labs = labs
      .filter(l => l !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderLabsGrid();
  } catch (err) {
    // labs.js doesn't exist yet or no labs - this is fine
    state.labs = [];
  }
}

/**
 * Render labs grid
 */
function renderLabsGrid() {
  const container = document.getElementById('labsGrid');
  if (!container) return;

  if (state.labs.length === 0) {
    container.innerHTML = '<div class="labs-empty">No labs yet</div>';
    return;
  }

  container.innerHTML = state.labs.map(lab => `
    <div class="labs-card" data-lab="${lab.filename}" ${lab.url ? `data-url="${lab.url}"` : ''} ${lab.view ? `data-view="${lab.view}"` : ''}>
      <div class="labs-card-thumbnail">
        ${lab.thumbnail
          ? `<img src="${lab.thumbnail}" alt="${lab.title}" loading="lazy">`
          : `<div class="labs-card-placeholder">${lab.title.charAt(0).toUpperCase()}</div>`
        }
      </div>
      <div class="labs-card-content">
        <h3 class="labs-card-title">${lab.title}</h3>
        <p class="labs-card-description">${lab.description}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Setup labs interactions
 */
function setupLabsInteractions() {
  const grid = document.getElementById('labsGrid');
  grid?.addEventListener('click', (e) => {
    const card = e.target.closest('.labs-card');
    if (!card) return;

    const url = card.dataset.url;
    const view = card.dataset.view;
    if (view) {
      switchView(view);
    } else if (url) {
      window.open(url, '_blank', 'noopener');
    } else {
      openLabsModal(card.dataset.lab);
    }
  });

  // Modal close handlers
  const modal = document.getElementById('labsModal');
  const closeBtn = modal?.querySelector('.labs-modal-close');
  const overlay = modal?.querySelector('.labs-modal-overlay');

  closeBtn?.addEventListener('click', closeLabsModal);
  overlay?.addEventListener('click', closeLabsModal);

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.getAttribute('aria-hidden') === 'false') {
      closeLabsModal();
    }
  });
}

/**
 * Open labs modal
 */
function openLabsModal(filename) {
  const lab = state.labs.find(l => l.filename === filename);
  if (!lab) return;

  document.getElementById('labsModalTitle').textContent = lab.title;
  document.getElementById('labsModalBody').innerHTML = parseMarkdown(lab.body);

  const modal = document.getElementById('labsModal');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * Close labs modal
 */
function closeLabsModal() {
  document.getElementById('labsModal').setAttribute('aria-hidden', 'true');
}

/**
 * Render thought train cards in 3D stack
 */
function renderThoughtTrainCards() {
  const container = document.getElementById('trainStack3D');
  if (!container) return;

  container.innerHTML = '';

  const trains = state.currentTrainTag === 'all'
    ? state.thoughtTrains
    : state.filteredTrains;

  if (trains.length === 0) {
    container.innerHTML = `
      <div class="train-empty-state">
        <p>No thought trains yet. Add markdown files to /thought-train/ folder.</p>
      </div>
    `;
    return;
  }

  trains.forEach((train, index) => {
    const card = createTrainCard(train, index);
    container.appendChild(card);
  });

  updateTrainCardPositions();
  updateNavIndicator();
}

/**
 * Create a single train card element
 */
function createTrainCard(train, index) {
  const card = document.createElement('article');
  card.className = 'train-card';
  card.dataset.index = index;

  const routeCount = Array.isArray(train.route) ? train.route.length : 0;
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  card.innerHTML = `
    <div class="train-card-stub">
      <div class="train-stub-date">${formatDate(train.date)}</div>
      <div class="train-stub-number">#${String(index + 1).padStart(3, '0')}</div>
    </div>

    <div class="train-card-compact">
      <h4 class="train-card-title">${escapeHtml(train.title)}</h4>
      <div class="train-card-journey">
        <span class="train-start">${escapeHtml(train.startPoint)}</span>
        <span class="train-arrow">→</span>
        <span class="train-end">${escapeHtml(train.endPoint)}</span>
      </div>
      <p class="train-stop-count">${routeCount} stop${routeCount !== 1 ? 's' : ''}</p>
    </div>

    <div class="train-card-expanded">
      <h4 class="train-card-title">${escapeHtml(train.title)}</h4>
      ${train.route.length ? `
        <div class="train-route">
          <strong>Route:</strong>
          <ol>${train.route.map(stop => `<li>${escapeHtml(stop)}</li>`).join('')}</ol>
        </div>
      ` : ''}
      ${train.takeaways ? `
        <div class="train-takeaway">
          <strong>Takeaway:</strong> ${escapeHtml(train.takeaways)}
        </div>
      ` : ''}
      ${train.quote ? `
        <blockquote class="train-quote">${escapeHtml(train.quote)}</blockquote>
      ` : ''}
      ${train.whyCared ? `
        <div class="train-why">
          <strong>Why I cared:</strong> ${escapeHtml(train.whyCared)}
        </div>
      ` : ''}
      ${train.nextRabbitHole ? `
        <div class="train-next">
          <strong>Next rabbit hole:</strong> ${escapeHtml(train.nextRabbitHole)}
        </div>
      ` : ''}
      ${train.tags.length ? `
        <div class="train-tags">
          ${train.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Add click handler to expand card
  card.addEventListener('click', () => {
    if (card.dataset.position === 'center') {
      expandTrainDetail(train, index);
    }
  });

  return card;
}

/**
 * Update card positions for 3D stack effect
 */
function updateTrainCardPositions() {
  const cards = document.querySelectorAll('.train-card');
  const currentIndex = state.currentTrainIndex;

  cards.forEach((card, index) => {
    const offset = index - currentIndex;

    if (offset === 0) {
      card.dataset.position = 'center';
    } else if (offset === 1) {
      card.dataset.position = 'next-1';
    } else if (offset === 2) {
      card.dataset.position = 'next-2';
    } else if (offset === 3) {
      card.dataset.position = 'next-3';
    } else if (offset === -1) {
      card.dataset.position = 'prev-1';
    } else if (offset === -2) {
      card.dataset.position = 'prev-2';
    } else if (offset === -3) {
      card.dataset.position = 'prev-3';
    } else {
      card.dataset.position = 'hidden';
    }
  });
}

/**
 * Navigate to next train
 */
function navigateToNextTrain() {
  if (state.isTrainExpanded) return; // Don't navigate in detail view

  const trains = state.currentTrainTag === 'all'
    ? state.thoughtTrains
    : state.filteredTrains;
  const maxIndex = trains.length - 1;

  if (state.currentTrainIndex < maxIndex) {
    state.currentTrainIndex++;
    updateTrainCardPositions();
    updateNavIndicator();
  }
}

/**
 * Navigate to previous train
 */
function navigateToPrevTrain() {
  if (state.isTrainExpanded) return; // Don't navigate in detail view

  if (state.currentTrainIndex > 0) {
    state.currentTrainIndex--;
    updateTrainCardPositions();
    updateNavIndicator();
  }
}

/**
 * Update navigation indicator
 */
function updateNavIndicator() {
  const indicator = document.querySelector('.train-nav-indicator');
  const trains = state.currentTrainTag === 'all'
    ? state.thoughtTrains
    : state.filteredTrains;
  const total = trains.length;

  if (indicator && total > 0) {
    indicator.textContent = `${state.currentTrainIndex + 1} / ${total}`;
  }
}

/**
 * Expand train card to full detail view
 */
function expandTrainDetail(train, index) {
  state.isTrainExpanded = true;

  const container = document.getElementById('trainStackContainer');
  if (!container) return;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const routeCount = Array.isArray(train.route) ? train.route.length : 0;

  container.innerHTML = `
    <div class="train-detail-view">
      <div class="train-detail-header">
        <button class="train-detail-back" id="trainDetailBack">
          <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
          Back
        </button>
        <div class="train-detail-meta">
          <span class="train-stub-date">${formatDate(train.date)}</span>
          <span class="train-stub-number">#${String(index + 1).padStart(3, '0')}</span>
        </div>
      </div>

      <div class="train-detail-content">
        <h2 class="train-detail-title">${escapeHtml(train.title)}</h2>

        <div class="train-detail-journey">
          <span class="train-start">${escapeHtml(train.startPoint)}</span>
          <span class="train-arrow">→</span>
          <span class="train-end">${escapeHtml(train.endPoint)}</span>
          <span class="train-stop-count">${routeCount} stop${routeCount !== 1 ? 's' : ''}</span>
        </div>

        ${train.route.length ? `
          <div class="train-route">
            <strong>Route:</strong>
            <ol>${train.route.map(stop => `<li>${escapeHtml(stop)}</li>`).join('')}</ol>
          </div>
        ` : ''}

        ${train.takeaways ? `
          <div class="train-takeaway">
            <strong>Takeaway:</strong> ${escapeHtml(train.takeaways)}
          </div>
        ` : ''}

        ${train.quote ? `
          <blockquote class="train-quote">${escapeHtml(train.quote)}</blockquote>
        ` : ''}

        ${train.whyCared ? `
          <div class="train-why">
            <strong>Why I cared:</strong> ${escapeHtml(train.whyCared)}
          </div>
        ` : ''}

        ${train.nextRabbitHole ? `
          <div class="train-next">
            <strong>Next rabbit hole:</strong> ${escapeHtml(train.nextRabbitHole)}
          </div>
        ` : ''}

        ${train.tags.length ? `
          <div class="train-tags">
            ${train.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Add back button handler using event delegation
  // Remove any existing listeners first
  container.removeEventListener('click', handleDetailViewClick);
  container.addEventListener('click', handleDetailViewClick);

  // Hide navigation controls
  const navControls = document.querySelector('.train-nav-controls');
  if (navControls) {
    navControls.style.display = 'none';
  }
}

/**
 * Handle clicks within the detail view
 */
function handleDetailViewClick(e) {
  // Check if clicked element or its parent is the back button
  const backButton = e.target.closest('.train-detail-back');
  if (backButton) {
    e.preventDefault();
    e.stopPropagation();
    collapseTrainDetail();
  }
}

/**
 * Collapse detail view back to card stack
 */
function collapseTrainDetail() {
  state.isTrainExpanded = false;
  renderThoughtTrainCards();

  // Show navigation controls again
  const navControls = document.querySelector('.train-nav-controls');
  if (navControls) {
    navControls.style.display = 'flex';
  }
}

/**
 * Setup thought train interactions
 */
function setupThoughtTrainInteractions() {
  // Navigation buttons
  const prevBtn = document.querySelector('.train-nav-prev');
  const nextBtn = document.querySelector('.train-nav-next');

  if (prevBtn) prevBtn.addEventListener('click', navigateToPrevTrain);
  if (nextBtn) nextBtn.addEventListener('click', navigateToNextTrain);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!state.windows.openWindows.has('thoughtTrain')) return;

    if (e.key === 'Escape' && state.isTrainExpanded) {
      e.preventDefault();
      collapseTrainDetail();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      navigateToNextTrain();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateToPrevTrain();
    }
  });

  // Mouse wheel
  const container = document.getElementById('trainStackContainer');
  if (container) {
    container.addEventListener('wheel', (e) => {
      if (!state.windows.openWindows.has('thoughtTrain')) return;
      // Allow natural scrolling when detail view is expanded
      if (state.isTrainExpanded) return;
      e.preventDefault();
      if (e.deltaY > 0) {
        navigateToNextTrain();
      } else {
        navigateToPrevTrain();
      }
    }, { passive: false });

    // Touch swipe (mobile)
    let touchStartY = 0;
    container.addEventListener('touchstart', (e) => {
      // Don't track swipes in detail view
      if (state.isTrainExpanded) return;
      touchStartY = e.touches[0].clientY;
    });

    container.addEventListener('touchend', (e) => {
      // Don't handle swipes in detail view
      if (state.isTrainExpanded) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;

      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          navigateToNextTrain();
        } else {
          navigateToPrevTrain();
        }
      }
    });
  }
}

/**
 * Switch between views (tasks, notes, music)
 * Uses CSS fade transition for smooth, mobile-friendly effect
 */
function switchView(viewName) {
  // Don't transition if already on this view
  if (state.currentView === viewName) return;

  performViewSwitch(viewName);
}

/**
 * Perform the actual view switch
 */
function performViewSwitch(viewName) {
  // Update view visibility and window tracking
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Clear all open windows and set only the new one
  state.windows.openWindows.clear();
  state.windows.openWindows.add(viewName);

  const targetView = document.getElementById(`${viewName}View`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update nav icon buttons
  document.querySelectorAll('.nav-icon-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // When switching to notes view, check URL first, then default to Garden Readme
  if (viewName === 'notes' && state.posts.length > 0) {
    const noteFromUrl = getNoteFromUrl();
    if (noteFromUrl) {
      // If there's a note in the URL, open that
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, false);
    } else {
      // If no note in URL, always default to Garden Readme first
      const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
      if (defaultPost) {
        state.currentPost = defaultPost;
        renderNote(defaultPost);
      } else if (state.currentPost) {
        // Fall back to current post if Garden Readme doesn't exist
        renderNote(state.currentPost);
      }
    }
  }

  // Initialize life stories when switching to it
  if (viewName === 'lifeStories') {
    initLifeStories();
  }

  // Initialize thought train when switching to it
  if (viewName === 'thoughtTrain') {
    if (state.thoughtTrains.length === 0) {
      loadThoughtTrains().then(() => renderThoughtTrainCards());
    } else {
      renderThoughtTrainCards();
    }
  }

  state.currentView = viewName;
}

/**
 * Setup top menu bar navigation
 */
function setupTopMenuNav() {
  const menuNav = document.getElementById('menuNav');
  if (!menuNav) return;

  menuNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-icon-btn');
    if (btn) {
      const viewName = btn.dataset.view;
      if (viewName) {
        toggleWindow(viewName);
      }
    }
  });
}

/**
 * Setup Follow button to toggle social icons
 */
function setupFollowButton() {
  const followBtn = document.getElementById('followBtn');
  const socialIcons = document.getElementById('socialIcons');
  
  if (!followBtn || !socialIcons) return;
  
  followBtn.addEventListener('click', () => {
    const isShowing = socialIcons.classList.toggle('show');
    followBtn.classList.toggle('active', isShowing);
  });
}

/**
 * Setup Hamburger menu for mobile
 */
function setupHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerMenuBtn');
  const mobileMenu = document.getElementById('mobileHeaderMenu');
  
  if (!hamburgerBtn || !mobileMenu) return;
  
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = mobileMenu.classList.toggle('show');
    hamburgerBtn.classList.toggle('active', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenu.classList.contains('show')) return;
    if (e.target === mobileMenu || mobileMenu.contains(e.target)) return;
    if (e.target === hamburgerBtn || hamburgerBtn.contains(e.target)) return;
    
    mobileMenu.classList.remove('show');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  });

  // Handle app button clicks in mobile menu
  mobileMenu.querySelectorAll('.mobile-menu-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view;
      if (viewName) {
        toggleWindow(viewName);
      }
      
      // Close the menu after selection
      mobileMenu.classList.remove('show');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      
      // Update active state on buttons
      mobileMenu.querySelectorAll('.mobile-menu-app-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewName && state.windows.openWindows.has(viewName));
      });
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
      mobileMenu.classList.remove('show');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Setup Info button and credits popup
 */
function setupInfoPopup() {
  const infoButton = document.getElementById('infoButton');
  const infoIconBtn = document.getElementById('infoIconBtn');
  const infoPopup = document.getElementById('infoPopup');
  if ((!infoButton && !infoIconBtn) || !infoPopup) return;

  const setOpen = (isOpen) => {
    infoPopup.classList.toggle('show', isOpen);
    if (infoButton) infoButton.setAttribute('aria-expanded', String(isOpen));
    if (infoIconBtn) infoIconBtn.setAttribute('aria-expanded', String(isOpen));
  };

  // Add click handlers for both buttons
  if (infoButton) {
    infoButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = !infoPopup.classList.contains('show');
      setOpen(isOpen);
    });
  }

  if (infoIconBtn) {
    infoIconBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = !infoPopup.classList.contains('show');
      setOpen(isOpen);
    });
  }

  // Close when clicking outside
  document.addEventListener('click', (event) => {
    if (!infoPopup.classList.contains('show')) return;
    if (event.target === infoPopup || infoPopup.contains(event.target)) return;
    if (infoButton && (event.target === infoButton || infoButton.contains(event.target))) return;
    if (infoIconBtn && (event.target === infoIconBtn || infoIconBtn.contains(event.target))) return;
    setOpen(false);
  });

  // Close on Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && infoPopup.classList.contains('show')) {
      setOpen(false);
    }
  });
}

/**
 * Parse changelog markdown content
 */
function parseChangelog(content) {
  const lines = content.split('\n');
  const versions = [];
  let currentVersion = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and markdown headers
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Match version headers like "V1.0.3 - description" or "V1.0.3" (supports both hyphen and en-dash)
    const versionMatch = trimmed.match(/^V?(\d+\.\d+\.\d+)(?:\s*[-–]\s*(.+))?$/i);
    if (versionMatch) {
      // Save previous version if exists
      if (currentVersion) {
        versions.push(currentVersion);
      }
      currentVersion = {
        version: versionMatch[1],
        description: versionMatch[2] || '',
        items: []
      };
    }
    // Match list items starting with "-"
    else if (trimmed.startsWith('- ') && currentVersion) {
      const item = trimmed.slice(2).trim();
      if (item) {
        currentVersion.items.push(item);
      }
    }
  }

  // Don't forget the last version
  if (currentVersion) {
    versions.push(currentVersion);
  }

  return versions;
}

/**
 * Render changelog content in modal
 */
function renderChangelog(versions) {
  const body = document.getElementById('changelogModalBody');
  if (!body) return;

  if (versions.length === 0) {
    body.innerHTML = '<p style="color: var(--text-secondary);">No version history available.</p>';
    return;
  }

  body.innerHTML = versions.map(version => {
    const itemsHtml = version.items.length > 0
      ? `<ul class="changelog-version-list">
          ${version.items.map(item => `<li class="changelog-version-item">${item}</li>`).join('')}
        </ul>`
      : '';

    return `
      <div class="changelog-version">
        <div class="changelog-version-header">v${version.version}${version.description ? ` — ${version.description}` : ''}</div>
        ${itemsHtml}
      </div>
    `;
  }).join('');
}

/**
 * Load changelog from markdown file
 */
async function loadChangelog() {
  try {
    const response = await fetch('Digital Garden Changelog.md');
    if (!response.ok) throw new Error('Failed to load changelog');
    
    const content = await response.text();
    const versions = parseChangelog(content);
    renderChangelog(versions);
    
    // Update version number in the UI with the latest version
    if (versions.length > 0) {
      const latestVersion = versions[0].version;
      const versionEl = document.getElementById('appVersion');
      if (versionEl) {
        versionEl.textContent = `v${latestVersion}`;
        versionEl.setAttribute('aria-label', `Version ${latestVersion}`);
      }
    }
    
    return versions;
  } catch (err) {
    console.warn('Could not load changelog:', err);
    const body = document.getElementById('changelogModalBody');
    if (body) {
      body.innerHTML = '<p style="color: var(--text-secondary);">Failed to load version history.</p>';
    }
    return [];
  }
}

/**
 * Show changelog modal
 */
function showChangelogModal() {
  const modal = document.getElementById('changelogModal');
  if (!modal) return;

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus the close button for accessibility
  const closeBtn = modal.querySelector('.changelog-modal-close');
  if (closeBtn) {
    setTimeout(() => closeBtn.focus(), 100);
  }
}

/**
 * Hide changelog modal
 */
function hideChangelogModal() {
  const modal = document.getElementById('changelogModal');
  if (!modal) return;

  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Setup version badge to show changelog modal
 */
function setupVersionChangelog() {
  const versionEl = document.getElementById('appVersion');
  const modal = document.getElementById('changelogModal');
  if (!versionEl || !modal) return;

  // Load changelog on page load to get latest version
  let changelogLoaded = false;
  loadChangelog().then(() => {
    changelogLoaded = true;
  });

  versionEl.addEventListener('click', async () => {
    if (!changelogLoaded) {
      await loadChangelog();
      changelogLoaded = true;
    }
    showChangelogModal();
  });

  // Also support keyboard navigation
  versionEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!changelogLoaded) {
        await loadChangelog();
        changelogLoaded = true;
      }
      showChangelogModal();
    }
  });

  // Close button
  const closeBtn = modal.querySelector('.changelog-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideChangelogModal);
  }

  // Close on overlay click
  const overlay = modal.querySelector('.changelog-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', hideChangelogModal);
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      hideChangelogModal();
    }
  });

  // Prevent modal content clicks from closing
  const content = modal.querySelector('.changelog-modal-content');
  if (content) {
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
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
    let rowNumber = 0; // Row counter, resets per section

    const flushList = () => {
      if (listItems.length > 0 && currentSection) {
        html += `<section class="tasks-section">
          <div class="tasks-section-header">
            <span class="tasks-section-header-number">#</span>
            <h2 class="tasks-section-header-title">${currentSection}</h2>
            <span class="tasks-section-header-status">Status</span>
          </div>
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
        rowNumber = 0; // Reset row number for each section
      }
      // Checkbox list item: - [x] or - [ ]
      else if (trimmed.match(/^- \[(x| )\] /)) {
        rowNumber++;
        const isChecked = trimmed.startsWith('- [x]');
        let text = trimmed.slice(6); // Remove "- [x] " or "- [ ] "
        // Parse markdown links [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        const statusClass = isChecked ? 'completed' : 'pending';
        listItems.push(`
          <li class="task-item${isChecked ? ' completed' : ''}">
            <span class="task-row-number">${rowNumber}</span>
            <span class="task-text">${text}</span>
            <span class="task-status-indicator ${statusClass}"></span>
          </li>
        `);
      }
      // Regular list item: - text (active/in-progress items)
      else if (trimmed.startsWith('- ')) {
        rowNumber++;
        let text = trimmed.slice(2);
        // Parse markdown links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        listItems.push(`
          <li class="task-item">
            <span class="task-row-number">${rowNumber}</span>
            <span class="task-text">${text}</span>
            <span class="task-status-indicator active"></span>
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
  // Always show Eastern Standard Time (EST)
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes().toString().padStart(2, '0');
  const seconds = estTime.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;

  // Update all time elements
  const timeElements = ['menuTime'];
  timeElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = timeString;
  });
}

/**
 * Weather condition to SVG icon mapping
 * WMO Weather interpretation codes: https://open-meteo.com/en/docs
 */
const weatherIcons = {
  clear: '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" class="nc-icon-wrapper"><path d="M3 7H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 11H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 15H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 19H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 23H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 27H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 7H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 11H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 15H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 19H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 23H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 27H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 7H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 11H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 15H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 19H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 23H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 27H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 7H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 11H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 19H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 15H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 23H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 27H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 7H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 11H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M19 15H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M19 19H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M19 23H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 27H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 7H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 11H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 3H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 3H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 3H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 3H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 3H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 3H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 3H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 15H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 19H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 23H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 27H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 27H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 7H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 11H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 15H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 19H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 23H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path></g></svg>',
  partlyCloudy: '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" class="nc-icon-wrapper"><path d="M3 7H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 11H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 15H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 19H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 23H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 27H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 7H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 11H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 15H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 19H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 23H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 27H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 7H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 11H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 15H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 19H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 23H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 27H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 7H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 11H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 19H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 15H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 23H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 27H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 7H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 11H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 15H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 19H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 23H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 27H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 7H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 11H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 3H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 3H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 3H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 3H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 3H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 3H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 3H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 15H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 19H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 23H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 27H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 27H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 7H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 11H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 15H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 19H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 23H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path></g></svg>',
  rain: '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" class="nc-icon-wrapper" stroke-linejoin="miter" stroke-linecap="butt"><path d="M3 3H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 7H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 11H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 15H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 19H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 3H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 7H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 11H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 15H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M7 19H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 3H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 7H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 11H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 15H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 19H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 3H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 11H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 7H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 15H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 19H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 3H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 7H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 11H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 15H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 19H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 3H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 7H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 11H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 15H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M27 19H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 19H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 3H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 7H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 11H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M27 15H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M3 27H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 27H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 27H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 27H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 27H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 27H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 23H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 23H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 23H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 23H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 23H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 23H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 23H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 27H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path></g></svg>',
  thunderstorm: '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" class="nc-icon-wrapper" stroke-linejoin="miter" stroke-linecap="butt"><path d="M3 7H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 11H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 15H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 19H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 23H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 27H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 7H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 11H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 15H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M7 19H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M10.99 19H11" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 23H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 27H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 7H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 11H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 15H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M11 23H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M11 27H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 7H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 11H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 19H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M15 15H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 23H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M15 27H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 7H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-2="on"></path><path d="M19 15H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 19H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M19 23H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 27H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 7H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 11H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M18.99 11H19" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M7 3H7.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M3 3H3.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M11 3H11.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M15 3H15.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M19 3H19.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 3H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 3H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 15H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-1="on"></path><path d="M23 19H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 23H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 27H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M23 27H23.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 7H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 11H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 15H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 19H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path><path d="M27 23H27.01" stroke="currentColor" stroke-width="4" stroke-linecap="square" data-arcade-3="on"></path></g></svg>'
};

/**
 * Get weather icon SVG based on weather code
 */
function getWeatherIcon(code) {
  // WMO Weather interpretation codes
  // https://open-meteo.com/en/docs
  const weatherCodeMap = {
    0: 'clear',        // Clear sky
    1: 'clear',        // Mainly clear
    2: 'partlyCloudy', // Partly cloudy
    3: 'partlyCloudy', // Overcast
    45: 'partlyCloudy', // Fog
    48: 'partlyCloudy', // Depositing rime fog
    51: 'rain',        // Drizzle light
    53: 'rain',        // Drizzle moderate
    55: 'rain',        // Drizzle dense
    56: 'rain',        // Freezing drizzle light
    57: 'rain',        // Freezing drizzle dense
    61: 'rain',        // Rain slight
    63: 'rain',        // Rain moderate
    65: 'rain',        // Rain heavy
    66: 'rain',        // Freezing rain light
    67: 'rain',        // Freezing rain heavy
    71: 'rain',        // Snow fall slight (using rain icon as closest match)
    73: 'rain',        // Snow fall moderate
    75: 'rain',        // Snow fall heavy
    77: 'rain',        // Snow grains
    80: 'rain',        // Rain showers slight
    81: 'rain',        // Rain showers moderate
    82: 'rain',        // Rain showers violent
    85: 'rain',        // Snow showers slight
    86: 'rain',        // Snow showers heavy
    95: 'thunderstorm', // Thunderstorm
    96: 'thunderstorm', // Thunderstorm with slight hail
    99: 'thunderstorm'  // Thunderstorm with heavy hail
  };
  
  const iconKey = weatherCodeMap[code] || 'clear';
  return weatherIcons[iconKey] || weatherIcons.clear;
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
    const temp = data.current.temperature_2m;
    const weatherCode = data.current.weather_code;
    const iconSvg = getWeatherIcon(weatherCode);
    const tempString = `${temp.toFixed(1)}°F`;

    // Update all weather elements
    const iconElements = ['weatherIcon'];
    const tempElements = ['weatherTemp'];

    iconElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = iconSvg;
    });

    tempElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = tempString;
    });
  } catch (err) {
    console.warn('Could not fetch weather:', err);
    ['weatherIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = weatherIcons.clear;
    });
    ['weatherTemp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Atlanta';
    });
  }
}

/**
 * Initialize menu bar
 */
function initMenuBar() {
  // Update time immediately and every second
  updateMenuTime();
  setInterval(updateMenuTime, 1000);

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
  player: null, // YouTube player
  apiReady: false,
  pendingVideoId: null,
  playlistCache: {}, // { playlistId: { tracks, fetchedAt } }
  cacheExpiry: 1000 * 60 * 60 // 1 hour
};


/**
 * Life Stories State
 */
const lifeStoriesState = {
  floors: [], // Will be populated automatically from images folder
  currentFloor: 0,
  canvas: null,
  ctx: null,
  images: {},
  initialized: false,
  scrollPosition: 0, // Continuous scroll position (fractional floor number)
  scrollVelocity: 0, // Scroll velocity for smooth deceleration
  targetScrollPosition: null, // For smooth scrolling to specific floors
  animationFrame: null, // For continuous animation loop
  scrollAccumulator: 0 // Accumulate scroll delta before snapping to floor
};

/**
 * Discover available images in the life-stories folder
 * Tries to load images and builds floors array dynamically
 */
async function discoverLifeStoriesImages() {
  const discoveredFloors = [];
  const maxFloorCheck = 100; // Check up to floor 100
  const checkPromises = [];

  // Add Floor 0 (Lobby) - always present, no image needed
  discoveredFloors.push({
    number: 0,
    image: null, // Will be drawn programmatically
    milestone: false,
    isLobby: true
  });

  // Try to discover images by attempting to load them
  for (let i = 1; i <= maxFloorCheck; i++) {
    const imagePath = `images/life-stories/${i}.png`;
    checkPromises.push(
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Image exists, add it as a floor
          discoveredFloors.push({
            number: i,
            image: imagePath,
            milestone: false // Can be customized later if needed
          });
          // Pre-load the image
          lifeStoriesState.images[imagePath] = img;
          resolve();
        };
        img.onerror = () => {
          // Image doesn't exist, skip it
          resolve();
        };
        img.src = imagePath;
      })
    );
  }

  await Promise.all(checkPromises);

  // Sort floors by number
  discoveredFloors.sort((a, b) => a.number - b.number);

  // Mark the highest floor as a milestone
  if (discoveredFloors.length > 1) {
    const highestFloor = discoveredFloors[discoveredFloors.length - 1];
    highestFloor.milestone = true;
  }

  return discoveredFloors;
}

/**
 * Load sounds from sounds.js manifest
 */
async function loadSounds() {
  try {
    console.log('Loading sounds from sounds.js...');
    const soundsModule = await import('./sounds.js');
    const sounds = soundsModule.default || [];
    console.log(`Found ${sounds.length} sounds in manifest`);
    
    // Convert sounds to track format
    const soundTracks = sounds.map(sound => {
      const filename = sound.file;
      // Remove file extension for display name
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      const audioUrl = `sounds/${filename}`;
      
      // Format date for display (e.g., "Jul 1, 2024")
      let formattedDate = 'Unknown date';
      if (sound.created) {
        try {
          const date = new Date(sound.created);
          formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (e) {
          formattedDate = sound.created;
        }
      }
      
      return {
        title: nameWithoutExt,
        artist: formattedDate,
        url: audioUrl,
        audioUrl: audioUrl,
        isLocalAudio: true,
        folder: 'Sounds',
        isChannel: false,
        thumbnail: null,
        created: sound.created
      };
    });
    
    // Sort by most recently added (newest first)
    soundTracks.sort((a, b) => {
      if (!a.created && !b.created) return 0;
      if (!a.created) return 1;
      if (!b.created) return -1;
      return new Date(b.created) - new Date(a.created);
    });
    
    return soundTracks;
  } catch (err) {
    console.warn('Could not load sounds:', err);
    return [];
  }
}

/**
 * Fetch playlist with caching
 */
async function fetchPlaylistWithCache(playlistId) {
  const now = Date.now();
  const cached = musicState.playlistCache[playlistId];

  // Return cached data if fresh
  if (cached && (now - cached.fetchedAt) < musicState.cacheExpiry) {
    console.log(`Using cached playlist data for ${playlistId}`);
    return cached.tracks;
  }

  // Fetch from API
  const response = await fetch(`/api/youtube/playlist?id=${playlistId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status}`);
  }

  const data = await response.json();

  // Transform YouTube API response to track format
  const tracks = (data.items || []).map(item => ({
    title: item.snippet.title,
    artist: item.snippet.videoOwnerChannelTitle || 'Unknown Artist',
    videoId: item.contentDetails.videoId,
    url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
    thumbnail: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.contentDetails.videoId}/mqdefault.jpg`,
    needsMetadata: false,
    isChannel: false
  }));

  // Cache the result
  musicState.playlistCache[playlistId] = {
    tracks,
    fetchedAt: now
  };

  return tracks;
}

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
    const parsed = await parseMusicMd(content);

    // Separate playlists from regular tracks
    const playlistRefs = parsed.tracks.filter(t => t.type === 'playlist');
    const regularTracks = parsed.tracks.filter(t => t.type !== 'playlist');

    // Fetch and expand playlists
    const playlistTracks = [];
    for (const ref of playlistRefs) {
      try {
        const tracks = await fetchPlaylistWithCache(ref.playlistId);
        // Add folder info to each track
        const tracksWithFolder = tracks.map(track => ({
          ...track,
          folder: ref.folder,
          isChannel: false,
          needsMetadata: false
        }));
        playlistTracks.push(...tracksWithFolder);
        console.log(`Loaded ${tracks.length} tracks from playlist ${ref.playlistId}`);
      } catch (err) {
        console.log(`Skipping playlist ${ref.playlistId} (API unavailable)`);
        // Gracefully skip playlists when API is not configured
      }
    }

    // Load sounds
    const soundTracks = await loadSounds();
    console.log(`Loaded ${soundTracks.length} sound tracks`);

    // Combine all tracks (music + playlists + sounds)
    musicState.allTracks = [...regularTracks, ...playlistTracks, ...soundTracks];
    console.log(`Total tracks: ${musicState.allTracks.length} (${regularTracks.length} regular + ${playlistTracks.length} playlist + ${soundTracks.length} sounds)`);

    // Merge folders from music.md with default folders (includes Sounds)
    musicState.folders = mergeFolders(parsed.folders);

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

    // Fetch metadata for tracks that need it
    const tracksNeedingMetadata = musicState.allTracks.filter(t => t.needsMetadata && t.videoId);
    await Promise.all(tracksNeedingMetadata.map(async (track) => {
      const meta = await fetchYouTubeMetadata(track.url);
      if (meta) {
        const parsed = extractMetadataFromTitle(meta.title);
        track.title = parsed.title;
        track.artist = parsed.artist || meta.author || 'Unknown';
        track.needsMetadata = false;
      }
    }));

    applyFolderFilter();
    renderMusicFolders();
    renderPlaylist();
    loadYouTubeIframeAPI();

  } catch (err) {
    console.warn('Could not load music:', err);
    musicState.allTracks = [];
    musicState.tracks = [];
    renderMusicFolders();
    playlist.innerHTML = `
      <div class="playlist-empty">
        <p>Add links to <code>music.md</code></p>
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

    // Match markdown link format: [Title](url)
    const linkMatch = trimmed.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, text, url] = linkMatch;
      const playlistId = extractYouTubePlaylistId(url);
      const videoId = extractYouTubeId(url);
      const channelHandle = extractYouTubeChannel(url);

      if (playlistId) {
        // YouTube playlist
        tracks.push({
          type: 'playlist',
          playlistId,
          folder: currentFolder,
          url
        });
      } else if (videoId) {
        // YouTube video with title
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
          needsMetadata: false,
          folder: currentFolder,
          isChannel: false
        });
      } else if (channelHandle) {
        // YouTube channel
        tracks.push({
          title: text.trim(),
          artist: 'Channel',
          channelHandle,
          url,
          thumbnail: null,
          needsMetadata: false,
          folder: currentFolder,
          isChannel: true
        });
      }
      continue;
    }

    // Match plain URL format: - https://...
    const urlMatch = trimmed.match(/^-\s*(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      const playlistId = extractYouTubePlaylistId(url);
      const videoId = extractYouTubeId(url);
      const channelHandle = extractYouTubeChannel(url);

      if (playlistId) {
        // YouTube playlist
        tracks.push({
          type: 'playlist',
          playlistId,
          folder: currentFolder,
          url
        });
      } else if (videoId) {
        // YouTube video without title - needs metadata fetch
        tracks.push({
          title: 'Loading...',
          artist: 'Unknown',
          videoId,
          url,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          needsMetadata: true,
          folder: currentFolder,
          isChannel: false
        });
      } else if (channelHandle) {
        // YouTube channel
        tracks.push({
          title: channelHandle,
          artist: 'Channel',
          channelHandle,
          url,
          thumbnail: null,
          needsMetadata: false,
          folder: currentFolder,
          isChannel: true
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
 * Extract YouTube channel handle from URL
 */
function extractYouTubeChannel(url) {
  const match = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extract YouTube playlist ID from URL
 */
function extractYouTubePlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch YouTube metadata using oEmbed API
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

function applyFolderFilter() {
  musicState.tracks = musicState.allTracks.filter(track => track.folder === musicState.activeFolder);
}

function switchFolder(folder) {
  if (!folder || musicState.activeFolder === folder) return;

  musicState.activeFolder = folder;
  applyFolderFilter();

  renderMusicFolders();
  renderPlaylist();
}

function renderMusicFolders() {
  const folderList = document.getElementById('musicFolders');
  if (!folderList) return;

  const folders = musicState.folders.length ? musicState.folders : defaultMusicFolders;

  folderList.innerHTML = folders.map((folder) => {
    const isActive = folder === musicState.activeFolder;
    const icon = musicFolderIcons[folder] || '';
    const trackCount = musicState.allTracks.filter(t => t.folder === folder).length;
    return `
      <button class="zen-folder-item${isActive ? ' active' : ''}" data-folder="${folder}" role="tab" aria-selected="${isActive}" tabindex="${isActive ? '0' : '-1'}">
        <span class="zen-folder-icon">${icon}</span>
        <span class="zen-folder-name">${folder}</span>
        <span class="zen-folder-count">${trackCount}</span>
      </button>
    `;
  }).join('');

  folderList.querySelectorAll('.zen-folder-item').forEach((btn) => {
    btn.addEventListener('click', () => switchFolder(btn.dataset.folder));
  });
}

/**
 * Render the playlist with playable tracks
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

  playlist.innerHTML = musicState.tracks.map((track, index) => {
    const isActive = index === musicState.currentIndex;

    if (track.isChannel) {
      // Channels open in new tab
      return `
        <a class="playlist-item playlist-channel" href="${track.url}" target="_blank" rel="noopener noreferrer">
          <div class="playlist-info">
            <div class="playlist-title">${track.title}</div>
            <div class="playlist-artist">${track.artist}</div>
          </div>
          <svg class="playlist-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      `;
    }

    // Regular video - clickable to play
    const thumbHtml = track.thumbnail
      ? `<img src="${track.thumbnail}" alt="${track.title}" loading="lazy">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

    return `
      <div class="playlist-item${isActive ? ' active playing' : ''}" data-index="${index}">
        <div class="playlist-thumb">${thumbHtml}</div>
        <div class="playlist-info">
          <div class="playlist-title">${track.title}</div>
          <div class="playlist-artist">${track.artist}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for playable tracks
  playlist.querySelectorAll('.playlist-item:not(.playlist-channel)').forEach(item => {
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
  musicState.isPlaying = true;

  // Update UI
  document.getElementById('playerTitle').textContent = track.title;
  document.getElementById('playerArtist').textContent = track.artist;

  // Update playlist active state
  document.querySelectorAll('.playlist-item').forEach((item, i) => {
    item.classList.toggle('active', i === index);
    item.classList.toggle('playing', i === index);
  });

  if (track.videoId) {
    ensureYouTubePlayer(track.videoId);
  }
}

/**
 * Load YouTube Iframe API
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
    musicState.isPlaying = true;
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
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          musicState.isPlaying = true;
        } else if (event.data === YT.PlayerState.PAUSED) {
          musicState.isPlaying = false;
        } else if (event.data === YT.PlayerState.ENDED) {
          musicState.isPlaying = false;
          playNext();
        }
      }
    }
  });
  musicState.pendingVideoId = null;
}

/**
 * Play next track
 */
function playNext() {
  if (musicState.tracks.length === 0) return;
  const nextIndex = (musicState.currentIndex + 1) % musicState.tracks.length;
  // Skip channels
  if (musicState.tracks[nextIndex].isChannel) {
    const videoTracks = musicState.tracks.filter(t => !t.isChannel);
    if (videoTracks.length > 0) {
      const currentInVideos = videoTracks.findIndex(t => t === musicState.tracks[musicState.currentIndex]);
      const nextVideoIndex = (currentInVideos + 1) % videoTracks.length;
      const nextTrack = videoTracks[nextVideoIndex];
      const actualIndex = musicState.tracks.indexOf(nextTrack);
      playTrack(actualIndex);
    }
  } else {
    playTrack(nextIndex);
  }
}

// YouTube API global callback
window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
  musicState.apiReady = true;
  if (musicState.pendingVideoId) {
    createYouTubePlayer(musicState.pendingVideoId);
  }
};

/**
 * Mini Player Functions - Disabled (no playback functionality)
 */

function showMiniPlayer() {
  const miniPlayer = document.getElementById('miniPlayer');
  if (!miniPlayer) return;

  // Only show if music window is closed
  if (state.windows.openWindows.has('music')) {
    return;
  }

  updateMiniPlayer();
  miniPlayer.setAttribute('aria-hidden', 'false');
}

/**
 * Hide the mini player
 */
function hideMiniPlayer() {
  const miniPlayer = document.getElementById('miniPlayer');
  if (!miniPlayer) return;
  miniPlayer.setAttribute('aria-hidden', 'true');
}

/**
 * Update mini player with current track info
 */
function updateMiniPlayer() {
  const miniPlayer = document.getElementById('miniPlayer');
  if (!miniPlayer) return;

  // Only update if mini player should be visible (music window closed)
  if (state.windows.openWindows.has('music')) {
    return;
  }

  const titleEl = document.getElementById('miniPlayerTitle');
  const artistEl = document.getElementById('miniPlayerArtist');
  const thumbEl = document.getElementById('miniPlayerThumb');
  const playBtn = document.getElementById('miniPlayerPlayBtn');
  const iconPlay = playBtn?.querySelector('.mini-player-icon-play');
  const iconPause = playBtn?.querySelector('.mini-player-icon-pause');

  // Use playingTrack if available (even if currentIndex is -1), otherwise use currentIndex track
  let track = null;
  if (musicState.playingTrack) {
    track = musicState.playingTrack;
  } else if (musicState.currentIndex >= 0 && musicState.currentIndex < musicState.tracks.length) {
    track = musicState.tracks[musicState.currentIndex];
  }

  if (track) {
    if (titleEl) titleEl.textContent = track.title || 'Unknown Track';
    if (artistEl) artistEl.textContent = track.artist || 'Unknown Artist';
    
    if (thumbEl && track.thumbnail) {
      thumbEl.src = track.thumbnail;
      thumbEl.alt = track.title || 'Track thumbnail';
      thumbEl.style.display = 'block';
      const placeholder = miniPlayer.querySelector('.mini-player-placeholder');
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (thumbEl) thumbEl.style.display = 'none';
      const placeholder = miniPlayer.querySelector('.mini-player-placeholder');
      if (placeholder) placeholder.style.display = 'block';
    }
  } else {
    if (titleEl) titleEl.textContent = 'No track';
    if (artistEl) artistEl.textContent = 'Select a track';
    if (thumbEl) thumbEl.style.display = 'none';
    const placeholder = miniPlayer.querySelector('.mini-player-placeholder');
    if (placeholder) placeholder.style.display = 'block';
  }

  // Update play/pause button state
  if (playBtn && iconPlay && iconPause) {
    if (musicState.isPlaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }
}

/**
 * Detect and set background image (supports png, jpg, jpeg, webp)
 */
async function initBackgroundImage() {
  // Use the existing bg.jpg file as the background
  // If you want dark/light mode specific images, add them to the images folder
  // and uncomment the code below
  document.documentElement.style.setProperty('--bg-image', `url('images/bg.jpg')`);

  // Uncomment below to support dark/light mode specific images:
  /*
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const baseName = isDark ? 'dark' : 'light';
  const extensions = ['jpg', 'png', 'jpeg', 'webp'];
  let imageFound = false;

  for (const ext of extensions) {
    const url = `images/${baseName}.${ext}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        document.documentElement.style.setProperty('--bg-image', `url('${url}')`);
        imageFound = true;
        break;
      }
    } catch {
      // Continue to next extension
    }
  }

  // Fallback to bg.jpg if no dark/light image found
  if (!imageFound) {
    document.documentElement.style.setProperty('--bg-image', `url('images/bg.jpg')`);
  }
  */

  // Listen for color scheme changes (only needed if using dark/light images)
  // window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', initBackgroundImage);
}

/**
 * Show system alert after a delay
 */
function showSystemAlert() {
  const alert = document.getElementById('systemAlert');
  if (!alert) return;

  // Show alert after 2 seconds
  setTimeout(() => {
    alert.classList.add('show');
  }, 2000);

  // Setup close button
  const closeBtn = alert.querySelector('.system-alert-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      alert.classList.remove('show');
    });
  }

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && alert.classList.contains('show')) {
      alert.classList.remove('show');
    }
  });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    alert.classList.remove('show');
  }, 12000);
}

/**
 * Setup view mode toggle for notes view
 */
function setupViewModeToggle() {
  const viewModeToggle = document.getElementById('viewModeToggle');
  const notesView = document.getElementById('notesView');
  
  if (!viewModeToggle || !notesView) return;
  
  // Load saved view mode from localStorage or default to three-column
  const savedViewMode = localStorage.getItem('notesViewMode') || 'three-column';
  notesView.classList.add(`view-mode-${savedViewMode}`);
  
  // Set active button
  const savedBtn = viewModeToggle.querySelector(`[data-mode="${savedViewMode}"]`);
  if (savedBtn) {
    viewModeToggle.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
    savedBtn.classList.add('active');
  }
  
  // Handle view mode button clicks
  viewModeToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-mode-btn');
    if (!btn) return;
    
    const mode = btn.dataset.mode;
    
    // Update active state
    viewModeToggle.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Remove all view mode classes
    notesView.classList.remove('view-mode-three-column', 'view-mode-two-column', 'view-mode-one-column');
    
    // Add new view mode class
    notesView.classList.add(`view-mode-${mode}`);
    
    // Save preference
    localStorage.setItem('notesViewMode', mode);
  });
}

/**
 * Initialize Life Stories view
 */
function initLifeStories() {
  const canvas = document.getElementById('buildingCanvas');
  const floorList = document.getElementById('floorList');
  const elevatorUp = document.getElementById('elevatorUp');
  const elevatorDown = document.getElementById('elevatorDown');
  const currentFloorNumber = document.getElementById('currentFloorNumber');
  
  if (!canvas || !floorList) return;
  
  if (lifeStoriesState.initialized) {
    // Already initialized, just redraw
    drawLifeStoriesBuildingContinuous();
    return;
  }
  
  lifeStoriesState.canvas = canvas;
  lifeStoriesState.ctx = canvas.getContext('2d');
  
  // Set canvas size
  const viewport = document.getElementById('buildingViewport');
  if (viewport) {
    const resizeCanvas = () => {
      canvas.width = viewport.clientWidth;
      canvas.height = viewport.clientHeight;
      drawLifeStoriesBuildingContinuous();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  
  // Discover and load images, then initialize UI
  discoverLifeStoriesImages().then((discoveredFloors) => {
    if (discoveredFloors.length === 0) {
      // No images found, show placeholder
      drawLifeStoriesBuildingContinuous();
      return;
    }
    
    // Update floors array with discovered images
    lifeStoriesState.floors = discoveredFloors;
    
    // Always start at Floor 0 (Lobby)
    lifeStoriesState.currentFloor = 0;
    lifeStoriesState.scrollPosition = 0;
    
    // Update UI
    if (currentFloorNumber) {
      currentFloorNumber.textContent = lifeStoriesState.currentFloor;
    }
    
    drawLifeStoriesBuildingContinuous();
    renderLifeStoriesFloorList();
    updateLifeStoriesElevatorControls();
  });
  
  // Elevator controls
  if (elevatorUp) {
    elevatorUp.addEventListener('click', () => {
      const maxFloor = lifeStoriesState.floors.length > 0 
        ? Math.max(...lifeStoriesState.floors.map(f => f.number))
        : 0;
      const currentFloor = Math.round(lifeStoriesState.scrollPosition);
      if (currentFloor < maxFloor) {
        // Find next available floor
        const nextFloor = lifeStoriesState.floors.find(f => f.number > currentFloor);
        if (nextFloor) {
          smoothScrollToFloor(nextFloor.number);
        }
      }
    });
  }
  
  if (elevatorDown) {
    elevatorDown.addEventListener('click', () => {
      const minFloor = lifeStoriesState.floors.length > 0 
        ? Math.min(...lifeStoriesState.floors.map(f => f.number))
        : 1;
      const currentFloor = Math.round(lifeStoriesState.scrollPosition);
      if (currentFloor > minFloor) {
        // Find previous available floor
        const prevFloor = [...lifeStoriesState.floors]
          .reverse()
          .find(f => f.number < currentFloor);
        if (prevFloor) {
          smoothScrollToFloor(prevFloor.number);
        }
      }
    });
  }
  
  // Floor list buttons
  floorList.addEventListener('click', (e) => {
    const floorBtn = e.target.closest('.floor-btn');
    if (floorBtn) {
      const floorNumber = parseInt(floorBtn.dataset.floor);
      if (floorNumber && floorNumber !== Math.round(lifeStoriesState.scrollPosition)) {
        smoothScrollToFloor(floorNumber);
      }
    }
  });

  // Shared helper to apply scroll delta across input types
  function applyScrollDelta(deltaY, sensitivity = 300) {
    if (lifeStoriesState.floors.length === 0) return;

    const minFloor = Math.min(...lifeStoriesState.floors.map(f => f.number));
    const maxFloor = Math.max(...lifeStoriesState.floors.map(f => f.number));

    const floorDelta = deltaY / sensitivity;
    let newScrollPosition = lifeStoriesState.scrollPosition - floorDelta;

    newScrollPosition = Math.max(minFloor, Math.min(maxFloor, newScrollPosition));

    lifeStoriesState.scrollPosition = newScrollPosition;

    const newCurrentFloor = Math.round(newScrollPosition);
    if (newCurrentFloor !== lifeStoriesState.currentFloor) {
      lifeStoriesState.currentFloor = newCurrentFloor;
      updateLifeStoriesFloorDisplay();
    }

    drawLifeStoriesBuildingContinuous();
  }
  
  // Mouse wheel scrolling with continuous smooth movement
  // Attach to the entire life stories view for better coverage
  const lifeStoriesView = document.getElementById('lifeStoriesView');
  if (lifeStoriesView) {
    lifeStoriesView.addEventListener('wheel', (e) => {
      // Only handle if we have floors
      if (lifeStoriesState.floors.length === 0) return;

      e.preventDefault();
      e.stopPropagation();
      applyScrollDelta(e.deltaY);
    }, { passive: false });
  }

  // Touch scrolling for mobile
  const scrollTarget = viewport || lifeStoriesView;
  if (scrollTarget) {
    let lastTouchY = null;

    scrollTarget.addEventListener('touchstart', (e) => {
      if (lifeStoriesState.floors.length === 0) return;
      if (e.touches.length !== 1) return;
      lastTouchY = e.touches[0].clientY;
    }, { passive: true });

    scrollTarget.addEventListener('touchmove', (e) => {
      if (lifeStoriesState.floors.length === 0) return;
      if (lastTouchY === null || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - lastTouchY;
      lastTouchY = currentY;

      // Negative to match natural scroll (drag up moves content up)
      applyScrollDelta(-deltaY, 180);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });

    const resetTouchScroll = () => {
      lastTouchY = null;
    };

    scrollTarget.addEventListener('touchend', resetTouchScroll);
    scrollTarget.addEventListener('touchcancel', resetTouchScroll);
  }
  
  // Animation loop removed - scrolling is now instant with no transitions
  
  // Instant scroll to a specific floor (no smooth animation)
  function smoothScrollToFloor(targetFloor) {
    lifeStoriesState.scrollPosition = targetFloor;
    lifeStoriesState.targetScrollPosition = null;
    lifeStoriesState.scrollVelocity = 0;
    
    // Update current floor immediately
    const newCurrentFloor = Math.round(lifeStoriesState.scrollPosition);
    if (newCurrentFloor !== lifeStoriesState.currentFloor) {
      lifeStoriesState.currentFloor = newCurrentFloor;
      updateLifeStoriesFloorDisplay();
    }
    
    // Draw immediately without animation
    drawLifeStoriesBuildingContinuous();
  }
  
  // Update floor display and list based on current scroll position
  function updateLifeStoriesFloorDisplay() {
    if (currentFloorNumber) {
      currentFloorNumber.textContent = lifeStoriesState.currentFloor;
    }
    updateLifeStoriesFloorList();
    updateLifeStoriesElevatorControls();
  }
  
  function updateLifeStoriesElevatorControls() {
    if (lifeStoriesState.floors.length === 0) {
      if (elevatorUp) elevatorUp.disabled = true;
      if (elevatorDown) elevatorDown.disabled = true;
      return;
    }
    
    const maxFloor = Math.max(...lifeStoriesState.floors.map(f => f.number));
    const minFloor = Math.min(...lifeStoriesState.floors.map(f => f.number));
    const currentFloor = Math.round(lifeStoriesState.scrollPosition);
    
    if (elevatorUp) {
      elevatorUp.disabled = currentFloor >= maxFloor;
    }
    if (elevatorDown) {
      elevatorDown.disabled = currentFloor <= minFloor;
    }
  }
  
  function updateLifeStoriesFloorList() {
    floorList.querySelectorAll('.floor-btn').forEach(btn => {
      const floorNum = parseInt(btn.dataset.floor);
      btn.classList.toggle('active', floorNum === lifeStoriesState.currentFloor);
    });
  }
  
  function renderLifeStoriesFloorList() {
    floorList.innerHTML = '';
    lifeStoriesState.floors.forEach(floor => {
      const btn = document.createElement('button');
      btn.className = 'floor-btn';
      if (floor.milestone) {
        btn.classList.add('milestone');
      }
      if (floor.number === lifeStoriesState.currentFloor) {
        btn.classList.add('active');
      }
      btn.dataset.floor = floor.number;
      btn.textContent = floor.number;
      btn.setAttribute('aria-label', `Go to floor ${floor.number}`);
      floorList.appendChild(btn);
    });
  }
  
  // Draw the Floor 0 lobby screen
  function drawLobby(ctx, canvas, x, y, width, height) {
    // Background - darker base
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Pixelated floor pattern
    const tileSize = 40;
    for (let tx = 0; tx < width / tileSize; tx++) {
      for (let ty = 0; ty < height / tileSize; ty++) {
        const isLight = (tx + ty) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2a2a' : '#1f1f1f';
        ctx.fillRect(x + tx * tileSize, y + ty * tileSize, tileSize, tileSize);
      }
    }

    // Draw welcome sign in the center
    const signWidth = Math.min(width * 0.8, 600);
    const signHeight = Math.min(height * 0.6, 350);
    const signX = x + (width - signWidth) / 2;
    const signY = y + (height - signHeight) / 2;

    // Sign background - pixelated frame
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(signX, signY, signWidth, signHeight);

    // Sign border - pixel art style
    const borderWidth = 8;
    ctx.fillStyle = '#444';
    ctx.fillRect(signX, signY, signWidth, borderWidth); // top
    ctx.fillRect(signX, signY + signHeight - borderWidth, signWidth, borderWidth); // bottom
    ctx.fillRect(signX, signY, borderWidth, signHeight); // left
    ctx.fillRect(signX + signWidth - borderWidth, signY, borderWidth, signHeight); // right

    // Corner decorations
    ctx.fillStyle = '#666';
    const cornerSize = 16;
    ctx.fillRect(signX, signY, cornerSize, cornerSize); // top-left
    ctx.fillRect(signX + signWidth - cornerSize, signY, cornerSize, cornerSize); // top-right
    ctx.fillRect(signX, signY + signHeight - cornerSize, cornerSize, cornerSize); // bottom-left
    ctx.fillRect(signX + signWidth - cornerSize, signY + signHeight - cornerSize, cornerSize, cornerSize); // bottom-right

    // Text content
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    const titleSize = Math.min(signWidth / 12, 48);
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.fillText('LIFE STORIES', signX + signWidth / 2, signY + signHeight * 0.25);

    // Subtitle
    const subtitleSize = Math.min(signWidth / 20, 24);
    ctx.font = `${subtitleSize}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('A Pixelated Journey', signX + signWidth / 2, signY + signHeight * 0.38);

    // Description
    const descSize = Math.min(signWidth / 28, 16);
    ctx.font = `${descSize}px monospace`;
    ctx.fillStyle = '#999';
    const lines = [
      'Highlights and key moments of my life.',
      'Each floor represents a year of age.',
      '',
      'Scroll up to begin your journey →'
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, signX + signWidth / 2, signY + signHeight * 0.55 + i * (descSize + 8));
    });

    // Elevator indicator at bottom
    ctx.fillStyle = '#555';
    const elevatorWidth = 60;
    const elevatorHeight = 80;
    const elevatorX = signX + signWidth / 2 - elevatorWidth / 2;
    const elevatorY = signY + signHeight + 40;

    if (elevatorY + elevatorHeight < y + height) {
      ctx.fillRect(elevatorX, elevatorY, elevatorWidth, elevatorHeight);
      ctx.fillStyle = '#333';
      ctx.fillRect(elevatorX + 5, elevatorY + 5, elevatorWidth - 10, elevatorHeight - 10);

      // Elevator doors
      ctx.fillStyle = '#666';
      ctx.fillRect(elevatorX + 10, elevatorY + 10, (elevatorWidth - 20) / 2 - 2, elevatorHeight - 20);
      ctx.fillRect(elevatorX + elevatorWidth / 2 + 2, elevatorY + 10, (elevatorWidth - 20) / 2 - 2, elevatorHeight - 20);
    }
  }

  // Draw building with continuous scrolling (interpolate between floors with vertical movement)
  function drawLifeStoriesBuildingContinuous() {
    const ctx = lifeStoriesState.ctx;
    const canvas = lifeStoriesState.canvas;
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (lifeStoriesState.floors.length === 0) {
      // Draw placeholder when no images
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#666';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No images found', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText('Add images to images/life-stories/', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }
    
    // Simple vertical stacking like a webpage - no fancy transitions
    // Floor 1 is ground level. Scrolling down (higher floor numbers) = going UP the building
    // Minimal spacing between images (10px gap)
    const gapBetweenFloors = 10;
    const scrollPos = lifeStoriesState.scrollPosition;
    
    // Calculate the base Y position based on scroll position
    // Position floors consecutively by their index in the array, not by floor number
    const minFloor = Math.min(...lifeStoriesState.floors.map(f => f.number));
    const maxFloor = Math.max(...lifeStoriesState.floors.map(f => f.number));

    // Map floor number to array index for continuous positioning
    const floorToIndex = new Map();
    lifeStoriesState.floors.forEach((floor, index) => {
      floorToIndex.set(floor.number, index);
    });

    // Convert scroll position (floor number) to index-based position
    // Interpolate between floor indices
    let scrollIndex = 0;
    if (scrollPos <= minFloor) {
      scrollIndex = 0;
    } else if (scrollPos >= maxFloor) {
      scrollIndex = lifeStoriesState.floors.length - 1;
    } else {
      // Find the two floors we're between
      let lowerFloor = null;
      let upperFloor = null;
      for (let i = 0; i < lifeStoriesState.floors.length - 1; i++) {
        if (lifeStoriesState.floors[i].number <= scrollPos && lifeStoriesState.floors[i + 1].number > scrollPos) {
          lowerFloor = lifeStoriesState.floors[i];
          upperFloor = lifeStoriesState.floors[i + 1];
          break;
        }
      }
      if (lowerFloor && upperFloor) {
        const t = (scrollPos - lowerFloor.number) / (upperFloor.number - lowerFloor.number);
        const lowerIndex = floorToIndex.get(lowerFloor.number);
        const upperIndex = floorToIndex.get(upperFloor.number);
        scrollIndex = lowerIndex + t * (upperIndex - lowerIndex);
      }
    }

    // Save canvas state
    ctx.save();

    // Draw all visible floors in the viewport
    lifeStoriesState.floors.forEach((floor, arrayIndex) => {
      // Handle Floor 0 (Lobby) specially
      if (floor.isLobby) {
        // Use canvas height as the standard height for the lobby
        const lobbyHeight = canvas.height;

        // Calculate vertical position based on array index (consecutive)
        const baseYPosition = arrayIndex * (lobbyHeight + gapBetweenFloors);

        // Offset by scroll position (scrolling down moves content up)
        const scrollOffset = scrollIndex * (lobbyHeight + gapBetweenFloors);
        const y = canvas.height - lobbyHeight - baseYPosition + scrollOffset;

        // Only draw if lobby is visible in viewport
        if (y < canvas.height + lobbyHeight && y > -lobbyHeight) {
          drawLobby(ctx, canvas, 0, y, canvas.width, lobbyHeight);
        }
        return;
      }

      // Draw regular floor image
      const img = lifeStoriesState.images[floor.image];
      if (!img) return;

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const x = (canvas.width - imgWidth) / 2;

      // Calculate vertical position based on array index (consecutive)
      // Each floor takes up its image height + gap
      const baseYPosition = arrayIndex * (imgHeight + gapBetweenFloors);

      // Offset by scroll position (scrolling down moves content up)
      const scrollOffset = scrollIndex * (imgHeight + gapBetweenFloors);
      const y = canvas.height - imgHeight - baseYPosition + scrollOffset;

      // Only draw if floor is visible in viewport (with some margin)
      if (y < canvas.height + imgHeight && y > -imgHeight) {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
      }
    });
    
    // Restore canvas state
    ctx.restore();
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
  }
  
  function drawLifeStoriesBuilding() {
    const ctx = lifeStoriesState.ctx;
    const canvas = lifeStoriesState.canvas;
    if (!ctx || !canvas) return;
    
    const currentFloor = lifeStoriesState.floors.find(f => f.number === lifeStoriesState.currentFloor);
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw current floor image if available
    if (currentFloor && currentFloor.image && lifeStoriesState.images[currentFloor.image]) {
      const img = lifeStoriesState.images[currentFloor.image];
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
      // Draw placeholder
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#666';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (lifeStoriesState.floors.length === 0) {
        ctx.fillText('No images found', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Add images to images/life-stories/', canvas.width / 2, canvas.height / 2 + 10);
      } else {
        ctx.fillText(`Floor ${lifeStoriesState.currentFloor}`, canvas.width / 2, canvas.height / 2);
      }
    }
  }
  
  
  lifeStoriesState.initialized = true;
}

/**
 * Initialize app
 */
async function init() {
  initBackgroundImage();
  setupEventListeners();
  setupTopMenuNav();
  setupHamburgerMenu(); // Setup mobile hamburger menu
  setupInfoPopup();
  setupVersionChangelog();
  setupWindowManagement(); // Initialize window dragging and management
  setupViewModeToggle(); // Setup view mode toggle for notes
  initMenuBar();
  await loadPosts();
  await loadGoals();
  await loadMusic();
  await loadThoughtTrains();
  setupThoughtTrainInteractions();
  await loadLabs();
  setupLabsInteractions();

  // Restore last-open view after refresh
  const lastOpenWindowId = getLastOpenWindowId();
  if (lastOpenWindowId) {
    await openWindow(lastOpenWindowId);
  }

  // Initialize mini player state
  const miniPlayer = document.getElementById('miniPlayer');
  if (miniPlayer) {
    miniPlayer.setAttribute('aria-hidden', 'true');
    // Check if there's a current track and window is closed, show mini player if needed
    if (musicState.currentIndex >= 0 && musicState.tracks.length > 0 && !state.windows.openWindows.has('music')) {
      showMiniPlayer();
    }
  }
  
  showSystemAlert(); // Show welcome alert
}

// Start the app
init();
