// Service requests analytics - aggregates revenue data by service
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };

  // Date filter from query string: ?from=YYYY-MM-DD&to=YYYY-MM-DD
  const { from, to } = event.queryStringParameters || {};

  // Build Supabase filter
  let url = `${supabaseUrl}/rest/v1/service_requests?select=service_key,service_name,revenue,cost,profit,created_at&order=created_at.desc`;
  if (from) url += `&created_at=gte.${from}T00:00:00Z`;
  if (to)   url += `&created_at=lte.${to}T23:59:59Z`;

  try {
    const res = await fetch(url, {
      headers: {
        'apikey':        supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept':        'application/json'
      }
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('Unexpected response from Supabase');

    // Aggregate by service_key
    const grouped = {};
    rows.forEach(r => {
      const k = r.service_key;
      if (!grouped[k]) {
        grouped[k] = {
          service_key:  k,
          service_name: r.service_name,
          count:        0,
          revenue:      0,
          cost:         0,
          markup:       0
        };
      }
      grouped[k].count   += 1;
      grouped[k].revenue += Number(r.revenue);
      grouped[k].cost    += Number(r.cost);
      grouped[k].markup  += Number(r.profit);
    });

    const services = Object.values(grouped);
    const totalRevenue = services.reduce((s, g) => s + g.revenue, 0);

    // Add % of total to each entry
    services.forEach(g => {
      g.pct = totalRevenue > 0 ? ((g.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
    });

    // Sort by revenue descending
    services.sort((a, b) => b.revenue - a.revenue);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ services, totalRevenue, totalRows: rows.length })
    };
  } catch (err) {
    console.error('service-requests error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
