# Flight Board Theme - Implementation Summary

## What Was Built

The Flight Board theme has been successfully implemented as the new default site at the root (`/`), with the original Lumos/garden theme preserved at `/v1/`.

## File Structure

### New Files Created

**Root Level (V2 - Flight Board):**
- `index.html` - Flight Board homepage with flipboard UI
- `work.html` - Archive page showing all flights
- `about.html` - About page with bio and social links
- `flipboard.css` - Solari board aesthetic (dark bg, amber accents, JetBrains Mono font)
- `flipboard.js` - Tab switching and flight rendering logic
- `flights.md` - Content source for flight entries
- `flights.js` - Auto-generated manifest from flights.md

**V1 Directory (Lumos Theme):**
- `v1/index.html` - Original Lumos/garden site with updated asset paths

### Modified Files

- `build/build.js` - Added flights manifest generation
- `build/dev.js` - Added flights watcher and build function
- `js/build/manifest-builder.js` - Added `buildFlightsManifest()` function
- `styles.css` - Added theme switcher styles
- `vercel.json` - Added rewrites for `/work`, `/about`, and `/v1`
- `v1/index.html` - Updated asset paths to use `../` and added theme switcher

## Features Implemented

### 1. Flight Board UI (V2 Default)
- **Homepage (`/`)**: Three-tab flipboard interface
  - IN FLIGHT - Active projects
  - ARRIVED - Completed work
  - CANCELLED - Abandoned projects
- **Work Page (`/work`)**: Archive view showing all flights grouped by status
- **About Page (`/about`)**: Bio, role description, and social links

### 2. Visual Design (Solari Board Aesthetic)
- Background: Near-black (`#0a0a0a`)
- Accent: Amber/yellow (`#fbbf24`)
- Typography: JetBrains Mono (monospaced)
- Minimal layout with generous whitespace
- Split-flap flip animation on tab switching

### 3. Theme Switcher
- Fixed position at bottom-right on all pages
- Shows "V1 | V2" with active state highlighted
- Click V1 → navigate to `/v1/` (Lumos theme)
- Click V2 → navigate to `/` (Flight Board)
- Consistent styling across both themes

### 4. Build System Integration
- `flights.md` parsed into `flights.js` manifest
- Build watches flights.md for changes in dev mode
- Supports markdown links `[Title](url)` and plain text entries
- Parses gate categories (UX, DS, PH, etc.) and descriptions

## Content Format

The `flights.md` file uses this structure:

```markdown
## IN FLIGHT
- [Project Name](url) | Gate | Description
- Another Project | Gate | Description

## ARRIVED
- [Completed Work](url) | Gate | Description

## CANCELLED
- [Abandoned Project](url) | Gate | Description
```

Each flight entry includes:
- **Title**: Project name (required)
- **URL**: Optional link (can be external or internal)
- **Gate**: Category tag like UX, DS, PH (required)
- **Description**: Brief explanation (optional)

## Routing

**Vercel Rewrites:**
- `/` → `index.html` (Flight Board homepage)
- `/work` → `work.html`
- `/about` → `about.html`
- `/v1` → `v1/index.html` (Lumos theme)

**Asset Paths:**
- V2 (root): Direct references (`flipboard.css`, `flipboard.js`, `images/favicon.svg`)
- V1 (v1/): Relative paths (`../styles.css`, `../js/app.js`, `../images/`)

## Development Workflow

1. **Edit flights**: Modify `flights.md` to add/update/remove flights
2. **Auto-rebuild**: Dev server watches and regenerates `flights.js`
3. **Preview**: Visit `http://localhost:3000` for V2 or `http://localhost:3000/v1` for V1
4. **Theme switch**: Use bottom-right switcher to toggle between themes

## Next Steps

To customize the Flight Board:

1. **Update content**: Edit `flights.md` to reflect actual projects
2. **Adjust design**: Modify `flipboard.css` for visual tweaks
3. **Enhance about**: Update `about.html` with your bio and links
4. **Add interactions**: Extend `flipboard.js` for additional features

## Testing

Before deploying:
1. Test all three pages: `/`, `/work`, `/about`
2. Verify theme switcher works in both directions
3. Check mobile responsiveness
4. Ensure V1 theme still functions at `/v1`
5. Verify all flight entries display correctly

## Deployment

The site is ready to deploy to Vercel:
- Build command: `node build/build.js` (already configured)
- All rewrites configured in `vercel.json`
- Both themes will be available immediately
