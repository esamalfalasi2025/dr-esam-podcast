// Create a new subscriber in Supabase via REST API
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
    if (!body.email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };

    // Whitelist fields
    const subscriber = {
      email: body.email,
      name: body.name || null,
      country: body.country || null
    };

    const r = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subscriber)
    });

    const d = await r.json();
    if (!r.ok) {
      if (r.status === 409) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email already subscribed' }) };
      return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || d.hint || 'Insert failed' }) };
    }

    // Send confirmation email (fire and forget)
    const result = Array.isArray(d) ? d[0] : d;
    if (result && result.email) {
      fetch(process.env.URL + '/.netlify/functions/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: result.email, name: result.name })
      }).catch(err => console.error('Email send error:', err));
    }

    return { statusCode: 201, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('subscriber-create error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
