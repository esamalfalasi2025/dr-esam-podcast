/* ============================================================
   Netlify Function: search-images
   Searches Wikipedia for topic-relevant images using the
   MediaWiki API — no additional API keys required.
   ============================================================ */

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { subject } = body;

  // Derive 3 queries directly from the subject (no Claude needed — saves 3+ seconds)
  const words = subject.trim().split(/\s+/);
  const queries = [
    subject,
    words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : subject + ' concept',
    words.length > 1 ? words.slice(-Math.ceil(words.length / 2)).join(' ') : subject + ' science'
  ];

  const UA = 'DrEsamPodcastAdmin/1.0 (dresampodcast.netlify.app)';

  async function downloadImage(url) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) return null;
      const contentType = r.headers.get('content-type') || '';
      const buf    = Buffer.from(await r.arrayBuffer());
      const base64 = buf.toString('base64');
      const type   = contentType.includes('png') ? 'png' : 'jpeg';
      return { base64, type };
    } catch (_) { return null; }
  }

  // Get image URL from a Wikipedia article title via MediaWiki pageimages API
  async function getImageUrlForTitle(title) {
    try {
      const enc = encodeURIComponent(title);
      const r = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${enc}&prop=pageimages&pithumbsize=700&pilimit=1&format=json&origin=*`,
        { headers: { 'User-Agent': UA } }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const pages = Object.values(d.query?.pages || {});
      return pages[0]?.thumbnail?.source || null;
    } catch (_) { return null; }
  }

  // Search Wikipedia and return first article with an image
  async function searchAndGetImage(query) {
    const enc = encodeURIComponent(query.trim());

    // Strategy A: direct REST summary (fastest)
    try {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`,
        { headers: { 'User-Agent': UA } }
      );
      if (r.ok) {
        const d = await r.json();
        const url = d.originalimage?.source || d.thumbnail?.source;
        if (url) {
          const img = await downloadImage(url);
          if (img) return { ...img, caption: d.description || d.title || query, title: d.title || query };
        }
      }
    } catch (_) {}

    // Strategy B: search API → get top 5 results → fetch their image URLs in parallel → download first hit
    try {
      const sr = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc}&srlimit=5&format=json&origin=*`,
        { headers: { 'User-Agent': UA } }
      );
      if (sr.ok) {
        const sd = await sr.json();
        const results = sd.query?.search || [];
        if (results.length === 0) return null;

        // Fetch all image URLs in parallel, then download the first one found
        const imageUrlResults = await Promise.all(
          results.map(res => getImageUrlForTitle(res.title).then(url => ({ url, result: res })))
        );
        for (const { url, result } of imageUrlResults) {
          if (url) {
            const img = await downloadImage(url);
            if (img) return { ...img, caption: result.snippet?.replace(/<[^>]+>/g, '') || query, title: result.title };
          }
        }
      }
    } catch (_) {}

    return null;
  }

  // Fetch all 3 images in parallel
  const results = await Promise.all(queries.map(searchAndGetImage));
  const images = results.filter(Boolean);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ images, count: images.length })
  };
};
