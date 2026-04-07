// Uploads audio to a free public host → returns HTTPS URL for D-ID
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

async function tryCatbox(audioBuffer, mimeType, ext) {
  const boundary = '----CB' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, audioBuffer, ftr])
  });
  if (!r.ok) throw new Error('catbox.moe returned ' + r.status);
  const url = await r.text();
  if (!url.startsWith('http')) throw new Error('catbox.moe bad response: ' + url.slice(0, 100));
  return url.trim();
}

async function tryLitterbox(audioBuffer, mimeType, ext) {
  const boundary = '----LB' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="time"\r\n\r\n1h\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, audioBuffer, ftr])
  });
  if (!r.ok) throw new Error('litterbox returned ' + r.status);
  const url = await r.text();
  if (!url.startsWith('http')) throw new Error('litterbox bad response: ' + url.slice(0, 100));
  return url.trim();
}

async function tryFileIO(audioBuffer, mimeType, ext) {
  const boundary = '----FIO' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://file.io/?expires=1d', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, audioBuffer, ftr])
  });
  const d = await r.json();
  if (!d.success || !d.link) throw new Error('file.io failed: ' + (d.message || 'no link'));
  return d.link;
}

async function tryTmpfiles(audioBuffer, mimeType, ext) {
  const boundary = '----TF' + Math.random().toString(36).slice(2);
  const hdr = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const ftr = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([hdr, audioBuffer, ftr])
  });
  const d = await r.json();
  if (d.status !== 'success') throw new Error('tmpfiles failed');
  // Convert tmpfiles URL to direct download
  const url = d.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  return url;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { audioB64, audioMimeType } = JSON.parse(event.body || '{}');
    if (!audioB64) return { statusCode: 400, headers, body: JSON.stringify({ error: 'audioB64 is required' }) };

    const mimeType    = audioMimeType || 'audio/mpeg';
    const ext         = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'mp3';
    const audioBuffer = Buffer.from(audioB64, 'base64');
    const errors      = [];

    const services = [tryCatbox, tryLitterbox, tryFileIO, tryTmpfiles];
    for (const svc of services) {
      try {
        const url = await svc(audioBuffer, mimeType, ext);
        console.log('Audio uploaded via', svc.name, '->', url);
        return { statusCode: 200, headers, body: JSON.stringify({ url }) };
      } catch (e) {
        console.warn(svc.name, 'failed:', e.message);
        errors.push(svc.name + ': ' + e.message);
      }
    }

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'All audio hosts failed: ' + errors.join(' | ') }) };

  } catch (err) {
    console.error('upload-audio error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
