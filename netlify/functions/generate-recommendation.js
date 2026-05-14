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

    console.log('Supabase save - URL:', url.toString());
    console.log('Supabase save - Record:', record);

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Supabase response - Status: ${res.statusCode}`);
        if (res.statusCode >= 400) {
          console.error('Supabase error:', data);
          reject(new Error(`Database save failed: ${res.statusCode} - ${data}`));
          return;
        }
        console.log('Supabase save successful');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('Supabase request error:', err.message);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

async function sendEmailViaMailgun(email, firstName, recommendation) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      console.error('Mailgun not configured:', {
        hasApiKey: !!apiKey,
        hasDomain: !!domain
      });
      resolve();
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      console.error('Invalid email address:', email);
      reject(new Error(`Invalid email address: ${email}`));
      return;
    }

    const cleanEmail = email.trim();
    console.log('Mailgun config verified, sending email to:', cleanEmail);

    const addonsList = (recommendation.recommendedAddons || [])
      .map(addon => `<li>${addon} — ${ADDONS[addon]?.price || 0} AED</li>`)
      .join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #c9a84c;">Your Personalized Podcast Recommendation</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for chatting with Dr. Esam's AI Sales Consultant! Based on your needs, here's your personalized recommendation:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${recommendation.recommendedPackage}</h3>
          <p style="color: #666; font-size: 14px;">${recommendation.podcastType === 'personal' ? 'Personal Brand' : 'Commercial'} Podcast with ${recommendation.hasGuests ? 'Guests' : 'Solo'} ${recommendation.needsAvatar ? '& AI Avatar' : ''}</p>

          <p style="color: #999; font-size: 13px; margin: 10px 0;">Base Package: <strong>${recommendation.packagePrice || 0} AED</strong></p>

          ${addonsList ? `<h4 style="margin-bottom: 10px;">Recommended Add-ons:</h4><ul style="margin: 10px 0; padding-left: 20px;">${addonsList}</ul>` : ''}

          <div style="border-top: 2px solid #c9a84c; padding-top: 15px; margin-top: 15px;">
            <h2 style="color: #c9a84c; margin: 0;">Total Investment: ${recommendation.totalPrice || 0} AED</h2>
          </div>
        </div>

        <p style="background: #fffbf0; padding: 15px; border-left: 4px solid #c9a84c; margin: 20px 0;">
          <strong>Ready to get started?</strong><br/>
          Contact us on WhatsApp or fill out the form at <strong>dresampodcast.com</strong> to book your podcast production today!
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 11px; text-align: center;">© 2026 DR. ESAM PODCAST | dresampodcast.com<br/>Transforming Your Ideas Into Premium Audio & Video Content</p>
      </div>
    `;

    const fromAddress = `Dr Esam Podcast <noreply@${domain}>`;
    const subject = 'Your Personalized Podcast Recommendation';

    const params = new URLSearchParams();
    params.append('from', fromAddress);
    params.append('to', cleanEmail);
    params.append('subject', subject);
    params.append('html', htmlBody);

    console.log('Mailgun params prepared:', {
      to: cleanEmail,
      from: fromAddress,
      subject: subject,
      paramString: params.toString().substring(0, 200)
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

    console.log('Mailgun request options:', {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      authHeaderPresent: !!options.headers.Authorization,
      contentLength: options.headers['Content-Length']
    });

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Mailgun response - Status: ${res.statusCode}, Data:`, data);
        if (res.statusCode >= 400) {
          console.error(`Mailgun error (${res.statusCode}):`, data);
        } else {
          console.log('Mailgun email sent successfully');
        }
        resolve(); // Always resolve - don't fail the whole thing if email fails
      });
    });

    req.on('error', (err) => {
      console.error('Mailgun request error:', err.message);
      resolve(); // Graceful degradation
    });

    console.log('Writing email request to Mailgun...');
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
    console.log('=== Generate Recommendation Request Started ===');
    const { discoveryData, firstName, lastName, email, previewOnly } = JSON.parse(event.body || '{}');

    console.log('Request data:', {
      firstName,
      email,
      previewOnly,
      emailType: typeof email,
      emailLength: email?.length || 0,
      podcastType: discoveryData?.podcastType,
      budgetRange: discoveryData?.budgetRange
    });

    if (!discoveryData || !email || !firstName) {
      console.error('Missing required fields:', {
        hasDiscoveryData: !!discoveryData,
        hasEmail: !!email,
        hasFirstName: !!firstName
      });
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

      ONLY recommend add-ons from this list: Short Clips, Subtitles, Custom Thumbnail, AI Scenes, Voice Enhancement, Bilingual Version

      Return ONLY valid JSON (no markdown, no extra text):
      {
        "podcastType": "personal|commercial",
        "hasGuests": boolean,
        "needsAvatar": boolean,
        "budgetRange": "string",
        "goals": "${discoveryData.goals || 'Professional podcast'}",
        "recommendedPackage": "Audio Only|Standard Video|Cinematic|AI Enhanced|Premium Brand",
        "packagePrice": number,
        "recommendedAddons": ["Short Clips", "Subtitles", ...],
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
    console.log('Recommendation generated:', {
      package: recommendation.recommendedPackage,
      addons: recommendation.recommendedAddons?.length || 0,
      totalPrice: recommendation.totalPrice
    });

    // Generate email HTML for preview or sending
    const addonsList = (recommendation.recommendedAddons || [])
      .map(addon => `<li>${addon} — ${ADDONS[addon]?.price || 0} AED</li>`)
      .join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #c9a84c;">Your Personalized Podcast Recommendation</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for chatting with Dr. Esam's AI Sales Consultant! Based on your needs, here's your personalized recommendation:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${recommendation.recommendedPackage}</h3>
          <p style="color: #666; font-size: 14px;">${recommendation.podcastType === 'personal' ? 'Personal Brand' : 'Commercial'} Podcast with ${recommendation.hasGuests ? 'Guests' : 'Solo'} ${recommendation.needsAvatar ? '& AI Avatar' : ''}</p>

          <p style="color: #999; font-size: 13px; margin: 10px 0;">Base Package: <strong>${recommendation.packagePrice || 0} AED</strong></p>

          ${addonsList ? `<h4 style="margin-bottom: 10px;">Recommended Add-ons:</h4><ul style="margin: 10px 0; padding-left: 20px;">${addonsList}</ul>` : ''}

          <div style="border-top: 2px solid #c9a84c; padding-top: 15px; margin-top: 15px;">
            <h2 style="color: #c9a84c; margin: 0;">Total Investment: ${recommendation.totalPrice || 0} AED</h2>
          </div>
        </div>

        <p style="background: #fffbf0; padding: 15px; border-left: 4px solid #c9a84c; margin: 20px 0;">
          <strong>Ready to get started?</strong><br/>
          Contact us on WhatsApp or fill out the form at <strong>dresampodcast.com</strong> to book your podcast production today!
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 11px; text-align: center;">© 2026 DR. ESAM PODCAST | dresampodcast.com<br/>Transforming Your Ideas Into Premium Audio & Video Content</p>
      </div>
    `;

    // If preview only, return HTML without sending
    if (previewOnly) {
      console.log('Preview mode - returning email HTML without sending');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          previewOnly: true,
          emailHtml: emailHtml
        })
      };
    }

    // Save to database
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log('Saving to Supabase...');
      await saveToDatabase(supabaseUrl, supabaseKey, recommendation, email, firstName, lastName);
      console.log('Supabase save completed');
    } else {
      console.warn('Supabase not configured, skipping database save');
    }

    // Send email
    console.log('Starting Mailgun email send...');
    await sendEmailViaMailgun(email, firstName, recommendation);
    console.log('Mailgun email send completed');

    console.log('=== Request completed successfully ===');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Recommendation generated and sent!'
      })
    };
  } catch (err) {
    console.error('=== Generate Recommendation Error ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
