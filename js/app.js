/**
 * Digital Garden - Bear-style note browser
 * Lightweight markdown blog with 3-pane layout
 */

// Import configuration and utilities
import { tagIcons, musicFolderIcons, weatherIcons } from './config/icons.js';
import { defaultMusicFolders, hiddenTags, LAST_OPEN_WINDOW_STORAGE_KEY, PLAYLIST_CACHE_DURATION } from './config/constants.js';
import { state, musicState, lifeStoriesState } from './config/state.js';
import { formatDate, filenameToSlug, findPostBySlugInArray } from './utils/dom.js';
import { setLastOpenWindowId } from './utils/storage.js';
import { parseMarkdown } from './utils/markdown.js';
import { parsePost } from './parsers/post-parser.js';
import { parseThoughtTrain } from './parsers/train-parser.js';
import { parseLab } from './parsers/lab-parser.js';
import { parseAlbum } from './parsers/gallery-parser.js';

// Import notes feature modules
import { buildTagNav } from './features/notes/tag-nav.js';
import { renderPosts } from './features/notes/note-list.js';
import { renderNote, closeNote } from './features/notes/note-viewer.js';
import { getNoteFromUrl, updateNoteUrl } from './features/notes/url-router.js';

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
    console.log('[openWindow] Adding app-active class to topMenuBar');
    topMenuBar.classList.add('app-active');
  } else {
    console.warn('[openWindow] topMenuBar element not found');
  }

  // Handle special cases for specific windows
  if (windowId === 'notes' && state.posts.length > 0) {
    const noteFromUrl = getNoteFromUrl(state.posts);
    if (noteFromUrl) {
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, elements, state, false);
    } else {
      // If no note in URL, always default to Garden Readme first
      const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
      if (defaultPost) {
        state.currentPost = defaultPost;
        renderNote(defaultPost, elements, state);
      } else if (state.currentPost) {
        // Fall back to current post if Garden Readme doesn't exist
        renderNote(state.currentPost, elements, state);
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
    // If clicking the same view, close it and go to home
    const win = document.getElementById(`${windowId}View`);
    closeWindow(win);
    // Clear URL hash
    window.history.pushState(null, '', window.location.pathname);
  } else {
    // Use switchView to properly handle URL routing
    switchView(windowId);
  }
}


/**
 * Notes Feature Functions
 * (Modular versions available in ./features/notes/)
 */

/**
 * Find post by slug
 */
