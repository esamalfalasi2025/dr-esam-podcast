// Generate personalized podcast recommendation and send via email
const https = require('https');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Service pricing reference
const SERVICES = {
  'Audio Only': { price: 440, description: 'High-quality audio editing and production' },
  'Standard Video': { price: 826, description: 'Professional video podcast with editing' },
  'Cinematic': { price: 1652, description: 'Cinematic production with advanced editing' },
  'AI Enhanced': { price: 2476, description: 'AI-powered enhancements and scene generation' },
  'Premium Brand': { price: 4404, description: 'Complete premium branding and production' }
};

const ADDONS = {
  'Short Clips': { price: 275, description: 'Generate 3–5 short social media clips' },
  'Subtitles': { price: 220, description: 'Professional subtitles in English & Arabic' },
  'Custom Thumbnail': { price: 165, description: 'Custom episode thumbnail design' },
  'AI Scenes': { price: 661, description: 'AI-generated scene transitions' },
  'Voice Enhancement': { price: 147, description: 'Advanced voice clarity and processing' },
  'Bilingual Version': { price: 551, description: 'Dubbed version in second language' }
};

function callClaudeAPI(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error('ANTHROPIC_API_KEY not configured'));
      return;
    }

    const requestBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'You are a podcast expert. Respond in valid JSON only with no additional text.',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`API error: ${res.statusCode}`));
            return;
          }
          const parsed = JSON.parse(data);
          const reply = parsed.content[0].text;
          resolve(reply);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

async function saveToDatabase(supabaseUrl, supabaseKey, recommendation, email, firstName, lastName) {
  return new Promise((resolve, reject) => {
    const record = {
      email,
      first_name: firstName,
      last_name: lastName || '',
      podcast_type: recommendation.podcastType,
      has_guests: recommendation.hasGuests,
      needs_avatar: recommendation.needsAvatar,
      budget_range: recommendation.budgetRange,
      recommended_package: recommendation.recommendedPackage,
      recommended_addons: (recommendation.recommendedAddons || []).join(', '),
      total_price_aed: recommendation.totalPrice,
      conversation_summary: recommendation.goals,
      status: 'sent'
    };

    const body = JSON.stringify(record);
    const url = new URL(`${supabaseUrl}/rest/v1/recommendations`);
    const options = {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Database save failed: ${res.statusCode}`));
          return;
        }
        resolve();
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendEmailViaMailgun(email, firstName, recommendation) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      console.warn('Mailgun not configured, skipping email');
      resolve();
      return;
    }

    const addonsList = (recommendation.recommendedAddons || [])
      .map(addon => `<li>${addon} — ${ADDONS[addon]?.price || 0} AED</li>`)
      .join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #c9a84c;">Your Personalized Podcast Recommendation</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for chatting with Dr. Esam's AI Sales Consultant! Based on your needs, here's your personalized recommendation:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${recommendation.recommendedPackage} — ${recommendation.packagePrice || 0} AED</h3>
          <p>${recommendation.podcastType === 'personal' ? 'Personal Brand' : 'Commercial'} Podcast with ${recommendation.hasGuests ? 'Guests' : 'Solo'} ${recommendation.needsAvatar ? '& AI Avatar' : ''}</p>
          ${addonsList ? `<h4>Recommended Add-ons:</h4><ul>${addonsList}</ul>` : ''}
          <h2 style="color: #c9a84c; margin-top: 20px;">Total: ${recommendation.totalPrice || 0} AED</h2>
        </div>

        <p style="background: #f0f0f0; padding: 15px; border-left: 4px solid #c9a84c;">
          <strong>Next Steps:</strong><br/>
          Contact us on WhatsApp or fill out the form at <strong>dresampodcast.com</strong> to book your podcast production.
        </p>

        <hr style="border: none; border-top: 1px solid #ccc; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© 2026 DR. ESAM PODCAST | dresampodcast.com</p>
      </div>
    `;

    const params = new URLSearchParams({
      from: `Dr Esam Podcast <noreply@${domain}>`,
      to: email,
      subject: 'Your Personalized Podcast Recommendation ✨',
      html: htmlBody
    });

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');
    const options = {
      hostname: 'api.mailgun.net',
      path: `/v3/${domain}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': params.toString().length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error(`Mailgun error (${res.statusCode}):`, data);
        }
        resolve(); // Always resolve - don't fail the whole thing if email fails
      });
    });

    req.on('error', (err) => {
      console.error('Mailgun request error:', err);
      resolve(); // Graceful degradation
    });

    req.write(params.toString());
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { discoveryData, firstName, lastName, email } = JSON.parse(event.body || '{}');

    if (!discoveryData || !email || !firstName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'discoveryData, firstName, email required' })
      };
    }

    // Generate recommendation using Claude
    const recommendationPrompt = `
      Generate a podcast recommendation JSON for this profile:
      - Type: ${discoveryData.podcastType}
      - Has guests: ${discoveryData.hasGuests}
      - Needs avatar: ${discoveryData.needsAvatar}
      - Budget: ${discoveryData.budgetRange}

      Return ONLY valid JSON (no markdown, no extra text):
      {
        "podcastType": "personal|commercial",
        "hasGuests": boolean,
        "needsAvatar": boolean,
        "budgetRange": "string",
        "goals": "${discoveryData.goals || 'Professional podcast'}",
        "recommendedPackage": "Audio Only|Standard Video|Cinematic|AI Enhanced|Premium Brand",
        "packagePrice": number,
        "recommendedAddons": ["addon1", "addon2"],
        "totalPrice": number
      }
    `;

    let recommendationText = await callClaudeAPI(recommendationPrompt);

    // Extract JSON - handle if Claude wraps it in markdown
    const jsonMatch = recommendationText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid recommendation format from Claude');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    // Save to database
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      await saveToDatabase(supabaseUrl, supabaseKey, recommendation, email, firstName, lastName);
    }

    // Send email
    await sendEmailViaMailgun(email, firstName, recommendation);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Recommendation generated and sent!'
      })
    };
  } catch (err) {
    console.error('generate-recommendation error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
