/* ============================================================
   Netlify Function: generate-dialogue
   Proxies Claude API to avoid CORS from browser
   Env var required: ANTHROPIC_API_KEY
   ============================================================ */

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { hostName, guestName, subject, duration, script: prevScript, modifications, apiKey: clientKey } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY || clientKey;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'No API key configured. Add ANTHROPIC_API_KEY in Netlify environment variables, or enter it in Admin → Settings → Claude API Key.' })
    };
  }

  // Build prompt
  let prompt;
  if (prevScript && modifications) {
    prompt = `You are a professional podcast script writer. Here is an existing podcast dialogue script:\n\n${prevScript}\n\nThe user wants these modifications:\n${modifications}\n\nPlease regenerate the FULL script incorporating these changes. Return ONLY the dialogue script with no preamble, explanation, or markdown.`;
  } else {
    const dur = parseInt(duration) || 5;
    const exchangeGuide = dur <= 1
      ? '4–6 exchanges' : dur <= 5
      ? '10–18 exchanges' : dur <= 15
      ? '20–30 exchanges' : dur >= 30 || (duration||'').includes('hour')
      ? '60–80 exchanges' : '30–50 exchanges';

    prompt = `You are a professional podcast script writer. Generate a broadcast-quality podcast dialogue script with the following details:

Host: ${hostName}
Guest: ${guestName}
Topic: ${subject}
Duration: ${duration} (approx. ${exchangeGuide})

Requirements:
- Format EVERY line as either:
  HOST (${hostName}): [spoken text]
  GUEST (${guestName}): [spoken text]
- Use section headers like "=== INTRODUCTION ===" and "=== CLOSING ===" to mark segments
- Include natural pacing cues: [pause], [laughter], [thoughtful moment]
- Opening: warm welcome, introduce show and guest
- Guest bio woven naturally into conversation (not a list)
- Smooth topic transitions with bridging phrases
- Tone: conversational but intelligent — NPR/TED/Lex Fridman quality
- Real-feeling anecdotes, follow-up questions, depth
- Strong closing: summary, key takeaways, call-to-action for audience
- Return ONLY the dialogue script. No preamble, no markdown fences, no explanation.`;
  }

  // Use Haiku for very short scripts (faster), Sonnet for longer ones
  const dur = parseInt(duration) || 5;
  const isShort = dur <= 5 && !(duration||'').includes('hour');
  const model = isShort ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
  const maxTokens = isShort ? 1024 : 4096;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `Claude API error: ${err}` }) };
    }

    const data = await response.json();
    const generatedScript = data.content?.[0]?.text || '';

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ script: generatedScript })
    };
  } catch (err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
