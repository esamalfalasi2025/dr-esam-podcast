// Creates a HeyGen talking photo video using a direct image URL → returns video_id
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
    const { talkingPhotoId, audioUrl, apiKey } = JSON.parse(event.body || '{}');
    if (!talkingPhotoId || !audioUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: 'talkingPhotoId and audioUrl are required' }) };

    const key = apiKey || process.env.HEYGEN_API_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No HeyGen API key' }) };

    const body = {
      video_inputs: [{
        character: {
          type: 'talking_photo',
          talking_photo_id: talkingPhotoId,
          talking_style: 'stable'
        },
        voice: {
          type: 'audio',
          audio_url: audioUrl
        }
      }],
      dimension: { width: 512, height: 512 }
    };

    console.log('heygen-create-video request:', JSON.stringify(body));

    const r = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const d = await r.json();
    console.log('heygen-create-video response:', r.status, JSON.stringify(d).slice(0, 400));

    if (!r.ok || d.error) {
      return { statusCode: r.status || 400, headers, body: JSON.stringify({ error: typeof d.error === 'object' ? JSON.stringify(d.error) : (d.error || d.message || 'Video creation failed') }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ video_id: d.data.video_id }) };

  } catch (err) {
    console.error('heygen-create-video error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
