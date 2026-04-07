// Create a new episode in Supabase via REST API
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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };

    const body = JSON.parse(event.body || '{}');
    if (!body.title) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Title is required' }) };

    const r = await fetch(`${supabaseUrl}/rest/v1/episodes`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });

    const d = await r.json();
    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || d.hint || 'Insert failed' }) };

    return { statusCode: 201, headers, body: JSON.stringify(Array.isArray(d) ? d[0] : d) };

  } catch (err) {
    console.error('episode-create error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
