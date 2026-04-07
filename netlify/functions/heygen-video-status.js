// Polls HeyGen video status → returns { status, video_url }
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
    const { videoId, apiKey } = JSON.parse(event.body || '{}');
    if (!videoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'videoId is required' }) };

    const key = apiKey || process.env.HEYGEN_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No HeyGen API key' }) };

    const r = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: {
        'x-api-key': key,
        'Accept': 'application/json'
      }
    });

    const d = await r.json();
    console.log('heygen-video-status:', r.status, JSON.stringify(d).slice(0, 300));

    if (!r.ok) return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message || 'Status check failed' }) };

    const data = d.data || d;
    // HeyGen statuses: pending | processing | completed | failed
    const status = data.status === 'completed' ? 'done'
                 : data.status === 'failed'    ? 'error'
                 : 'processing';

    console.log('heygen-video-status full data:', JSON.stringify(data).slice(0, 500));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status,
        result_url: data.video_url || null,
        raw_status: data.status,
        error: typeof (data.error_message || data.error || data.message) === 'object'
          ? JSON.stringify(data.error_message || data.error || data.message)
          : (data.error_message || data.error || data.message || null)
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
