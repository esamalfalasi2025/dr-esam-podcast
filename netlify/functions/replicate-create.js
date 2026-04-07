// Submits a SadTalker prediction to Replicate → returns prediction ID
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const MODEL_VERSION = '3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { imageUrl, audioUrl, apiKey } = JSON.parse(event.body || '{}');
    if (!imageUrl || !audioUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageUrl and audioUrl are required' }) };

    const key = apiKey || process.env.REPLICATE_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Replicate API key' }) };

    const body = {
      version: MODEL_VERSION,
      input: {
        source_image: imageUrl,
        driven_audio: audioUrl,
        enhancer: 'gfpgan',
        preprocess: 'full',
        still_mode: true,
        expression_scale: 1
      }
    };

    console.log('replicate-create request:', JSON.stringify(body));

    const r = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=5'
      },
      body: JSON.stringify(body)
    });

    const d = await r.json();
    console.log('replicate-create response:', r.status, JSON.stringify(d).slice(0, 400));

    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.detail || d.error || 'Prediction creation failed' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ id: d.id, status: d.status }) };

  } catch (err) {
    console.error('replicate-create error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
