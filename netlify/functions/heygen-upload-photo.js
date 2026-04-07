// Uploads a photo to HeyGen → returns talking_photo_id
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

async function fetchWithTimeout(url, opts, ms = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function clearTalkingPhotos(key) {
  try {
    const r = await fetchWithTimeout('https://api.heygen.com/v2/talking_photo', {
      headers: { 'x-api-key': key, 'Accept': 'application/json' }
    }, 5000);
    const d = await r.json();
    console.log('list response:', JSON.stringify(d).slice(0, 400));
    const data = d.data || {};
    const arr = Array.isArray(data) ? data
      : Array.isArray(data.list) ? data.list
      : Array.isArray(data.talking_photo_list) ? data.talking_photo_list
      : [];
    for (const p of arr) {
      const id = p.talking_photo_id || p.id;
      if (!id) continue;
      const dr = await fetchWithTimeout(`https://api.heygen.com/v1/talking_photo/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': key }
      }, 4000);
      console.log('deleted', id, '->', dr.status);
    }
  } catch (e) {
    console.warn('clearTalkingPhotos:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { imageB64, imageMimeType, apiKey } = JSON.parse(event.body || '{}');
    if (!imageB64) return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageB64 is required' }) };

    const key = apiKey || process.env.HEYGEN_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No HeyGen API key' }) };

    await clearTalkingPhotos(key);

    const mimeType = imageMimeType || 'image/jpeg';
    const imageBuffer = Buffer.from(imageB64, 'base64');

    const r = await fetchWithTimeout('https://upload.heygen.com/v1/talking_photo', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': mimeType },
      body: imageBuffer
    }, 15000);

    const d = await r.json();
    console.log('upload result:', r.status, JSON.stringify(d).slice(0, 300));

    if (!r.ok || d.code !== 100) {
      return { statusCode: r.status || 400, headers, body: JSON.stringify({ error: d.msg || d.message || 'Photo upload failed' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ talking_photo_id: d.data.talking_photo_id }) };

  } catch (err) {
    console.error('heygen-upload-photo error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
