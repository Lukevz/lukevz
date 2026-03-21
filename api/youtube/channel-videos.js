/**
 * Vercel Serverless Function: YouTube Channel Videos
 * Fetches all public uploads from a YouTube channel
 * Route: /api/youtube/channel-videos?handle=lukevanzylofficial
 */
// Parse ISO 8601 duration string → seconds
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'YouTube API key not configured' });
    return;
  }

  const handle = req.query.handle || 'lukevanzylofficial';

  try {
    // Step 1: Get channel's uploads playlist ID
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&forHandle=${handle}&key=${apiKey}`
    );
    const channelData = await channelRes.json();

    if (!channelData.items?.length) {
      res.status(404).json({ error: `Channel @${handle} not found` });
      return;
    }

    const channel = channelData.items[0];
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    const channelTitle = channel.snippet.title;

    // Step 2: Paginate through uploads playlist
    const videos = [];
    let pageToken = null;

    do {
      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems?` +
        `part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}` +
        (pageToken ? `&pageToken=${pageToken}` : '');

      const pageRes = await fetch(url);
      const pageData = await pageRes.json();

      if (!pageRes.ok) {
        res.status(pageRes.status).json(pageData);
        return;
      }

      for (const item of pageData.items || []) {
        const sn = item.snippet;
        if (sn.title === 'Private video' || sn.title === 'Deleted video') continue;
        videos.push({
          videoId: sn.resourceId.videoId,
          title: sn.title,
          description: sn.description,
          publishedAt: sn.publishedAt.split('T')[0],
          thumbnail: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || ''
        });
      }

      pageToken = pageData.nextPageToken || null;
    } while (pageToken);

    // Filter out Shorts: batch-fetch durations, drop videos < 3 minutes
    const allIds = videos.map(v => v.videoId);
    const durationMap = {};
    for (let i = 0; i < allIds.length; i += 50) {
      const batch = allIds.slice(i, i + 50).join(',');
      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch}&key=${apiKey}`
      );
      const detailData = await detailRes.json();
      for (const item of detailData.items || []) {
        durationMap[item.id] = parseDuration(item.contentDetails.duration);
      }
    }
    const longform = videos.filter(v => (durationMap[v.videoId] || 0) >= 180);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ videos: longform, channelTitle });
  } catch (error) {
    console.error('Channel videos error:', error);
    res.status(500).json({ error: 'Failed to fetch channel videos', message: error.message });
  }
}
