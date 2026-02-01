/**
 * Google Books API Proxy (Vercel Serverless Function)
 * Endpoint: /api/books/search?title=...&author=...
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { title, author } = req.query;

  if (!title || !author) {
    res.status(400).json({ error: 'Query parameters "title" and "author" are required' });
    return;
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Google Books API key not configured' });
    return;
  }

  try {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    // Extract cover image from first result
    const result = {
      cover: null,
      isbn: null
    };

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      if (book.volumeInfo.imageLinks) {
        result.cover = book.volumeInfo.imageLinks.thumbnail || book.volumeInfo.imageLinks.smallThumbnail;
        // Use HTTPS
        if (result.cover) {
          result.cover = result.cover.replace('http://', 'https://');
        }
      }
      if (book.volumeInfo.industryIdentifiers) {
        const isbn13 = book.volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13');
        if (isbn13) result.isbn = isbn13.identifier;
      }
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
