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
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Talk ID is required.' }) };

    const key = apiKey || process.env.DID_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No D-ID API key.' }) };

    const authHeader = key.startsWith('Basic ')
      ? key
      : `Basic ${Buffer.from(key).toString('base64')}`;

    const r = await fetch(`https://api.d-id.com/talks/${id}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    const d = await r.json();
    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.description || d.message || 'Status check failed' }) };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: d.status,         // created | started | done | error
        result_url: d.result_url || null,
        error: d.error || null
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
