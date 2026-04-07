// Analytics summary - aggregates data for dashboard
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };

    // 1. Total pageviews & pageviews by date
    const pvRes = await fetch(`${supabaseUrl}/rest/v1/pageviews?select=visited_at&order=visited_at.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });
    const pvData = await pvRes.json();
    const totalPageviews = Array.isArray(pvData) ? pvData.length : 0;

    // Group pageviews by date (store both ISO and display format)
    const pageviewsByDate = {};
    const pageviewsByDateISO = {};
    if (Array.isArray(pvData)) {
      pvData.forEach(pv => {
        const date = new Date(pv.visited_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dateISO = date.toISOString().split('T')[0]; // YYYY-MM-DD
        pageviewsByDate[dateStr] = (pageviewsByDate[dateStr] || 0) + 1;
        pageviewsByDateISO[dateISO] = (pageviewsByDateISO[dateISO] || 0) + 1;
      });
    }

    // 2. Subscribers by country
    const scRes = await fetch(`${supabaseUrl}/rest/v1/subscribers?select=country&country=not.is.null`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });
    const scData = await scRes.json();
    const subscribersByCountry = Array.isArray(scData)
      ? Object.entries(
          scData.reduce((acc, s) => {
            const c = s.country || 'Unknown';
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {})
        ).map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
      : [];

    // 3. Episode clicks (view_count)
    const ecRes = await fetch(`${supabaseUrl}/rest/v1/episodes?select=id,title,view_count&order=view_count.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });
    const ecData = await ecRes.json();
    const episodeClicks = Array.isArray(ecData) ? ecData : [];

    const summary = {
      totalPageviews,
      pageviewsByDate,
      pageviewsByDateISO,
      totalSubscribers: scData.length || 0,
      countriesReached: subscribersByCountry.length,
      subscribersByCountry,
      episodeClicks
    };

    return { statusCode: 200, headers, body: JSON.stringify(summary) };

  } catch (err) {
    console.error('analytics-summary error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
