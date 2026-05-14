// AI Sales Consultant chatbot powered by Claude API
const https = require('https');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const systemPrompt = `You are the official AI Sales Consultant for Dr. Esam Podcast at dresampodcast.com.

DISCOVERY FLOW (collect these in natural conversation):
1. What is your main goal/purpose for podcasting?
2. Is this a PERSONAL brand or COMMERCIAL/business podcast?
3. Will you have GUESTS or record solo?
4. Do you need AI AVATAR or video production?
5. What is your approximate budget? (Under 500 AED / 500-1500 AED / 1500-3000 AED / 3000+ AED)

WHEN YOU HAVE COLLECTED ALL 5 ITEMS:
Output this exact format (JSON on one line):
<<RECOMMENDATION:{"podcastType":"personal or commercial","hasGuests":true or false,"needsAvatar":true or false,"budgetRange":"exact budget string","goals":"brief summary of their goal"}>>

Then say: "Perfect! I've got everything I need. Please share your name and email so I can send you a personalized podcast recommendation PDF with pricing, timeline, and next steps."

SERVICES (for reference only - recommendations are auto-generated):
Base packages: Audio Only (440 AED), Standard Video (826 AED), Cinematic (1,652 AED), AI Enhanced (2,476 AED), Premium Brand (4,404 AED)
Add-ons: Short Clips (275 AED), Subtitles (220 AED), Thumbnail (165 AED), AI Scenes (661 AED), Voice Enhancement (147 AED), Bilingual (551 AED)

GUIDELINES:
- Be warm, friendly, professional, and persuasive
- Speak in user's language (Arabic or English)
- Keep responses to 2-4 sentences max
- Adapt to the user's responses but stay focused on collecting the 5 discovery items
- Do NOT ask about timeline/frequency until after you have the 5 items
- Once you output <<RECOMMENDATION:...>>, the conversation moves to PDF generation`;

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
