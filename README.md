# Luke van Zyl - Portfolio & Digital Garden

A dual-theme personal site featuring:
- **V2 (Default)**: Flight Board - A minimal Solari-style airport board showing active projects, completed work, and cancelled experiments
- **V1**: Lumos Notes - A Bear-style digital garden with notes, music, labs, and thought trains

## Quick Start

### Run locally

```bash
node build/dev.js
```

Then visit:
- `http://localhost:3000` - Flight Board (V2)
- `http://localhost:3000/v1` - Lumos Digital Garden (V1)

### Build for production

```bash
node build/build.js
```

## Content Management

### Flight Board (V2)
Edit `flights.md` to manage your projects:

```markdown
## IN FLIGHT
- [Project Name](url) | Gate | Description

## ARRIVED
- [Completed Work](url) | Gate | Description

## CANCELLED
- [Abandoned Project](url) | Gate | Description
```

### Digital Garden (V1)
- Notes/posts: `posts/*.md` → `posts.js`
- Thought trains: `thought-train/*.md` → `thought-trains.js`
- Labs: `labs/*.md` → `labs.js`
- Tasks: `goals.md` (or `2026 Goals.md` for year-specific)

## Structure

### V2 - Flight Board (Root)
- `index.html` - Homepage with flipboard UI
- `work.html` - Archive of all flights
- `about.html` - Bio and social links
- `flipboard.css` - Solari board styling
- `flipboard.js` - Flight rendering logic
- `flights.md` - Content source
- `flights.js` - Auto-generated manifest

### V1 - Digital Garden (/v1/)
- `v1/index.html` - Main app
- `styles.css` - App styling
- `js/app.js` - App logic
- `background.js` - Particle simulation
- `cursor-trail.js` - Custom cursor

### Shared
- `build/build.js` - Build all manifests
- `build/dev.js` - Dev server with file watching
- `js/build/manifest-builder.js` - Manifest generation functions
- `vercel.json` - Deployment configuration

## Theme Switcher

Both themes include a bottom-right switcher to toggle between V1 and V2.

## Deploy

Vercel configuration is included. Both themes deploy together:
- Build command: `node build/build.js`
- Output directory: `.` (root)
- Rewrites configured for clean URLs (`/work`, `/about`, `/v1`)
