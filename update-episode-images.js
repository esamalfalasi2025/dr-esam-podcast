// Update episodes table to use Supabase Storage image URLs instead of base64
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Mapping of episode titles to uploaded image filenames
const imageMapping = {
  '2025 Insights': '2025 Insights.jpg',
  'Ai defintion': 'Ai defintion.jpg',
  'AI Leadership': 'AI Leadership.jpg',
  'Ai Twin': 'Ai Twin.jpg',
  'Cloud Journey': 'Cloud Juerney.jpg',
  'coming back from Chaina': 'coming back from Chaina.jpg',
  'Crisis': 'Crisis.jpg',
  'Dr Esam Talk': 'Dr Esam Talk.jpg',
  'Dr Esam Vibes': 'Dr Esam vibes.jpg',
  'Dr Esam': 'Dr Esam.jpg',
  'Duaa': 'Duaa.jpg',
  'future of the book': 'future of the book.jpg',
  'Hanouf Journey': 'Hanouf.jpg',
  'Hazza & DrEsam': 'Hazza & DrEsam.jpg',
  'Juhar Story': 'Juhar Story.jpg',
  'Juhar welcome': 'Juhar welcome.jpg',
  'Noor': 'Noor.jpg',
  'Podcast watermark': 'Podcast watermark.jpeg',
  'Podcast with Father': 'Podcast with Father.jpeg',
  'Saif Podcast': 'Saif Podcast.jpg',
  'Shaikha Story': 'Shaikha Story.jpg'
};

async function updateEpisodeImages() {
  try {
    // Fetch all episodes
    const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes?select=id,title`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });

    const episodes = await res.json();
    console.log(`Found ${episodes.length} episodes\n`);

    let updated = 0;
    for (const episode of episodes) {
      const imageFile = imageMapping[episode.title];
      if (imageFile) {
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/episode-images/${encodeURIComponent(imageFile)}`;

        // Update episode with new image URL
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/episodes?id=eq.${episode.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image_url: imageUrl })
        });

        if (updateRes.ok) {
          console.log(`✓ Updated: ${episode.title}`);
          updated++;
        } else {
          console.log(`✗ Failed: ${episode.title} (${updateRes.status})`);
        }
      } else {
        console.log(`⚠ No image found for: ${episode.title}`);
      }
    }

    console.log(`\n=== Update Complete ===`);
    console.log(`${updated} episodes updated with new image URLs`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

updateEpisodeImages();
