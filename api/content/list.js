/**
 * Vercel Serverless Function: Content Directory Listing
 * Lists markdown files in content/[category]/ folders
 * Route: /api/content/list?category=northstar
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

function extractDate(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const dateMatch = fmMatch[1].match(/^date:\s*(.+)$/m);
      if (dateMatch) return dateMatch[1].trim();
    }
  } catch (e) { /* ignore */ }
  const stat = statSync(filePath);
  return stat.birthtime.toISOString().split('T')[0];
}

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

  const items = readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ file: f, date: extractDate(join(dir, f)) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ items, files: items.map(i => i.file) }));
}
