// Save site content (settings, hero, about, platforms, services) to Supabase
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { password, content } = JSON.parse(event.body);

    // Validate password
    const adminPassword = process.env.ADMIN_PASSWORD || 'DrEsam2025';
    if (password !== adminPassword) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid password' })
      };
    }

    if (!content || typeof content !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content must be a JSON object' })
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

    // UPSERT into site_content
    const res = await fetch(`${supabaseUrl}/rest/v1/site_content`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'main',
        value: content,
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error(`Supabase save failed (${res.status}):`, errData);
      throw new Error(`Supabase error: ${res.status}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Content saved' })
    };
  } catch (err) {
    console.error('content-save error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
