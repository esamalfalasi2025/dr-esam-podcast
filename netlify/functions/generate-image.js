// v3
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Gemini models + responseModalities combos to try, in preference order
const GEMINI_IMAGE_MODELS = [
  { ver: 'v1beta', name: 'gemini-3-pro-image-preview',                modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1beta', name: 'gemini-3-flash-image-preview',              modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1beta', name: 'gemini-2.0-flash-preview-image-generation', modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1beta', name: 'gemini-2.0-flash-preview-image-generation', modalities: ['IMAGE'] },
  { ver: 'v1beta', name: 'gemini-2.0-flash-exp-image-generation',     modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1alpha', name: 'gemini-2.0-flash-exp-image-generation',    modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1alpha', name: 'gemini-2.0-flash-exp',                     modalities: ['TEXT', 'IMAGE'] },
  { ver: 'v1beta',  name: 'gemini-2.0-flash-exp',                     modalities: ['TEXT', 'IMAGE'] }
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const {
      prompt, model = 'gemini', aspectRatio = '1:1', apiKey,
      imageB64, imageMimeType, image2B64, image2MimeType
    } = JSON.parse(event.body || '{}');

    if (!prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };

    const key = apiKey || process.env.GOOGLE_AI_KEY;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Google AI API key configured. Add GOOGLE_AI_KEY in Netlify env vars or enter it in Admin → Settings → Google AI API Key.' }) };

    // Build parts array for Gemini (used in both paths)
    const parts = [];
    if (imageB64)  parts.push({ inlineData: { mimeType: imageMimeType  || 'image/jpeg', data: imageB64  } });
    if (image2B64) parts.push({ inlineData: { mimeType: image2MimeType || 'image/jpeg', data: image2B64 } });
    parts.push({ text: prompt });

    // ── GEMINI PATH ──────────────────────────────────────────────
    if (model === 'gemini' || imageB64 || image2B64) {
      let lastErr = 'No Gemini image model available for your API key.';
      const errors = [];

      for (const m of GEMINI_IMAGE_MODELS) {
        const url = `https://generativelanguage.googleapis.com/${m.ver}/models/${m.name}:generateContent?key=${key}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseModalities: m.modalities }
          })
        });
        const d = await r.json();

        if (!r.ok) {
          const msg = d.error?.message || 'Unknown error';
          errors.push(`${m.name}: ${msg}`);
          lastErr = msg;
          // Skip to next model/config if this one doesn't support the feature
          if (/not found|not support|deprecated|does not exist|modalities/i.test(msg)) continue;
          // For auth or quota errors — stop and report immediately
          return { statusCode: r.status, headers, body: JSON.stringify({ error: msg }) };
        }

        const rParts = d.candidates?.[0]?.content?.parts || [];
        const images = rParts.filter(p => p.inlineData).map(p => ({
          base64: p.inlineData.data,
          mimeType: p.inlineData.mimeType || 'image/jpeg'
        }));

        if (images.length) {
          return { statusCode: 200, headers, body: JSON.stringify({ images }) };
        }
        errors.push(`${m.name}: responded OK but returned no image`);
      }

      // All Gemini models tried and failed
      console.log('Gemini errors:', errors.join(' | '));
      return { statusCode: 400, headers, body: JSON.stringify({
        error: 'Image generation is not enabled for your Google AI API key. ' +
               'Go to aistudio.google.com → Get API Key → create a new key and make sure to accept image generation terms. ' +
               'Last error: ' + lastErr
      }) };
    }

    // ── IMAGEN 3 PATH ────────────────────────────────────────────
    const imagenModels = [
      { ver: 'v1beta', name: 'nano-banana-pro' },
      { ver: 'v1beta', name: 'nano-banana' },
      { ver: 'v1beta', name: 'imagen-3.0-generate-001' },
      { ver: 'v1',     name: 'imagen-3.0-generate-001' },
      { ver: 'v1beta', name: 'imagen-3.0-fast-generate-001' }
    ];

    let imagenLastErr = 'Imagen 3 is not available for your API key.';
    for (const m of imagenModels) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${m.ver}/models/${m.name}:predict?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 2, aspectRatio } })
        }
      );
      const d = await r.json();
      if (!r.ok) {
        const msg = d.error?.message || 'Unknown error';
        imagenLastErr = msg;
        if (/not found|not supported|deprecated/i.test(msg)) continue;
        return { statusCode: r.status, headers, body: JSON.stringify({ error: msg }) };
      }
      const images = (d.predictions || []).map(p => ({
        base64: p.bytesBase64Encoded,
        mimeType: p.mimeType || 'image/png'
      }));
      if (images.length) return { statusCode: 200, headers, body: JSON.stringify({ images }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({
      error: 'Imagen 3 requires a billing-enabled Google Cloud project. Switch to the Gemini model instead.'
    }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
