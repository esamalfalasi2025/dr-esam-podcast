// Polls Sync.so job status → returns { status, result_url }
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
    const { id, apiKey } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Job ID is required.' }) };

    const key = apiKey || process.env.SYNC_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Sync.so API key.' }) };

    const r = await fetch(`https://api.sync.so/v2/generate/${id}`, {
      headers: {
        'x-api-key': key,
        'Accept': 'application/json'
      }
    });

    const d = await r.json();
    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || d.error || 'Status check failed' }) };

    // Sync.so statuses: PENDING | PROCESSING | COMPLETED | FAILED
    const status = d.status === 'COMPLETED' ? 'done'
                 : d.status === 'FAILED'    ? 'error'
                 : 'processing';

    // Try all known output URL fields from Sync.so API
    const result_url = d.outputUrl
      || d.output_url
      || d.resultUrl
      || d.result_url
      || (d.output && (d.output.url || d.output))
      || null;

    console.log('sync-status raw:', JSON.stringify(d).slice(0, 400));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status,
        result_url,
        raw_status: d.status,
        error: d.error || d.errorMessage || null
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
