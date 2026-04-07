// Uploads image to catbox.moe → returns a public HTTPS URL usable by Replicate
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

async function tryCatbox(imageBuffer, mimeType, ext) {
  const boundary = '----CB' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="photo.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, imageBuffer, ftr])
  });
  if (!r.ok) throw new Error('catbox.moe returned ' + r.status);
  const url = await r.text();
  if (!url.startsWith('http')) throw new Error('catbox.moe bad response: ' + url.slice(0, 100));
  return url.trim();
}

async function tryLitterbox(imageBuffer, mimeType, ext) {
  const boundary = '----LB' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="time"\r\n\r\n1h\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="photo.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, imageBuffer, ftr])
  });
  if (!r.ok) throw new Error('litterbox returned ' + r.status);
  const url = await r.text();
  if (!url.startsWith('http')) throw new Error('litterbox bad response: ' + url.slice(0, 100));
  return url.trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { imageB64, imageMimeType } = JSON.parse(event.body || '{}');
    if (!imageB64) return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageB64 is required' }) };

    const mimeType    = imageMimeType || 'image/jpeg';
    const ext         = mimeType.includes('png') ? 'png' : 'jpg';
    const imageBuffer = Buffer.from(imageB64, 'base64');
    const errors      = [];

    for (const svc of [tryCatbox, tryLitterbox]) {
      try {
        const url = await svc(imageBuffer, mimeType, ext);
        console.log('Image uploaded via', svc.name, '->', url);
        return { statusCode: 200, headers, body: JSON.stringify({ url }) };
      } catch (e) {
        console.warn(svc.name, 'failed:', e.message);
        errors.push(svc.name + ': ' + e.message);
      }
    }

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'All image hosts failed: ' + errors.join(' | ') }) };

  } catch (err) {
    console.error('upload-image error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
