// Polls a Replicate prediction → returns { status, result_url }
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
    const { id, apiKey } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prediction ID is required' }) };

    const key = apiKey || process.env.REPLICATE_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Replicate API key' }) };

    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json'
      }
    });

    const d = await r.json();
    console.log('replicate-status:', r.status, JSON.stringify(d).slice(0, 400));

    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.detail || 'Status check failed' }) };

    // Replicate statuses: starting | processing | succeeded | failed | canceled
    const status = d.status === 'succeeded' ? 'done'
                 : d.status === 'failed'    ? 'error'
                 : d.status === 'canceled'  ? 'error'
                 : 'processing';

    // Output is either a string URL or array with one URL
    const output = d.output;
    const result_url = Array.isArray(output) ? output[0] : (typeof output === 'string' ? output : null);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status,
        result_url,
        raw_status: d.status,
        error: d.error || null
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
