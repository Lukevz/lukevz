/**
 * Vercel Serverless Function: YouTube Playlist API
 * Proxies YouTube Data API v3 playlist requests
 * Route: /api/youtube/playlist?id=PLAYLIST_ID
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

  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: 'Query parameter "id" is required' });
    return;
  }

  try {
    // Fetch all playlist items with pagination
    let allItems = [];
    let nextPageToken = null;
    const maxResultsPerPage = 50;

    do {
      const youtubeUrl =
        `https://www.googleapis.com/youtube/v3/playlistItems?` +
        `part=snippet,contentDetails&maxResults=${maxResultsPerPage}&playlistId=${id}&key=${apiKey}` +
        (nextPageToken ? `&pageToken=${nextPageToken}` : '');

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
      allItems = allItems.concat(data.items || []);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      items: allItems,
      pageInfo: {
        totalResults: allItems.length,
        resultsPerPage: allItems.length
      }
    });
  } catch (error) {
    console.error('YouTube playlist error:', error);
    res.status(500).json({
      error: 'Failed to fetch YouTube playlist',
      message: error.message
    });
  }
}
