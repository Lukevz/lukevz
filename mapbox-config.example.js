/**
 * Mapbox public access token configuration.
 *
 * Setup:
 *  1. Create a free account at https://mapbox.com
 *  2. Go to Account → Access tokens
 *  3. Create a new Public token and restrict it to your domain:
 *     - Allowed URLs: https://lukevz.com, http://localhost:3000
 *  4. Copy this file to mapbox-config.js (which is gitignored)
 *  5. Replace the placeholder below with your real token
 *
 * In production (Vercel), set MAPBOX_PUBLIC_TOKEN as an environment variable:
 *   Vercel Dashboard → Project → Settings → Environment Variables
 * The /api/mapbox-token endpoint will serve it to the browser automatically.
 * You do NOT need to deploy mapbox-config.js — it is only used locally.
 */
window.MAPBOX_TOKEN = 'pk.your_public_token_here';
