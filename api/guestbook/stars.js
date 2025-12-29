/**
 * Vercel Serverless Function: Guestbook Stars API
 * Handles GET (fetch stars with pagination) and POST (save new star)
 * Route: /api/guestbook/stars?page=1
 *
 * Setup required:
 * 1. Install: npm install @vercel/kv
 * 2. Create Vercel KV database in dashboard
 * 3. Environment variables auto-configured by Vercel
 */

import { kv } from '@vercel/kv';

const ITEMS_PER_PAGE = 100;
const STARS_KEY = 'guestbook:stars';

export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  // GET - Fetch stars with pagination
  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page || '1');

      // Fetch all stars from KV storage
      const allStars = await kv.get(STARS_KEY) || [];

      // Sort by newest first
      const sortedStars = allStars.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Paginate
      const totalPages = Math.ceil(sortedStars.length / ITEMS_PER_PAGE);
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const stars = sortedStars.slice(startIndex, endIndex);

      res.status(200).json({
        stars,
        page,
        totalPages,
        totalStars: sortedStars.length
      });
    } catch (error) {
      console.error('Error fetching stars:', error);
      res.status(500).json({ error: 'Failed to fetch stars' });
    }
    return;
  }

  // POST - Save new star
  if (req.method === 'POST') {
    try {
      const { imageData, width, height } = req.body;

      // Validate
      if (!imageData || !imageData.startsWith('data:image/png;base64,')) {
        res.status(400).json({ error: 'Invalid image data' });
        return;
      }

      // Size limit check (2MB)
      const sizeInBytes = (imageData.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        res.status(400).json({ error: 'Image too large (max 2MB)' });
        return;
      }

      // Create star object
      const star = {
        id: Date.now().toString(),
        imageData,
        width: width || 800,
        height: height || 600,
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      // Fetch existing stars and append
      const allStars = await kv.get(STARS_KEY) || [];
      allStars.push(star);

      // Save back to KV
      await kv.set(STARS_KEY, allStars);

      res.status(201).json({ success: true, id: star.id });
    } catch (error) {
      console.error('Error saving star:', error);
      res.status(500).json({ error: 'Failed to save star' });
    }
    return;
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
