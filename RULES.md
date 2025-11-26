# Codebase Rules

Concise guide for maintaining consistency and preventing accidental overwrites when building new features.

## Codebase Outline

### Core Files
- `index.html` - Main entry point, contains all view structures (tasks, notes, timeline, music)
- `app.js` - Core application logic: note parsing, window management, UI controls, music player
- `background.js` - Black hole particle simulation on canvas (IIFE pattern)
- `styles.css` - All styles including window system, Bear UI, animations, responsive design
- `timeline-background.js` - Timeline-specific background effects

### Content Files
- `posts.js` - Auto-generated manifest of markdown files (created by `build.js`)
- `posts/` - Markdown notes with Bear-style hashtag tagging (`#tag` or `#parent/child`)
- `music.md` - Music/podcast playlist (YouTube links, folder sections)
- `goals.md` - Task list with checkboxes (`- [x]` or `- [ ]`)

### Build Scripts
- `dev.js` - Development server with auto-rebuild of `posts.js` on file changes
- `build.js` - Scans `/posts` folder and generates `posts.js` manifest

### Assets
- `images/` - Static images (bg.jpg, icons, cursors, og-header.png)

## Goals & Principles

**Primary Purpose:** Personal digital garden/portfolio combining notes, goals, music, and career timeline.

**Design Philosophy:**
- Bear-style 3-pane note browser interface
- OS-like window management (draggable, resizable, multi-window on desktop)
- Content-first: Markdown-driven, minimal build process
- Static site: No framework dependencies, pure HTML/CSS/JS

**Content Approach:**
- Markdown files in `/posts` are the source of truth
- Bear-style hashtags (`#tag`) for organization
- Nested tags supported (`#parent/child`)
- Frontmatter optional (title, date, tags)

## Style Guidelines

**Code Style:**
- Vanilla JavaScript (ES6+), no frameworks
- IIFE pattern for isolated modules (e.g., `background.js`)
- Functional approach with clear separation of concerns

**Naming Conventions:**
- Functions: `camelCase` (e.g., `setupWindowManagement()`)
- CSS classes: `kebab-case` (e.g., `.window-titlebar`)
- Constants: `camelCase` for objects, `UPPER_SNAKE_CASE` for primitives
- State objects: `state`, `musicState`, `elements`

**File Organization:**
- Single responsibility per file
- Major systems grouped in `app.js` with clear section comments
- Utility functions near their usage

**Comment Standards:**
- JSDoc-style comments for major functions
- Section dividers for code organization (`// ==========================================`)
- Inline comments for complex logic

## Tech Stack

**Core:**
- HTML5, CSS3, Vanilla JavaScript (ES6+)
- Canvas API for particle simulation
- History API for URL routing

**External APIs:**
- YouTube Iframe API (music player)
- Open-Meteo Weather API (free, no key required)

**Build Tools:**
- Node.js scripts (`dev.js`, `build.js`) for content generation only
- No build step required for core functionality

**Dependencies:**
- None - pure static site
- External fonts: Google Fonts (Doto)

## Key Functions (Do Not Overwrite)

### Window Management (`app.js`)

**`setupWindowManagement()`** - Initializes draggable/resizable windows, handles mobile/desktop differences

**`makeWindowDraggable(window, titlebar)`** - Handles window dragging by titlebar only, prevents dragging from interactive elements

**`makeWindowResizable(window)`** - Handles window resizing via corner handles, enforces minimum dimensions

**`toggleWindow(windowId)`** - Opens/closes windows, manages mobile single-window mode (closes others automatically)

**`bringWindowToFront(window)`** - Z-index management for window stacking

**`openWindow(windowId)` / `closeWindow(window)`** - Core window state management

### Note System (`app.js`)

**`parsePost(content, filename, createdDate)`** - Extracts frontmatter, hashtags, and content from markdown. Supports YAML frontmatter and Bear-style hashtags. **Critical:** Preserves nested tag format (`#parent/child`)

