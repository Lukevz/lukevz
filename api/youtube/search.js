/**
 * Vercel Serverless Function: YouTube Search API
 * Proxies YouTube Data API v3 search requests
 */
export default async function handler(req, res) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'YouTube API key not configured' });
    return;
  }

  const { q, maxResults = '5', preferOfficial = 'false', artists = '' } = req.query;

  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  try {
    let query = q;

    // Add "official" to query if preferOfficial is true
    if (preferOfficial === 'true') {
      query += ' official';
    }

    // Add artists to query if provided
    if (artists) {
      query += ` ${artists}`;
    }

    const youtubeUrl =
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;

    const response = await fetch(youtubeUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      res.status(response.status).json({
        error: 'YouTube API request failed',
        details: errorText
      });
      return;
    }

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(500).json({
      error: 'Failed to search YouTube',
      message: error.message
    });
  }
}
