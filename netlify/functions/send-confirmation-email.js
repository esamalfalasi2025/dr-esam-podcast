// Send confirmation email via Mailgun
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, name } = JSON.parse(event.body || '{}');

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    const displayName = name || email.split('@')[0];
    const siteUrl = process.env.SITE_URL || 'https://dresampodcast.netlify.app';

    const result = await mailgunRequest('POST', '/messages', {
      from: `Dr Esam Podcast <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: '🎙️ Welcome to Dr Esam\'s Podcast Community',
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #c9a84c 0%, #b8860b 100%); color: #0d0d0d; padding: 30px 20px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #f9f7f3; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
      .content h2 { color: #c9a84c; margin-top: 0; }
      .content p { margin: 12px 0; }
      .cta-button { display: inline-block; background: #c9a84c; color: #0d0d0d; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
      .footer { text-align: center; color: #7a7570; font-size: 12px; }
      .divider { height: 1px; background: #e2c97e; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎙️ Welcome to the Conversation</h1>
      </div>

      <div class="content">
        <h2>Hello ${displayName}!</h2>
        <p>Thank you for joining Dr Esam's podcast community. You're now subscribed to receive:</p>
        <ul>
          <li>📻 New episode notifications</li>
          <li>💭 Exclusive insights and thoughts</li>
          <li>🎯 Special announcements</li>
        </ul>
        <p>You'll never miss a conversation that matters.</p>

        <center>
          <a href="${siteUrl}#subscribe" class="cta-button">View Latest Episodes</a>
        </center>

        <div class="divider"></div>

        <p style="color: #7a7570; font-size: 12px;">
          <strong>No spam.</strong> We respect your inbox. You can manage your subscription anytime.
        </p>
      </div>

      <div class="footer">
        <p>Dr Esam Podcast • Deep conversations at the intersection of culture, leadership, and the Arab world's future.</p>
        <p><a href="${siteUrl}" style="color: #c9a84c; text-decoration: none;">Visit our website</a></p>
      </div>
    </div>
  </body>
</html>
      `
    });

    if (result.id) {
      console.log('Confirmation email sent:', result.id);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, messageId: result.id })
      };
    } else {
      console.error('Mailgun error:', result);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, message: 'Email function disabled (configure Mailgun)' })
      };
    }
  } catch (err) {
    console.error('send-confirmation-email error:', err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: false, message: 'Email service unavailable' })
    };
  }
};
