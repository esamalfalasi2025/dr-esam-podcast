// Delete an episode from Supabase
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };

    const body = JSON.parse(event.body || '{}');
    if (!body.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Episode ID is required' }) };

    const r = await fetch(`${supabaseUrl}/rest/v1/episodes?id=eq.${body.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!r.ok) {
      const d = await r.json();
      return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || 'Delete failed' }) };
    }

    return { statusCode: 204, headers, body: '' };

  } catch (err) {
    console.error('episode-delete error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
