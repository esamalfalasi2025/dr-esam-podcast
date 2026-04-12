// Update service request status (discussion -> agreed -> done)
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id, status } = JSON.parse(event.body);

    if (!id || !status) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing id or status' })
      };
    }

    // Validate status value
    const validStatuses = ['discussion', 'agreed', 'done'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid status. Must be: discussion, agreed, or done' })
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

    // Update the status
    const res = await fetch(`${supabaseUrl}/rest/v1/service_requests?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error(`Supabase update failed (${res.status}):`, errData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Supabase error: ${errData}` })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Status updated to ${status}`
      })
    };

  } catch (error) {
    console.error('update-request-status error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
