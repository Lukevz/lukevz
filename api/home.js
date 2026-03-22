/**
 * Serves the homepage with theme-aware OG image based on Sec-CH-Prefers-Color-Scheme.
 * When clients send this header (Chrome, Edge), we serve the matching og:image.
 * Safari/iMessage don't support it yet, so they get the light default.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'lukevz.com';
  const base = `https://${host}`;

  // Infer theme: prefer Sec-CH-Prefers-Color-Scheme if available,
  // otherwise fall back to time-of-day in Eastern Time (dark 7pm–7am)
  const colorScheme = req.headers['sec-ch-prefers-color-scheme'];
  let preferDark;
  if (colorScheme === 'dark' || colorScheme === 'light') {
    preferDark = colorScheme === 'dark';
  } else {
    const hourET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
    const h = parseInt(hourET, 10);
    preferDark = h >= 19 || h < 7;
  }
  const ogImage = `${base}/images/${preferDark ? 'og_dark' : 'og_light'}.png`;

  let html;
  try {
    html = readFileSync(join(__dirname, '..', '_index.html'), 'utf-8');
  } catch (err) {
    res.status(500).send('Error loading page');
    return;
  }

  // Replace og:image and twitter:image with theme-appropriate URL
  html = html.replace(
    /content="https:\/\/lukevz\.com\/images\/og_(?:light|dark)\.png"/g,
    `content="${ogImage}"`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Accept-CH', 'Sec-CH-Prefers-Color-Scheme');
  res.setHeader('Critical-CH', 'Sec-CH-Prefers-Color-Scheme');
  res.setHeader('Vary', 'Sec-CH-Prefers-Color-Scheme');
  res.send(html);
}
