// Track episode clicks - calls increment_episode_view RPC
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
    const episodeId = body.id;

    if (!episodeId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing episode id' }) };
    }

    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_episode_view`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ episode_id: episodeId })
    });

    if (!r.ok) {
      const err = await r.json();
      console.error('track-episode-click error:', err);
      return { statusCode: r.status, headers, body: JSON.stringify({ error: err.message || 'RPC call failed' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('track-episode-click error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
