# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal digital garden / portfolio website that simulates the Bear notes app interface. It features:
- An interactive black hole particle simulation background
- Bear-style 3-pane note browser with tag navigation
- OS-style window management system (draggable, resizable windows)
- Music player with YouTube integration
- Tasks/goals viewer
- Static site - no build process required for core functionality

## Development Commands

**Start development server:**
```bash
node dev.js
```
This starts a local server at http://localhost:3000, watches the `/posts` folder for changes, and auto-regenerates `posts.js` when markdown files are added/modified.

**Build posts manifest:**
```bash
node build.js
```
Scans the `/posts` folder and generates `posts.js` with file metadata (creation dates from filesystem).

**Running the site:**
Simply open `index.html` in a browser, or use any static file server. No build step required.

## Architecture

### File Structure
- `index.html` - Main entry point, contains all views (tasks, notes, music)
- `app.js` - Core application logic: note parsing, window management, UI controls
- `background.js` - Black hole particle simulation on canvas
- `styles.css` - All styles including window system, Bear UI, and animations
- `posts.js` - Auto-generated manifest of markdown files (created by `build.js`)
- `posts/` - Markdown notes with Bear-style hashtag tagging
- `music.md` - Music/podcast playlist (YouTube links)
- `goals.md` - Task list with checkboxes

### Key Systems

**Window Management (app.js:36-362)**
- Multi-window system with dragging, resizing, and z-index stacking
- Desktop: supports multiple open windows
- Mobile: single-window mode (auto-closes others)
- All windows use `.view` class with `.active` state
- Resize handles on corners only (`.resize-handle`)

**Bear-Style Note Browser (app.js:599-893)**
- Uses `parsePost()` to extract frontmatter, hashtags, and content from markdown
- Supports nested tags (e.g., `#business/career`)
- Tag hierarchy rendered as collapsible tree
- Posts manifest at `posts.js` includes creation dates from filesystem
- URL routing: `#note/slug` for deep linking to notes

**Black Hole Simulation (background.js)**
- Canvas-based particle physics with gravitational attraction
- 400 particles orbiting the black hole
- Mouse interaction creates repulsion effects
- Celestial bodies (moons/planets) orbit at different speeds
- Frame-limited to 30 FPS for performance

**Music Player (app.js:1349-2087)**
- YouTube iframe API integration
- Folder tabs for categorizing music (Ambience, Music, Podcasts)
- Parses `music.md` for track lists
- Supports both video links and channel links
- Auto-fetches metadata from YouTube oEmbed API

### Data Format

**posts.js format:**
```javascript
export default [
  {
    "file": "My Note.md",
    "created": "2025-01-19"
  }
]
```

**Markdown frontmatter (optional):**
```markdown
---
title: Note Title
date: 2025-01-19
tags: [tag1, tag2]
---
```

**Bear-style hashtags:**
Tags can be placed anywhere in content using `#tagname` or `#parent/child` for nested tags.

**music.md format:**
```markdown
## Music
- [Title - Artist](https://youtube.com/watch?v=...)
- https://youtube.com/watch?v=...

## Podcasts
- [Channel Name](https://youtube.com/@handle)
```

**goals.md format:**
```markdown
# Section Name
- [x] Completed task
- [ ] Pending task
- Regular list item (shows as active)
```

## Important Implementation Details

**Tag System:**
- Hidden tags (defined in `hiddenTags` array) are excluded from sidebar
- Currently: `status` tag is hidden
- Nested tags use `/` separator and render as collapsible tree
- Tag icons defined in `tagIcons` object using Lucide SVG paths

**Particle Simulation:**
- Uses vis-viva equation for orbital mechanics (background.js:86)
- Particles stabilized with tangential velocity correction (background.js:350-359)
- Event horizon fading and accretion disk swirl effects
- Edge fade system prevents harsh cutoff at viewport boundaries

**Window Dragging:**
- Only draggable by titlebar, not by interactive elements
- Position stored as `left`/`top` CSS properties, not transforms
- Z-index managed via `state.windows.highestZIndex`

**Note URL Routing:**
- Format: `#note/slug` where slug is filename converted to URL-safe format
- `filenameToSlug()` converts spaces and special chars to hyphens
- `getNoteFromUrl()` parses hash and finds matching post
- History API used for navigation without page reloads

## Development Workflow

1. Add new markdown files to `/posts` folder
2. Run `node dev.js` to auto-rebuild `posts.js` on changes
3. Use Bear-style hashtags for organization: `#business/ideas`, `#writing`, etc.
4. First H1 in markdown becomes the note title (if no frontmatter)
5. Hashtags are automatically stripped from displayed content

## Content Sources

- Weather: Open-Meteo API (free, no key required) for Atlanta, GA
- Music metadata: YouTube oEmbed API
- Background image: `images/bg.jpg` (customizable via CSS variable `--bg-image`)
