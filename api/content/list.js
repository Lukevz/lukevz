/**
 * Vercel Serverless Function: Content Directory Listing
 * Lists markdown files in content/[category]/ folders
 * Route: /api/content/list?category=northstar
 */
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

export default function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const category = url.searchParams.get('category');

  if (!category || /[./\\]/.test(category)) {
    res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid category' }));
    return;
  }

  const dir = join(rootDir, 'content', category);
  if (!existsSync(dir)) {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ files: [] }));
    return;
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ files }));
}
