// Get site content (settings, hero, about, platforms, services) from Supabase
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Supabase credentials' })
    };
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_content?key=eq.main&select=value`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.status}`);
    }

    const rows = await res.json();
    const content = rows.length > 0 ? rows[0].value : {};

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(content)
    };
  } catch (err) {
    console.error('content-get error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