function findPostBySlug(slug) {
  return state.posts.find(post => filenameToSlug(post.filename) === slug);
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
        renderNote(post, elements, state);

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
      const tagPath = tagBtn.dataset.tag;
      state.currentTag = tagPath;

      // If this is a parent tag with children, auto-expand it
      const tagRow = tagBtn.closest('.tag-item-row');
      if (tagRow) {
        const toggleBtn = tagRow.querySelector('.tag-toggle');
        if (toggleBtn && !state.expandedTags.has(tagPath)) {
          state.expandedTags.add(tagPath);
          toggleBtn.classList.add('expanded');
          const childList = toggleBtn.closest('.tag-tree-item').querySelector('.tag-children');
          if (childList) {
            childList.classList.remove('collapsed');
          }
        }
      }

      renderPosts(state, elements.postsList, state.currentTag);

      // Update active states
      document.querySelectorAll('.tag-item').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      });
      tagBtn.classList.add('active');
      tagBtn.setAttribute('aria-current', 'true');

      // Close note view if open on mobile
      if (window.innerWidth <= 1024 && elements.noteView && elements.noteView.classList.contains('active')) {
        closeNote(elements, state);
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
        renderNote(post, elements, state);

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
        renderPosts(state, elements.postsList, tagText);

        // Update active states
        document.querySelectorAll('.tag-item').forEach(btn => {
          btn.classList.remove('active');
          btn.removeAttribute('aria-current');
        });
        tagBtn.classList.add('active');
        tagBtn.setAttribute('aria-current', 'true');

        // Close note view if open on mobile
        if (window.innerWidth <= 1024 && elements.noteView && elements.noteView.classList.contains('active')) {
          closeNote(elements, state);
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
        closeNote(elements, state);
      }
    }
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const viewFromUrl = getViewFromUrl();
    const noteFromUrl = getNoteFromUrl(state.posts);

    if (noteFromUrl) {
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, elements, state, false); // Don't update URL since we're responding to URL change
      // Switch to notes view if not already there
      if (state.currentView !== 'notes') {
        performViewSwitch('notes', false);
      }
    } else if (viewFromUrl) {
      // Switch to the view from URL without updating URL (we're responding to URL change)
      if (state.currentView !== viewFromUrl) {
        performViewSwitch(viewFromUrl, false);
      }
    } else {
      // No view in URL, close note view on mobile/tablet
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
    const postsModule = await import('../posts.js');
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
    buildTagNav(state, elements.tagList);
    renderPosts(state, elements.postsList);

    // Check if there's a view or note in the URL
    const viewFromUrl = getViewFromUrl();
    const noteFromUrl = getNoteFromUrl(state.posts);

    if (noteFromUrl) {
      // Note URL found - open that note in notes view
      state.currentPost = noteFromUrl;
      performViewSwitch('notes', false);
    } else if (viewFromUrl) {
      // View URL found - switch to that view
      performViewSwitch(viewFromUrl, false);
    } else {
      // No URL hash - stay on homepage
      // On desktop, preload Garden Readme for notes view
      if (window.innerWidth > 1024 && state.posts.length > 0) {
        const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
        const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
        const postToOpen = defaultPost || sorted[0];
        state.currentPost = postToOpen;
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
    const { default: manifest } = await import('../thought-trains.js');

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
    const { default: manifest } = await import('../labs.js');

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

// ==========================================
// Gallery Functions
// ==========================================

/**
 * Load gallery albums
 */
async function loadGallery() {
  try {
    const { default: manifest } = await import('../gallery.js');

    state.gallery.albums = manifest
      .map(parseAlbum)
      .sort((a, b) => {
        // Parse dates from the date field (extracted from folder name)
        // Format can be "December 2025", "October 2025", or just "2024"
        const parseAlbumDate = (album) => {
          if (!album.date) return new Date(0); // Albums without dates go to end

          // Match "Month Year" or just "Year"
          const monthYear = album.date.match(/^([A-Za-z]+)\s+(\d{4})$/);
          const yearOnly = album.date.match(/^(\d{4})$/);

          if (monthYear) {
            // Parse "December 2025" format
            return new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
          } else if (yearOnly) {
            // Parse "2024" format - assume January
            return new Date(`January 1, ${yearOnly[1]}`);
          }

          return new Date(0);
        };

        return parseAlbumDate(b) - parseAlbumDate(a); // Reverse chronological
      });

    renderGalleryGrid();
  } catch (err) {
    console.warn('Gallery manifest not found:', err);
    state.gallery.albums = [];
  }
}

/**
 * Render gallery grid (polaroid stack cards)
 */
function renderGalleryGrid() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  if (state.gallery.albums.length === 0) {
    container.innerHTML = '<div class="gallery-empty">No albums yet</div>';
    return;
  }

  // Render album stacks (each shows up to 3 images stacked like polaroids)
  // First image (KEY) should be on top with the caption
  // Use thumbnails for faster loading
  container.innerHTML = state.gallery.albums.map(album => {
    const previewThumbs = album.thumbs.slice(0, 3); // Top 3 thumbs for stack
    // Reverse so first image (KEY) is rendered last (on top)
    const stackThumbs = [...previewThumbs].reverse();

    return `
      <div class="gallery-album-card" data-album-id="${album.id}">
        <div class="polaroid-stack">
          ${stackThumbs.map((thumb, i) => `
            <div class="polaroid" style="--stack-index: ${i}">
              <div class="polaroid-photo">
                <img src="${thumb}" alt="${album.title}" loading="lazy">
              </div>
              ${i === stackThumbs.length - 1 ? `
                <div class="polaroid-caption">
                  <div class="polaroid-title">${album.title}</div>
                  ${album.date ? `<div class="polaroid-date">${album.date}</div>` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Expand album (transition to grid view)
 */
function expandAlbum(albumId) {
  const album = state.gallery.albums.find(a => a.id === albumId);
  if (!album) return;

  state.gallery.activeAlbum = album;

  const container = document.getElementById('galleryExpanded');
  const title = document.getElementById('galleryExpandedTitle');
  const subtitle = document.getElementById('galleryExpandedSubtitle');

  title.textContent = album.title;
  subtitle.textContent = album.date;

  // Render the photo grid
  renderExpandedAlbum();

  // Show expanded view with transition
  document.getElementById('galleryView').classList.add('album-expanded');
  container.setAttribute('aria-hidden', 'false');
}

/**
 * Collapse album (back to stack view)
 */
function collapseAlbum() {
  state.gallery.activeAlbum = null;

  document.getElementById('galleryView').classList.remove('album-expanded');
  document.getElementById('galleryExpanded').setAttribute('aria-hidden', 'true');
}

/**
 * Open lightbox
 */
function openLightbox(index) {
  if (!state.gallery.activeAlbum) return;

  state.gallery.lightboxIndex = index;
  const img = state.gallery.activeAlbum.images[index];

  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('galleryLightboxImg');

  lightboxImg.src = img;
  lightbox.setAttribute('aria-hidden', 'false');
}

/**
 * Close lightbox
 */
function closeLightbox() {
  state.gallery.lightboxIndex = -1;
  document.getElementById('galleryLightbox').setAttribute('aria-hidden', 'true');
}

/**
 * Navigate lightbox (prev/next)
 */
function navigateLightbox(direction) {
  if (!state.gallery.activeAlbum) return;

  const newIndex = state.gallery.lightboxIndex + direction;
  const maxIndex = state.gallery.activeAlbum.images.length - 1;

  if (newIndex >= 0 && newIndex <= maxIndex) {
    openLightbox(newIndex);
  }
}

/**
 * Extract EXIF data from an image
 */
async function extractExifData(imagePath) {
  // Check cache first
  if (state.gallery.exifCache.has(imagePath)) {
    return state.gallery.exifCache.get(imagePath);
  }

  return new Promise((resolve) => {
    const img = new Image();
    // Don't set crossOrigin for local files to avoid CORS issues
    // img.crossOrigin = 'Anonymous';

    img.onload = function() {
      // Use EXIF.js library (loaded globally)
      if (typeof EXIF !== 'undefined') {
        EXIF.getData(img, function() {
          const make = EXIF.getTag(this, 'Make');
          const model = EXIF.getTag(this, 'Model');
          const iso = EXIF.getTag(this, 'ISOSpeedRatings');
          const aperture = EXIF.getTag(this, 'FNumber');
          const shutterSpeed = EXIF.getTag(this, 'ExposureTime');
          const focalLength = EXIF.getTag(this, 'FocalLength');

          const exifData = {
            make: make || null,
            model: model || null,
            iso: iso || null,
            aperture: aperture || null,
            shutterSpeed: shutterSpeed || null,
            focalLength: focalLength || null
          };

          // Cache the result
          state.gallery.exifCache.set(imagePath, exifData);
          resolve(exifData);
        });
      } else {
        console.warn('EXIF library not loaded');
        resolve(null);
      }
    };

    img.onerror = (e) => {
      console.error('Failed to load image for EXIF:', imagePath, e);
      resolve(null);
    };

    img.src = imagePath;
  });
}

/**
 * Format EXIF data for display
 */
function formatExifData(exif) {
  if (!exif) return '';

  const lines = [];

  // Line 1: Camera make/model
  if (exif.make && exif.model) {
    lines.push(`${exif.make} ${exif.model}`);
  } else if (exif.model) {
    lines.push(exif.model);
  }

  // Line 2: Settings (ISO, aperture, shutter, focal length)
  const settings = [];

  if (exif.focalLength) {
    settings.push(`${exif.focalLength}mm`);
  }

  if (exif.aperture) {
    settings.push(`f/${exif.aperture}`);
  }

  if (exif.shutterSpeed) {
    if (exif.shutterSpeed < 1) {
      settings.push(`1/${Math.round(1 / exif.shutterSpeed)}s`);
    } else {
      settings.push(`${exif.shutterSpeed}s`);
    }
  }

  if (exif.iso) {
    settings.push(`ISO ${exif.iso}`);
  }

  if (settings.length > 0) {
    lines.push(settings.join(' • '));
  }

  return lines.join('<br>');
}

/**
 * Toggle nerd mode (EXIF display)
 */
function toggleNerdMode() {
  state.gallery.nerdMode = !state.gallery.nerdMode;
  console.log('Nerd mode toggled:', state.gallery.nerdMode);

  // Update toggle button state
  const toggleBtn = document.getElementById('galleryNerdModeToggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', state.gallery.nerdMode);
  }

  // Save to localStorage
  localStorage.setItem('galleryNerdMode', JSON.stringify(state.gallery.nerdMode));

  // Re-render the current album if one is active
  if (state.gallery.activeAlbum) {
    console.log('Re-rendering album with nerd mode:', state.gallery.nerdMode);
    renderExpandedAlbum();
  }
}

/**
 * Render the expanded album grid with EXIF support
 */
async function renderExpandedAlbum() {
  const album = state.gallery.activeAlbum;
  if (!album) return;

  const grid = document.getElementById('galleryExpandedGrid');
  console.log('Rendering album, nerd mode:', state.gallery.nerdMode);

  // Render photo grid with random slight rotations
  // Use thumbnails for faster loading in grid view
  const photoCards = await Promise.all(album.thumbs.map(async (thumb, i) => {
    const rotation = (Math.random() - 0.5) * 6; // -3 to +3 degrees
    const fullImage = album.images[i];

    // Extract EXIF if nerd mode is enabled
    let exifHtml = '';
    let hasExifClass = '';
    if (state.gallery.nerdMode) {
      console.log('Extracting EXIF for:', fullImage);
      const exifData = await extractExifData(fullImage);
      console.log('EXIF data:', exifData);
      const formattedExif = formatExifData(exifData);
      console.log('Formatted EXIF:', formattedExif);
      if (formattedExif) {
        exifHtml = `<div class="polaroid-exif">${formattedExif}</div>`;
        hasExifClass = 'has-exif';
      }
    }

    return `
      <div class="gallery-photo-card"
           data-index="${i}"
           style="transform: rotate(${rotation}deg)">
        <div class="polaroid ${hasExifClass}">
          <div class="polaroid-photo">
            <img src="${thumb}" alt="${album.title} photo ${i + 1}" loading="lazy">
          </div>
          ${exifHtml}
        </div>
      </div>
    `;
  }));

  grid.innerHTML = photoCards.join('');
  console.log('Album rendered');
}

/**
 * Setup gallery interactions
 */
function setupGalleryInteractions() {
  // Album card clicks
  const grid = document.getElementById('galleryGrid');
  grid?.addEventListener('click', (e) => {
    const card = e.target.closest('.gallery-album-card');
    if (card) {
      expandAlbum(card.dataset.albumId);
    }
  });

  // Photo clicks (open lightbox)
  const expandedGrid = document.getElementById('galleryExpandedGrid');
  expandedGrid?.addEventListener('click', (e) => {
    const photoCard = e.target.closest('.gallery-photo-card');
    if (photoCard) {
      openLightbox(parseInt(photoCard.dataset.index));
    }
  });

  // Back button
  document.getElementById('galleryBackBtn')?.addEventListener('click', collapseAlbum);

  // Nerd mode toggle
  document.getElementById('galleryNerdModeToggle')?.addEventListener('click', toggleNerdMode);

  // Lightbox controls
  document.getElementById('galleryLightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('galleryLightboxPrev')?.addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('galleryLightboxNext')?.addEventListener('click', () => navigateLightbox(1));

  // Lightbox overlay click to close
  document.getElementById('galleryLightbox')?.querySelector('.gallery-lightbox-overlay')?.addEventListener('click', closeLightbox);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('galleryLightbox');
    if (lightbox?.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    }
  });
}

// ==========================================
// Guestbook Functions
// ==========================================

/**
 * Canvas drawing state
 */
const guestbookDrawing = {
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  currentColor: '#ffffff',
  lineWidth: 3
};

/**
 * Initialize guestbook canvas
 */
function initGuestbookCanvas() {
  const canvas = document.getElementById('guestbookCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Set canvas display size (CSS pixels)
  canvas.style.width = '800px';
  canvas.style.height = '600px';

  // Set actual canvas size (device pixels for retina support)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 800 * dpr;
  canvas.height = 600 * dpr;

  // Scale context to match DPR
  ctx.scale(dpr, dpr);

  // Dark space background with stars
  fillCanvasBackground(ctx, canvas);

  state.guestbook.drawingCanvas = canvas;

  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events for mobile
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

/**
 * Fill canvas background (black)
 */
function fillCanvasBackground(ctx, canvas) {
  const width = 800;
  const height = 600;

  // Fill with black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
}

/**
 * Drawing functions
 */
function startDrawing(e) {
  guestbookDrawing.isDrawing = true;
  const canvas = state.guestbook.drawingCanvas;
  const rect = canvas.getBoundingClientRect();

  // Calculate coordinates with proper scaling
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;

  guestbookDrawing.lastX = (e.clientX - rect.left) * scaleX;
  guestbookDrawing.lastY = (e.clientY - rect.top) * scaleY;
}

function draw(e) {
  if (!guestbookDrawing.isDrawing) return;

  const canvas = state.guestbook.drawingCanvas;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();

  // Calculate coordinates with proper scaling
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  ctx.beginPath();
  ctx.moveTo(guestbookDrawing.lastX, guestbookDrawing.lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = guestbookDrawing.currentColor;
  ctx.lineWidth = guestbookDrawing.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  guestbookDrawing.lastX = x;
  guestbookDrawing.lastY = y;
}

function stopDrawing() {
  guestbookDrawing.isDrawing = false;
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const canvas = state.guestbook.drawingCanvas;
  const rect = canvas.getBoundingClientRect();

  // Calculate coordinates with proper scaling
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;

  guestbookDrawing.isDrawing = true;
  guestbookDrawing.lastX = (touch.clientX - rect.left) * scaleX;
  guestbookDrawing.lastY = (touch.clientY - rect.top) * scaleY;
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!guestbookDrawing.isDrawing) return;

  const touch = e.touches[0];
  const canvas = state.guestbook.drawingCanvas;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();

  // Calculate coordinates with proper scaling
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;

  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;

  ctx.beginPath();
  ctx.moveTo(guestbookDrawing.lastX, guestbookDrawing.lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = guestbookDrawing.currentColor;
  ctx.lineWidth = guestbookDrawing.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  guestbookDrawing.lastX = x;
  guestbookDrawing.lastY = y;
}

/**
 * Clear canvas
 */
function clearGuestbookCanvas() {
  const canvas = state.guestbook.drawingCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  fillCanvasBackground(ctx, canvas);
}

/**
 * Save drawing to API
 */
async function saveGuestbookDrawing() {
  const canvas = state.guestbook.drawingCanvas;
  if (!canvas) return;

  const saveBtn = document.getElementById('saveDrawing');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Saving...</span>';
  }

  try {
    // Convert canvas to base64 PNG
    const imageData = canvas.toDataURL('image/png');

    // Save to API
    const response = await fetch('/api/guestbook/stars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData,
        width: canvas.width,
        height: canvas.height
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save star');
    }

    // Success! Clear canvas and switch to gallery view
    clearGuestbookCanvas();
    switchGuestbookMode('gallery');

    // Reload gallery to show new star
    await loadGuestbookStars(1);

  } catch (err) {
    console.error('Error saving star:', err);
    alert('Failed to save your star. Please try again.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg><span>Save to Gallery</span>';
    }
  }
}

/**
 * Load stars from API
 */
async function loadGuestbookStars(page = 1) {
  try {
    const response = await fetch(`/api/guestbook/stars?page=${page}`);
    if (!response.ok) throw new Error('Failed to load stars');

    const data = await response.json();

    state.guestbook.stars = data.stars || [];
    state.guestbook.currentPage = data.page || 1;
    state.guestbook.totalPages = data.totalPages || 1;

    renderGuestbookGallery();

  } catch (err) {
    console.error('Error loading stars:', err);
    state.guestbook.stars = [];
    renderGuestbookGallery();
  }
}

/**
 * Render gallery grid
 */
function renderGuestbookGallery() {
  const grid = document.getElementById('guestbookGalleryGrid');
  if (!grid) return;

  if (state.guestbook.stars.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 64px;">No stars yet. Be the first to draw one!</div>';
    return;
  }

  grid.innerHTML = state.guestbook.stars.map(star => `
    <div class="guestbook-star-card">
      <img src="${star.imageData}" alt="Star drawing from ${new Date(star.createdAt).toLocaleDateString()}" loading="lazy">
    </div>
  `).join('');

  // Update pagination
  updateGuestbookPagination();
}

/**
 * Update pagination controls
 */
function updateGuestbookPagination() {
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  if (pageInfo) {
    pageInfo.textContent = `Page ${state.guestbook.currentPage} of ${state.guestbook.totalPages}`;
  }

  if (prevBtn) {
    prevBtn.disabled = state.guestbook.currentPage === 1;
  }

  if (nextBtn) {
    nextBtn.disabled = state.guestbook.currentPage >= state.guestbook.totalPages;
  }
}

/**
 * Switch between draw and gallery modes
 */
function switchGuestbookMode(mode) {
  state.guestbook.viewMode = mode;

  const drawPanel = document.getElementById('guestbookDrawPanel');
  const galleryPanel = document.getElementById('guestbookGalleryPanel');

  document.querySelectorAll('.guestbook-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'draw') {
    drawPanel?.classList.remove('hidden');
    galleryPanel?.classList.add('hidden');
  } else {
    drawPanel?.classList.add('hidden');
    galleryPanel?.classList.remove('hidden');
    loadGuestbookStars(state.guestbook.currentPage);
  }
}

/**
 * Setup guestbook interactions
 */
function setupGuestbookInteractions() {
  // Mode toggle buttons
  document.querySelectorAll('.guestbook-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchGuestbookMode(btn.dataset.mode);
    });
  });

  // Color palette
  document.querySelectorAll('.palette-color').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      guestbookDrawing.currentColor = btn.dataset.color;
    });
  });

  // Clear button
  document.getElementById('clearCanvas')?.addEventListener('click', clearGuestbookCanvas);

  // Save button
  document.getElementById('saveDrawing')?.addEventListener('click', saveGuestbookDrawing);

  // Pagination
  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (state.guestbook.currentPage > 1) {
      loadGuestbookStars(state.guestbook.currentPage - 1);
    }
  });

  document.getElementById('nextPage')?.addEventListener('click', () => {
    if (state.guestbook.currentPage < state.guestbook.totalPages) {
      loadGuestbookStars(state.guestbook.currentPage + 1);
    }
  });
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
 * Update URL to reflect current view
 * @param {string} viewName - Name of the view
 */
function updateViewUrl(viewName) {
  // Special handling for notes view - preserve note hash if present
  if (viewName === 'notes' && window.location.hash.startsWith('#note/')) {
    // Don't change URL if we're already showing a specific note
    return;
  }

  const newHash = `#${viewName}`;

  // Only update if different from current hash
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash);
  }
}

/**
 * Get current view from URL hash
 * @returns {string|null} - View name or null
 */
function getViewFromUrl() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return null;

  // Handle note URLs specially
  if (hash.startsWith('#note/')) {
    return 'notes';
  }

  // Extract view name (remove # prefix)
  const viewName = hash.substring(1);

  // Validate it's a real view
  const validViews = ['tasks', 'notes', 'music', 'labs', 'gallery'];
  return validViews.includes(viewName) ? viewName : null;
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
function performViewSwitch(viewName, updateUrl = true) {
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

  // Update top menu bar to solid state when app is active
  const topMenuBar = document.getElementById('topMenuBar');
  if (topMenuBar) {
    topMenuBar.classList.add('app-active');
  }

  // Update URL to reflect current view
  if (updateUrl) {
    updateViewUrl(viewName);
  }

  // When switching to notes view, check URL first, then default to Garden Readme
  if (viewName === 'notes' && state.posts.length > 0) {
    const noteFromUrl = getNoteFromUrl(state.posts);
    if (noteFromUrl) {
      // If there's a note in the URL, open that
      state.currentPost = noteFromUrl;
      renderNote(noteFromUrl, elements, state, false);
    } else {
      // If no note in URL, always default to Garden Readme first
      const defaultPost = state.posts.find(p => p.filename === 'Garden Readme.md');
      if (defaultPost) {
        state.currentPost = defaultPost;
        renderNote(defaultPost, elements, state);
      } else if (state.currentPost) {
        // Fall back to current post if Garden Readme doesn't exist
        renderNote(state.currentPost, elements, state);
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

  // Initialize guestbook when switching to it
  if (viewName === 'guestbook') {
    if (!state.guestbook.drawingCanvas) {
      initGuestbookCanvas();
    }
    switchGuestbookMode(state.guestbook.viewMode || 'draw');
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
 * Check if a year's goals file exists
 */
async function checkYearExists(year) {
  try {
    const filename = `${year} Goals.md`;
    const response = await fetch(filename, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Discover available year tabs by checking for files
 */
async function discoverYearTabs() {
  const yearsToCheck = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  const availableYears = [];

  for (const year of yearsToCheck) {
    const exists = await checkYearExists(year);
    if (exists) {
      availableYears.push(year);
    }
  }

  // Always include 2026 for loading state
  if (!availableYears.includes(2026)) {
    availableYears.unshift(2026);
  }

  return availableYears;
}

/**
 * Render year tabs dynamically
 */
async function renderYearTabs() {
  const header = document.querySelector('.tasks-header');
  if (!header) return;

  const years = await discoverYearTabs();

  header.innerHTML = years.map((year, index) => {
    const isActive = index === 0 ? 'active' : '';
    return `<button class="tasks-year-btn ${isActive}" data-year="${year}">
      <span>${year}</span>
    </button>`;
  }).join('');

  // Re-initialize event listeners after rendering
  initTasksYearTabs();

  return years;
}

/**
 * Load and render goals from year-specific markdown file
 */
async function loadGoals(year = '2025') {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  try {
    const filename = `${year} Goals.md`;
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);

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
        let sectionTitle = trimmed.slice(2);
        // Override year-based headings to just show the section name
        sectionTitle = sectionTitle.replace(/^\d{4}\s+/, ''); // Remove "2024 " prefix
        currentSection = sectionTitle;
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
    console.warn(`Could not load ${year} Goals.md:`, err);
    // Show loading bar for future years (2026+)
    if (parseInt(year) >= 2026) {
      container.innerHTML = `
        <div class="tasks-loading-state">
          <div class="loading-squares">
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
            <div class="loading-square"></div>
          </div>
          <p class="loading-text">Planning ${year}...</p>
        </div>
      `;
    } else {
      container.innerHTML = `<p class="empty-state">Add goals to ${year} Goals.md</p>`;
    }
  }
}

/**
 * Switch between task years
 */
function switchTasksYear(year) {
  // Update active button state
  document.querySelectorAll('.tasks-year-btn').forEach(btn => {
    if (btn.dataset.year === year) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Load goals for the selected year
  loadGoals(year);
}

/**
 * Initialize tasks year tabs
 */
function initTasksYearTabs() {
  document.querySelectorAll('.tasks-year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTasksYear(btn.dataset.year);
    });
  });
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
 * Music Player State and Life Stories State
 * Imported from config/state.js
 */

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
    const soundsModule = await import('../sounds.js');
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
    // Hide thumbnails for Sounds folder tracks
    const showThumb = track.folder !== 'Sounds';
    const thumbHtml = showThumb && track.thumbnail
      ? `<img src="${track.thumbnail}" alt="${track.title}" loading="lazy">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

    return `
      <div class="playlist-item${isActive ? ' active playing' : ''}" data-index="${index}">
        ${showThumb ? `<div class="playlist-thumb">${thumbHtml}</div>` : ''}
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

  if (track.isLocalAudio && track.audioUrl) {
    // Play local audio file
    ensureAudioPlayer(track.audioUrl);
  } else if (track.videoId) {
    // Play YouTube video
    ensureYouTubePlayer(track.videoId);
  }
}

/**
 * Play local audio file
 */
function ensureAudioPlayer(audioUrl) {
  const artworkContainer = document.getElementById('artworkContainer');
  if (artworkContainer) {
    artworkContainer.classList.remove('is-video');
    // Show large Sounds icon with hidden audio player
    artworkContainer.innerHTML = `
      <div class="artwork-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width: 120px; height: 120px; opacity: 0.3;">
          <rect x="2" y="5" width="2" height="8" rx="1" fill="currentColor"/>
          <rect x="6" y="3" width="2" height="12" rx="1" fill="currentColor"/>
          <rect x="10" y="7" width="2" height="6" rx="1" fill="currentColor"/>
          <rect x="14" y="9" width="2" height="2" rx="1" fill="currentColor"/>
        </svg>
      </div>
      <audio id="audioPlayer" src="${audioUrl}" autoplay style="display: none;"></audio>
    `;

    // Store audio element reference and update play/pause button state
    const audioElement = artworkContainer.querySelector('#audioPlayer');
    if (audioElement) {
      musicState.audioPlayer = audioElement;

      // Update button state when audio starts playing
      audioElement.addEventListener('play', () => {
        musicState.isPlaying = true;
        updatePlayPauseButton();
      });

      audioElement.addEventListener('pause', () => {
        musicState.isPlaying = false;
        updatePlayPauseButton();
      });

      audioElement.addEventListener('ended', () => {
        musicState.isPlaying = false;
        updatePlayPauseButton();
        // Auto-play next track
        playNext();
      });

      // Update progress bar as audio plays
      audioElement.addEventListener('timeupdate', () => {
        updateProgressBar(audioElement.currentTime, audioElement.duration);
      });

      // Update progress when metadata loads
      audioElement.addEventListener('loadedmetadata', () => {
        updateProgressBar(0, audioElement.duration);
      });
    }
  }

  // Stop YouTube player if active
  if (musicState.player) {
    musicState.player.pauseVideo();
  }
}

/**
 * Update progress bar with current playback time
 */
function updateProgressBar(currentTime, duration) {
  const progressFill = document.querySelector('.zen-progress-fill');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('duration');

  if (!progressFill || !currentTimeEl || !totalTimeEl) return;

  // Handle invalid values
  if (!duration || isNaN(duration) || !isFinite(duration)) {
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    totalTimeEl.textContent = '0:00';
    return;
  }

  // Calculate and update progress
  const progress = (currentTime / duration) * 100;
  progressFill.style.width = `${Math.min(progress, 100)}%`;

  // Format and update time displays
  currentTimeEl.textContent = formatTime(currentTime || 0);
  totalTimeEl.textContent = formatTime(duration);
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Update play/pause button icon based on playing state
 */
function updatePlayPauseButton() {
  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;

  const iconPlay = playBtn.querySelector('.icon-play');
  const iconPause = playBtn.querySelector('.icon-pause');

  if (musicState.isPlaying) {
    iconPlay?.classList.add('hidden');
    iconPause?.classList.remove('hidden');
  } else {
    iconPlay?.classList.remove('hidden');
    iconPause?.classList.add('hidden');
  }
}

/**
 * Toggle play/pause for current track
 */
function togglePlayPause() {
  // Handle local audio player
  if (musicState.audioPlayer) {
    if (musicState.isPlaying) {
      musicState.audioPlayer.pause();
    } else {
      musicState.audioPlayer.play();
    }
    return;
  }

  // Handle YouTube player
  if (musicState.player) {
    if (musicState.isPlaying) {
      musicState.player.pauseVideo();
      musicState.isPlaying = false;
    } else {
      musicState.player.playVideo();
      musicState.isPlaying = true;
    }
    updatePlayPauseButton();
  }
}

/**
 * Setup music player controls
 */
function setupMusicControls() {
  const playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.addEventListener('click', togglePlayPause);
  }

  // Previous/Next buttons
  const prevBtn = document.getElementById('zenBtnLeft');
  const nextBtn = document.getElementById('zenBtnRight');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const prevIndex = musicState.currentIndex - 1;
      if (prevIndex >= 0) {
        playTrack(prevIndex);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', playNext);
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
 * Only shows once per session (won't show again until browser tab is closed)
 */
function showSystemAlert() {
  const alert = document.getElementById('systemAlert');
  if (!alert) return;

  // Check if alert has already been shown this session
  if (sessionStorage.getItem('welcomeAlertShown') === 'true') {
    return;
  }

  // Mark as shown for this session
  sessionStorage.setItem('welcomeAlertShown', 'true');

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
  await renderYearTabs(); // Discover and render year tabs dynamically
  const currentYear = new Date().getFullYear();
  await loadGoals(currentYear.toString());
  await loadMusic();
  setupMusicControls(); // Setup music player controls
  await loadThoughtTrains();
  setupThoughtTrainInteractions();
  await loadLabs();
  setupLabsInteractions();
  await loadGallery();
  setupGalleryInteractions();

  // Restore nerd mode state from localStorage
  const savedNerdMode = localStorage.getItem('galleryNerdMode');
  if (savedNerdMode !== null) {
    state.gallery.nerdMode = JSON.parse(savedNerdMode);
    const toggleBtn = document.getElementById('galleryNerdModeToggle');
    if (toggleBtn && state.gallery.nerdMode) {
      toggleBtn.classList.add('active');
    }
  }

  setupGuestbookInteractions();

  // Restore view from URL (if present)
  const viewFromUrl = getViewFromUrl();
  if (viewFromUrl) {
    await openWindow(viewFromUrl);
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
