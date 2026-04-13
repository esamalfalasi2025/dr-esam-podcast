// Upload episode images to Supabase Storage
const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET = 'episode-images';
const ASSETS_DIR = './assets';

async function uploadFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);

  return fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg'
    },
    body: fileContent
  })
  .then(res => {
    if (res.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
      return { fileName, publicUrl, success: true };
    } else {
      throw new Error(`Upload failed: ${res.status}`);
    }
  });
}

async function uploadAll() {
  const files = fs.readdirSync(ASSETS_DIR).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));

  console.log(`Found ${files.length} images to upload...\n`);

  const results = [];
  for (const file of files) {
    try {
      const filePath = path.join(ASSETS_DIR, file);
      console.log(`Uploading: ${file}`);
      const result = await uploadFile(filePath, file);
      results.push(result);
      console.log(`✓ ${file}\n`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}\n`);
    }
  }

  console.log('\n=== Upload Complete ===\n');
  console.log('Use these URLs in your episodes table image_url field:\n');
  results.forEach(r => console.log(`${r.fileName}: ${r.publicUrl}`));
}

uploadAll().catch(console.error);
