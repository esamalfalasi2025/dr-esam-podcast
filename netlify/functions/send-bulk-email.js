// Send bulk email to subscribers via Mailgun
const https = require('https');

function mailgunRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;

    if (!domain || !apiKey) {
      return resolve({ success: false, error: 'Mailgun not configured' });
    }

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');
    const postData = new URLSearchParams(data).toString();

    const options = {
      hostname: 'api.mailgun.net',
      path: `/v3/${domain}${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ success: res.statusCode === 200, body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getSubscribers() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) return [];

    const response = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    return [];
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { subject, html, plainText, filterEmail } = JSON.parse(event.body || '{}');

    if (!subject || (!html && !plainText)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Subject and content required' }) };
    }

    // Fetch subscribers
    const subscribers = await getSubscribers();
    if (!subscribers.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No subscribers found' }) };
    }

    // Filter if specific email requested
    let targetList = subscribers;
    if (filterEmail) {
      targetList = subscribers.filter(s => s.email === filterEmail);
      if (!targetList.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Subscriber not found' }) };
      }
    }

    // Send to each subscriber
    const results = [];
    const domain = process.env.MAILGUN_DOMAIN;
    const siteUrl = process.env.SITE_URL || 'https://dresampodcast.netlify.app';

    for (const subscriber of targetList) {
      try {
        const result = await mailgunRequest('POST', '/messages', {
          from: `Dr Esam Podcast <noreply@${domain}>`,
          to: subscriber.email,
          subject: subject,
          html: html || undefined,
          text: plainText || undefined,
          'v:subscriber-id': subscriber.id
        });

        results.push({
          email: subscriber.email,
          success: !!result.id,
          messageId: result.id,
          error: result.message
        });

        // Rate limiting: small delay between sends
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        results.push({
          email: subscriber.email,
          success: false,
          error: err.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: results.length,
        results: results
      })
    };
  } catch (err) {
    console.error('send-bulk-email error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
