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
const STARS_SET_KEY = 'guestbook:stars:set'; // Sorted set for ordering
const STAR_KEY_PREFIX = 'guestbook:star:'; // Individual star data

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check if KV is properly configured
  if (!kv) {
    console.error('Vercel KV is not configured');
    res.status(500).json({
      error: 'Storage not configured',
      detail: 'Vercel KV database is not set up. Please configure it in the Vercel dashboard.'
    });
    return;
  }

  // GET - Fetch stars with pagination
  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page || '1');

      // Get total count and IDs from sorted set (sorted by timestamp, newest first)
      const totalStars = await kv.zcard(STARS_SET_KEY) || 0;

      if (totalStars === 0) {
        res.status(200).json({
          stars: [],
          page: 1,
          totalPages: 0,
          totalStars: 0
        });
        return;
      }

      // Calculate pagination
      const totalPages = Math.ceil(totalStars / ITEMS_PER_PAGE);
      const startIndex = (page - 1) * ITEMS_PER_PAGE;

      // Fetch star IDs from sorted set (reverse order for newest first)
      const starIds = await kv.zrange(STARS_SET_KEY, startIndex, startIndex + ITEMS_PER_PAGE - 1, {
        rev: true
      });

      // Fetch individual star data
      const stars = [];
      for (const starId of starIds) {
        const star = await kv.get(`${STAR_KEY_PREFIX}${starId}`);
        if (star) {
          stars.push(star);
        }
      }

      res.status(200).json({
        stars,
        page,
        totalPages,
        totalStars
      });
    } catch (error) {
      console.error('Error fetching stars:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        error: 'Failed to fetch stars',
        detail: error.message
      });
    }
    return;
  }

  // POST - Save new star
  if (req.method === 'POST') {
    try {
      const { imageData, width, height } = req.body;

      // Validate
      if (!imageData || !imageData.startsWith('data:image/png;base64,')) {
        console.error('Invalid image data format');
        res.status(400).json({ error: 'Invalid image data' });
        return;
      }

      // Size limit check (2MB per star)
      const sizeInBytes = (imageData.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        console.error('Image too large:', sizeInBytes);
        res.status(400).json({ error: 'Image too large (max 2MB)' });
        return;
      }

      // Create star ID and object
      const timestamp = Date.now();
      const starId = timestamp.toString();

      const star = {
        id: starId,
        imageData,
        width: width || 800,
        height: height || 600,
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      console.log('Saving star to KV...', { id: starId, size: sizeInBytes });

      // Store star data individually
      await kv.set(`${STAR_KEY_PREFIX}${starId}`, star);

      // Add to sorted set (score = timestamp for chronological ordering)
      await kv.zadd(STARS_SET_KEY, { score: timestamp, member: starId });

      console.log('Star saved successfully:', starId);

      res.status(201).json({ success: true, id: starId });
    } catch (error) {
      console.error('Error saving star:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        error: 'Failed to save star',
        detail: error.message
      });
    }
    return;
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
