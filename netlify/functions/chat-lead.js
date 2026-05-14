// Save chatbot-initiated leads to service_requests
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
    const { first_name, last_name, email, service_name, service_key, message } = JSON.parse(event.body);

    // Validate required fields
    if (!first_name || !email || !service_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'first_name, email, and service_name required' })
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

    const record = {
      first_name,
      last_name: last_name || '',
      email,
      subject: service_key || service_name.toLowerCase().replace(/\s+/g, '-'),
      service_key: service_key || service_name.toLowerCase().replace(/\s+/g, '-'),
      service_name,
      price_aed: 0,  // Pricing determined during sales process
      cost_aed: 0,
      markup_aed: 0,
      status: 'discussion',  // Starts as discussion, admin moves to agreed/done
      created_at: new Date().toISOString()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/service_requests`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error(`Supabase save failed (${res.status}):`, errData);
      throw new Error(`Supabase error: ${res.status}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Lead captured' })
    };
  } catch (err) {
    console.error('chat-lead error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
