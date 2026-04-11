// Contact form handler with Mailgun email integration
const https = require('https');

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
