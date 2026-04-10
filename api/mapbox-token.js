/**
 * Vercel Serverless Function: Mapbox public token
 * Returns the Mapbox public access token from environment variables so it
 * never has to be committed to the repo.
 *
 * Required env var: MAPBOX_PUBLIC_TOKEN
 *   Set this in Vercel → Project → Settings → Environment Variables.
 *   It is a PUBLIC token (starts with pk.) so it is safe to expose to the
 *   browser — secure it with URL restrictions in your Mapbox account dashboard
 *   (allow https://lukevz.com and http://localhost:*).
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'MAPBOX_PUBLIC_TOKEN env var not set' });
    return;
  }

  // Short cache: token rarely changes, but don't cache forever in case it is rotated
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ token });
}