**`buildTagNav()`** - Builds hierarchical tag navigation tree from posts. Handles nested tags, tag icons, and expanded/collapsed state

**`renderNote(post, updateUrl)`** - Renders note content with markdown parsing. Updates URL for deep linking

**`getNoteFromUrl()` / `updateNoteUrl(post)`** - URL routing for deep linking. Format: `#note/slug` where slug is filename converted to URL-safe format

**`parseMarkdown(text)`** - Lightweight markdown parser. Handles headers, lists, links, images, code blocks, blockquotes

**`filenameToSlug(filename)`** - Converts filename to URL-safe slug (spaces → hyphens, lowercase)

### Particle Simulation (`background.js`)

**`createParticle()`** - Generates particles with orbital mechanics using vis-viva equation for stable circular motion

**`animate()`** - Main animation loop (frame-limited to 24 FPS). Handles gravitational forces, orbital stabilization, mouse interaction, particle lifecycle

**Core Physics:** Gravitational attraction, orbital velocity correction, accretion disk swirl effects, event horizon fading

### Music Player (`app.js`)

**`loadMusic()`** - Loads and parses `music.md`, enriches metadata, initializes YouTube API

**`playTrack(index)`** - Plays YouTube video via iframe API, updates UI state

**`ensureYouTubePlayer(videoId)`** - Manages YouTube API initialization and player creation

**`parseMusicMd(content)`** - Parses markdown format: `## Folder` sections and `- [Title - Artist](url)` or plain URLs

**`enrichTrackMetadata(tracks)`** - Fetches YouTube metadata via oEmbed API for tracks missing artist/title

### State Management

**`state` object** - Global application state (posts, tags, current views, window tracking)

**`musicState` object** - Music player state (tracks, current index, player instance, API readiness)

**`elements` object** - Cached DOM element references

## Rules for Building

### Window System
- **Never modify** core window management logic without understanding mobile single-window mode
- Always test both desktop (multi-window) and mobile (single-window) behavior
- Preserve z-index management system (`state.windows.highestZIndex`)
- Window dragging only works on titlebar, not interactive elements

### Tag System
- **Always preserve** tag hierarchy system when adding new tag features
- Nested tags use `/` separator: `#parent/child`
- Hidden tags defined in `hiddenTags` array (currently: `status`)
- Tag icons defined in `tagIcons` object using Lucide SVG paths
- Tag expansion state managed in `state.expandedTags` Set

### Particle Simulation
- **Maintain performance:** 24 FPS limit, max 400 particles
- Never modify orbital mechanics calculations (vis-viva equation)
- Preserve frame rate limiting (`frameDelay = 1000 / 24`)
- Edge fade system prevents harsh cutoff at viewport boundaries

### Markdown Parsing
- **Keep compatible** with Bear-style hashtags (`#tag` anywhere in content)
- Support both YAML frontmatter and inline hashtags
- Preserve nested tag format (`#parent/child`)
- Hashtags are stripped from displayed content but preserved in metadata

### URL Routing
- **Preserve format:** `#note/slug` for deep linking
- Slug conversion: spaces → hyphens, lowercase, remove special chars
- History API used for navigation without page reloads
- `getNoteFromUrl()` must handle URL parsing correctly

### Mobile Responsiveness
- **Always test** mobile responsiveness when adding new views or windows
- Mobile breakpoint: `768px` (checked via `isMobile()`)
- Single-window mode enforced on mobile (auto-closes others)
- Sidebar collapses on mobile with hamburger menu

### Content Structure
- Posts manifest format: `{ file: "Name.md", created: "YYYY-MM-DD" }`
- Markdown files in `/posts` are source of truth
- `build.js` scans filesystem for creation dates
- `dev.js` watches `/posts` folder for changes

### Performance
- Particle simulation: 24 FPS cap, 400 max particles
- Lazy loading for images (`loading="lazy"`)
- Frame rate limiting prevents excessive CPU usage
- Debounce resize handlers if adding new ones

## Reference

For detailed implementation notes, see `CLAUDE.md`.

