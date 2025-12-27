#!/usr/bin/env node
/**
 * Dev server with auto-rebuild
 * Watches /posts folder and regenerates posts.js on changes
 */

import { readdirSync, writeFileSync, watch, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { URL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, 'posts');
const thoughtTrainDir = join(__dirname, 'thought-train');
const labsDir = join(__dirname, 'labs');
const soundsDir = join(__dirname, 'sounds');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm'
};

// Build posts.js
function buildPosts() {
  const files = readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // Get creation dates for each file
  const posts = files.map(file => {
    const filePath = join(postsDir, file);
    const stats = statSync(filePath);
    // Use birthtime (creation date) and format as YYYY-MM-DD
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Posts Manifest (auto-generated)
 * Using object format with created dates from filesystem
 */
export default ${JSON.stringify(posts, null, 2)};
`;

  writeFileSync(join(__dirname, 'posts.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt posts.js (${files.length} posts)`);
}

// Build thought-trains.js
function buildThoughtTrains() {
  const files = readdirSync(thoughtTrainDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // Get creation dates for each file
  const thoughtTrains = files.map(file => {
    const filePath = join(thoughtTrainDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Thought Trains Manifest (auto-generated)
 * Using object format with created dates from filesystem
 */
export default ${JSON.stringify(thoughtTrains, null, 2)};
`;

  writeFileSync(join(__dirname, 'thought-trains.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt thought-trains.js (${files.length} thought trains)`);
}

// Build labs.js
function buildLabs() {
  if (!existsSync(labsDir)) return;

  const files = readdirSync(labsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const labs = files.map(file => {
    const filePath = join(labsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Labs Manifest (auto-generated)
 */
export default ${JSON.stringify(labs, null, 2)};
`;

  writeFileSync(join(__dirname, 'labs.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt labs.js (${files.length} labs)`);
}

// Build sounds.js
function buildSounds() {
  if (!existsSync(soundsDir)) return;

  // Common audio formats
  const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac', '.webm'];
  const files = readdirSync(soundsDir)
    .filter(file => audioExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .sort();

  const sounds = files.map(file => {
    const filePath = join(soundsDir, file);
    const stats = statSync(filePath);
    const created = stats.birthtime.toISOString().split('T')[0];
    return { file, created };
  });

  const content = `/**
 * Sounds Manifest (auto-generated)
 * Lists all audio files in the sounds/ directory
 */
export default ${JSON.stringify(sounds, null, 2)};
`;

  writeFileSync(join(__dirname, 'sounds.js'), content);
  console.log(`\x1b[32m✓\x1b[0m Rebuilt sounds.js (${files.length} sounds)`);
}

// Initial build
buildPosts();
buildThoughtTrains();
buildLabs();
buildSounds();

// Watch for changes in posts
console.log(`\x1b[90m◉ Watching /posts for changes...\x1b[0m`);
watch(postsDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.md')) {
    console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
    buildPosts();
  }
});

// Watch for changes in thought-train
console.log(`\x1b[90m◉ Watching /thought-train for changes...\x1b[0m`);
watch(thoughtTrainDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.md')) {
    console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
    buildThoughtTrains();
  }
});

// Watch for changes in labs
if (existsSync(labsDir)) {
  console.log(`\x1b[90m◉ Watching /labs for changes...\x1b[0m`);
  watch(labsDir, { recursive: true }, (eventType, filename) => {
    if (filename?.endsWith('.md')) {
      console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
      buildLabs();
    }
  });
}

// Watch for changes in sounds
if (existsSync(soundsDir)) {
  console.log(`\x1b[90m◉ Watching /sounds for changes...\x1b[0m`);
  const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac', '.webm'];
  watch(soundsDir, { recursive: true }, (eventType, filename) => {
    if (filename && audioExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
      console.log(`\x1b[90m  Changed: ${filename}\x1b[0m`);
      buildSounds();
    }
  });
}

// Load music config for Spotify API proxy (lazy load)
let musicConfig = null;
let musicConfigPromise = null;

async function loadMusicConfig() {
  if (musicConfig !== null) return musicConfig;
  if (musicConfigPromise) return musicConfigPromise;

  musicConfigPromise = (async () => {
    try {
      const configPath = join(__dirname, 'music-config.js');
      if (existsSync(configPath)) {
        // Use pathToFileURL for proper file:// URL conversion
        const configUrl = pathToFileURL(configPath).href;
        const configModule = await import(configUrl);
        musicConfig = configModule.default;
        return musicConfig;
      }
    } catch (err) {
      console.log('\x1b[90m  Note: music-config.js not found or invalid:\x1b[0m', err.message);
    }
    musicConfig = false; // Mark as attempted
    return null;
  })();

  return musicConfigPromise;
}

// Spotify API proxy endpoints
async function handleSpotifyProxy(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return true;
  }

  // Spotify token endpoint
  if (path === '/api/spotify/token' && req.method === 'POST') {
    const config = await loadMusicConfig();
    if (!config || !config.spotify) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Spotify config not found' }));
      return true;
    }

    try {
      const credentials = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      const data = await response.json();

      if (!response.ok) {
        res.writeHead(response.status, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return true;
      }

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return true;
    } catch (error) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return true;
    }
  }

  // Spotify playlist endpoint
  if (path.startsWith('/api/spotify/playlist/') && req.method === 'GET') {
    const playlistId = path.split('/api/spotify/playlist/')[1];
    const token = url.searchParams.get('token');

    if (!token) {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Token required' }));
      return true;
    }

    try {
      // Fetch playlist details
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const playlistData = await playlistResponse.json();

      if (!playlistResponse.ok) {
        res.writeHead(playlistResponse.status, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(playlistData));
        return true;
      }

      // Fetch all tracks (handle pagination)
      let allTracks = [];
      let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

      while (nextUrl) {
        const tracksResponse = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!tracksResponse.ok) {
          const errorData = await tracksResponse.json();
          res.writeHead(tracksResponse.status, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(errorData));
          return true;
        }

        const tracksData = await tracksResponse.json();
        allTracks = allTracks.concat(tracksData.items);
        nextUrl = tracksData.next;
      }

      // Format tracks
      const tracks = allTracks
        .filter(item => item.track && !item.track.is_local)
        .map(item => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map(a => a.name),
          album: item.track.album.name,
          duration_ms: item.track.duration_ms,
          spotify_url: item.track.external_urls.spotify,
          image: item.track.album.images[0]?.url
        }));

      const result = {
        name: playlistData.name,
        description: playlistData.description,
        tracks: tracks
      };

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;
    } catch (error) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return true;
    }
  }

  // YouTube search endpoint
  if (path === '/api/youtube/search' && req.method === 'GET') {
    const config = await loadMusicConfig();
    if (!config || !config.youtube || !config.youtube.apiKey) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'YouTube API key not found in config' }));
      return true;
    }

    const query = url.searchParams.get('q');
    const maxResults = url.searchParams.get('maxResults') || '5';
    const preferOfficial = url.searchParams.get('preferOfficial') === 'true';
    const artists = url.searchParams.get('artists') || '';

    if (!query) {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
      return true;
    }

    try {
      const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${config.youtube.apiKey}`;

      const response = await fetch(youtubeUrl, {
        headers: {
          'Referer': 'http://localhost:3000/'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        res.writeHead(response.status, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return true;
      }

      if (!data.items || data.items.length === 0) {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ items: [] }));
        return true;
      }

      // Prefer official content if requested
      let selectedVideo = null;
      if (preferOfficial && artists) {
        const artistList = artists.split(',').map(a => a.trim().toLowerCase());
        const officialMarkers = ['official', 'vevo', 'topic', ...artistList];
        
        selectedVideo = data.items.find(item => {
          const title = item.snippet.title.toLowerCase();
          const channel = item.snippet.channelTitle.toLowerCase();
          return officialMarkers.some(marker => title.includes(marker) || channel.includes(marker));
        });
      }

      // Use first result if no official found
      if (!selectedVideo && data.items.length > 0) {
        selectedVideo = data.items[0];
      }

      if (selectedVideo) {
        const result = {
          videoId: selectedVideo.id.videoId,
          title: selectedVideo.snippet.title,
          thumbnail: selectedVideo.snippet.thumbnails.high?.url || selectedVideo.snippet.thumbnails.default?.url
        };
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(null));
      }
      return true;
    } catch (error) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return true;
    }
  }

  // YouTube playlist endpoint
  if (path.startsWith('/api/youtube/playlist/') && req.method === 'GET') {
    const playlistId = path.split('/api/youtube/playlist/')[1].split('?')[0];
    const config = await loadMusicConfig();

    if (!config || !config.youtube || !config.youtube.apiKey) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'YouTube API key not found in config' }));
      return true;
    }

    try {
      // Fetch all playlist items with pagination
      let allItems = [];
      let nextPageToken = null;
      const maxResultsPerPage = 50; // YouTube API max

      do {
        let playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?` +
          `part=snippet,contentDetails&maxResults=${maxResultsPerPage}&playlistId=${playlistId}&key=${config.youtube.apiKey}`;

        if (nextPageToken) {
          playlistUrl += `&pageToken=${nextPageToken}`;
        }

        const response = await fetch(playlistUrl, {
          headers: {
            'Referer': 'http://localhost:3000/'
          }
        });
        const data = await response.json();

        if (!response.ok) {
          res.writeHead(response.status, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return true;
        }

        if (data.items) {
          allItems = allItems.concat(data.items);
        }

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      // Transform to track format matching existing structure
      // Filter out deleted/private videos
      const tracks = allItems
        .filter(item =>
          item.snippet &&
          item.contentDetails &&
          item.snippet.title !== 'Deleted video' &&
          item.snippet.title !== 'Private video'
        )
        .map(item => ({
          videoId: item.contentDetails.videoId,
          title: item.snippet.title,
          artist: item.snippet.videoOwnerChannelTitle || 'YouTube',
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
          position: item.snippet.position
        }));

      const result = {
        playlistId: playlistId,
        tracks: tracks,
        totalCount: tracks.length
      };

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;
    } catch (error) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return true;
    }
  }

  return false;
}

// Simple static server
const server = createServer(async (req, res) => {
  // Handle API proxy endpoints first
  const handled = await handleSpotifyProxy(req, res);
  if (handled) return;

  const decodedUrl = decodeURIComponent(req.url);
  let filePath = join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' || HOST === '127.0.0.1' ? 'localhost' : HOST;
  console.log(`\n\x1b[1m  Digital Garden\x1b[0m`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m`);
  console.log(`  \x1b[36m➜\x1b[0m  http://${displayHost}:${PORT}`);
  console.log(`\x1b[90m  ─────────────────────────\x1b[0m\n`);
});
