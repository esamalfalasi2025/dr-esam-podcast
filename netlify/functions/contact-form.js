// Contact form handler with Mailgun email integration
const https = require('https');

// Service pricing map (matches contact form <select> values)
const PRICING = {
  'audio-only':        { name: 'Audio Only',        price: 440,  cost: 293  },
  'standard-video':    { name: 'Standard Video',     price: 826,  cost: 551  },
  'cinematic':         { name: 'Cinematic',          price: 1652, cost: 1101 },
  'ai-enhanced':       { name: 'AI Enhanced',        price: 2476, cost: 1651 },
  'premium-brand':     { name: 'Premium Brand',      price: 4404, cost: 2936 },
  'short-clips':       { name: 'Short Clips',        price: 275,  cost: 183  },
  'subtitles':         { name: 'Subtitles',          price: 220,  cost: 147  },
  'thumbnail':         { name: 'Thumbnail',          price: 165,  cost: 110  },
  'ai-scenes':         { name: 'AI Scenes',          price: 661,  cost: 441  },
  'voice-enhancement': { name: 'Voice Enhancement',  price: 147,  cost: 98   },
  'bilingual':         { name: 'Bilingual',          price: 551,  cost: 367  },
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

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
    const { firstName, lastName, email, subject, message } = JSON.parse(event.body);

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      console.error('Mailgun credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    // Prepare email body
    const emailContent = `
New Contact Form Submission

From: ${firstName} ${lastName}
Email: ${email}
Subject: ${subject}
Message:
${message}
    `.trim();

    // Send email via Mailgun (hardcoded recipient)
    const recipientEmail = 'esamalfalasi@gmail.com';

    const result = await sendMailgunEmail(
      mailgunApiKey,
      mailgunDomain,
      {
        from: `noreply@${mailgunDomain}`,
        to: recipientEmail,
        subject: `New Contact Form: ${subject}`,
        text: emailContent,
        'h:Reply-To': email
      }
    );

    if (!result.success) {
      console.error('Mailgun send failed:', result.error);
      throw new Error('Failed to send email via Mailgun');
    }

    // Insert into service_requests table (non-blocking, fire-and-forget)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (supabaseUrl && supabaseKey) {
      const tier = PRICING[subject];
      if (tier) {
        const record = {
          first_name:   firstName,
          last_name:    lastName,
          email:        email,
          subject:      subject,
          service_key:  subject,
          service_name: tier.name,
          price_aed:    tier.price,
          cost_aed:     tier.cost,
          markup_aed:   tier.price - tier.cost
        };
        // Fire-and-forget: insert to Supabase without blocking response
        (async () => {
          try {
            const dbRes = await fetch(`${supabaseUrl}/rest/v1/service_requests`, {
              method: 'POST',
              headers: {
                'apikey':        supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type':  'application/json',
                'Prefer':        'return=minimal'
              },
              body: JSON.stringify(record)
            });
            if (!dbRes.ok) {
              const errData = await dbRes.text();
              console.error(`Supabase insert failed (${dbRes.status}):`, errData);
            } else {
              console.log('Service request stored successfully');
            }
          } catch (dbErr) {
            console.error('Supabase insert error (non-fatal):', dbErr.message);
          }
        })();
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Message sent successfully'
      })
    };

  } catch (error) {
    console.error('Contact form error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process contact form',
        details: error.message
      })
    };
  }
};

function sendMailgunEmail(apiKey, domain, emailData) {
  return new Promise((resolve, reject) => {
    // Prepare form data
    const postData = new URLSearchParams();
    for (const [key, value] of Object.entries(emailData)) {
      postData.append(key, value);
    }

    const options = {
      hostname: 'api.mailgun.net',
      port: 443,
      path: `/v3/${domain}/messages`,
      method: 'POST',
      auth: `api:${apiKey}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData.toString())
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(data) });
        } else {
          console.error(`Mailgun error ${res.statusCode}:`, data);
          reject(new Error(`Mailgun API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData.toString());
    req.end();
  });
}
