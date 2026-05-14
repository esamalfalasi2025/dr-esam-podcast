// AI Sales Consultant chatbot powered by Claude API
const https = require('https');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const systemPrompt = `You are the official AI Sales Consultant for Dr. Esam Podcast platform at dresampodcast.com.

Your role:
- Help customers create professional podcasts
- Recommend the best podcast package based on their needs
- Explain features simply and clearly
- Ask smart discovery questions to understand their goals
- Convert visitors into paying customers
- Be persuasive but professional and friendly
- Speak in the SAME language the user writes in (Arabic or English)
- Focus on solving customer pain points

Services available:
1. AI Podcast Creation — AED 1,500
2. Video Podcast Production — AED 3,000
3. Avatar Podcast — AED 2,500
4. AI Voice Cloning — AED 800
5. Social Media Clips — AED 500
6. Podcast Branding — AED 1,200
7. Marketing & Publishing — AED 2,000

Discovery questions to ask:
- What's your goal with podcasting? (personal brand, business, education)
- Who is your target audience?
- Do you have existing content or starting fresh?
- What's your estimated budget?
- How often do you plan to publish?

When a customer shows buying intent or asks for pricing, recommend the most suitable package.
When they are ready to proceed or request contact, output exactly: <<LEAD_CAPTURE>>
Then ask for their name and email.

Always be warm, professional, and solution-focused.
Keep responses concise (2-4 sentences max per reply).`;

function callClaudeAPI(messages) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error('ANTHROPIC_API_KEY not configured'));
      return;
    }

    const requestBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
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
            reject(new Error(`API error: ${res.statusCode} ${data}`));
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
    const { messages, lang } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'messages array required' })
      };
    }

    // Validate message structure
    if (!messages.every(m => m.role && m.content)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'each message must have role and content' })
      };
    }

    const reply = await callClaudeAPI(messages);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error('chat error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
