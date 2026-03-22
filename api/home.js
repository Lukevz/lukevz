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

  // Infer theme from Sec-CH-Prefers-Color-Scheme (Chrome/Edge); default light
  const colorScheme = req.headers['sec-ch-prefers-color-scheme'];
  const preferDark = colorScheme === 'dark';
  const ogImage = `${base}/images/${preferDark ? 'og_dark' : 'og_light'}.png`;

  let html;
  try {
    html = readFileSync(join(__dirname, '..', 'index.html'), 'utf-8');
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
  res.setHeader('Vary', 'Sec-CH-Prefers-Color-Scheme');
  res.send(html);
}
