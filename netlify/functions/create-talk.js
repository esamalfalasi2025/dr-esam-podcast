// Creates a D-ID talk using hosted image and audio URLs → returns job ID
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { imageUrl, audioUrl, apiKey } = JSON.parse(event.body || '{}');
    if (!imageUrl || !audioUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageUrl and audioUrl are required' }) };

    const key = apiKey || process.env.DID_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No D-ID API key configured' }) };

    const authHeader = key.startsWith('Basic ') ? key : `Basic ${Buffer.from(key).toString('base64')}`;

    const r = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        source_url: imageUrl,
        script: { type: 'audio', audio_url: audioUrl },
        config:  { fluent: true, pad_audio: 0, result_format: 'mp4' }
      })
    });

    const d = await r.json();
    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.description || d.message || 'D-ID talk creation failed' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ id: d.id, status: d.status }) };

  } catch (err) {
    console.error('create-talk error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
