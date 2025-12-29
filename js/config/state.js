/**
 * Application State Management
 * Centralized state initialization for the entire application
 */

import { defaultMusicFolders, PLAYLIST_CACHE_DURATION } from './constants.js';

// Main application state (posts, tags, views, thought trains, labs)
export const state = {
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
  labs: [],                     // Array of parsed lab objects
  gallery: {
    albums: [],                 // All albums
    activeAlbum: null,          // Currently expanded album
    lightboxIndex: -1           // Current photo in lightbox (-1 = closed)
  },
  guestbook: {
    stars: [],                  // Current page stars
    currentPage: 1,             // Current page (1-indexed)
    totalPages: 1,              // Total pages
    itemsPerPage: 100,          // Stars per page
    drawingCanvas: null,        // Canvas element reference
    viewMode: 'draw'            // 'draw' | 'gallery'
  }
};

// Music player state
export const musicState = {
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
  cacheExpiry: PLAYLIST_CACHE_DURATION
};

// Life Stories state (canvas-based story viewer)
export const lifeStoriesState = {
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
