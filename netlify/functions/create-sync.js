// Submits a lip-sync job to Sync.so → returns job ID
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

    const key = apiKey || process.env.SYNC_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Sync.so API key configured' }) };

    const body = {
      model: 'lipsync-1.9.0-beta',
      input: [
        { type: 'image', url: imageUrl },
        { type: 'audio', url: audioUrl }
      ],
      options: { output_format: 'mp4' }
    };

    console.log('create-sync request:', JSON.stringify(body));

    const r = await fetch('https://api.sync.so/v2/generate', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const d = await r.json();
    console.log('create-sync response:', r.status, JSON.stringify(d).slice(0, 500));

    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || d.error || d.detail || 'Sync.so job creation failed', raw: d }) };

    return { statusCode: 200, headers, body: JSON.stringify({ id: d.id, status: d.status }) };

  } catch (err) {
    console.error('create-sync error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
