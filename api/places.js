/**
 * Vercel Serverless Function: Places API
 * Fetches a public Google My Maps KML feed, parses it, and returns GeoJSON.
 *
 * Required env var: GOOGLE_MY_MAPS_ID  — the map ID from your My Maps share URL
 *   e.g. https://www.google.com/maps/d/u/0/edit?mid=THIS_IS_THE_ID
 *
 * Response is edge-cached for 1 hour so new pins appear within ~60 minutes.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const mapId = process.env.GOOGLE_MY_MAPS_ID;
  if (!mapId) {
    res.status(500).json({ error: 'GOOGLE_MY_MAPS_ID env var not set' });
    return;
  }

  const kmlUrl = `https://www.google.com/maps/d/kml?forcekml=1&mid=${encodeURIComponent(mapId)}`;

  try {
    const response = await fetch(kmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; lukevz-places/1.0)' }
    });

    if (!response.ok) {
      throw new Error(`Google KML fetch failed: ${response.status}`);
    }

    const kml = await response.text();
    const geojson = parseKmlToGeoJSON(kml);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(geojson);
  } catch (err) {
    console.error('Places API error:', err);
    res.status(500).json({ error: 'Failed to fetch places', message: err.message });
  }
}

/**
 * Minimal KML → GeoJSON converter for Google My Maps Placemarks.
 * Handles: Point coordinates, name, description (CDATA), photos from img tags
 * and gx_media_links ExtendedData, and optional date extraction.
 */
function parseKmlToGeoJSON(kml) {
  const features = [];
  const placemarkRe = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let placemarkMatch;

  while ((placemarkMatch = placemarkRe.exec(kml)) !== null) {
    const block = placemarkMatch[1];

    // Only include Point placemarks (skip lines/polygons)
    const coordsMatch = block.match(/<coordinates>\s*([\-\d.]+),([\-\d.]+)(?:,[\-\d.]*)?\s*<\/coordinates>/);
    if (!coordsMatch) continue;

    const lng = parseFloat(coordsMatch[1]);
    const lat = parseFloat(coordsMatch[2]);
    if (isNaN(lng) || isNaN(lat)) continue;

    const name = extractText(block, 'name') || 'Unnamed place';
    const rawDesc = extractCdata(block, 'description') || extractText(block, 'description') || '';
    const cleanDesc = stripHtml(rawDesc).trim();

    // Photos: first try gx_media_links ExtendedData, then img tags in description
    const photos = extractPhotos(block, rawDesc);

    // Date: look for a pattern like "Month YYYY" or "YYYY-MM-DD" in the description
    const date = extractDate(cleanDesc);

    // Description without the date line (for display)
    const displayDesc = cleanDesc
      .replace(date || '', '')
      .replace(/^\s*\n/, '')
      .trim();

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        name,
        description: displayDesc || null,
        photos: JSON.stringify(photos),
        date: date || null,
      }
    });
  }

  return { type: 'FeatureCollection', features };
}

function extractText(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function extractCdata(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractPhotos(block, rawDesc) {
  const photos = [];

  // gx_media_links: space/newline-separated image URLs in ExtendedData
  const mediaLinksRe = /<Data\s+name=["']gx_media_links["'][^>]*>[\s\S]*?<value>([\s\S]*?)<\/value>/i;
  const mlMatch = block.match(mediaLinksRe);
  if (mlMatch) {
    mlMatch[1].split(/\s+/).filter(u => u.startsWith('http')).forEach(u => photos.push(u));
  }

  // img src in description HTML
  if (!photos.length) {
    const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRe.exec(rawDesc)) !== null) {
      photos.push(imgMatch[1]);
    }
  }

  return photos;
}

function extractDate(text) {
  // ISO date
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  // Month Year: "March 2024", "Jan 2023"
  const months = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
  const my = text.match(new RegExp(`\\b(${months})\\s+(\\d{4})\\b`, 'i'));
  if (my) return `${my[1]} ${my[2]}`;
  return null;
}
