// Generate personalized podcast recommendation, create PDF, send email
const PDFDocument = require('pdfkit');
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
      max_tokens: 800,
      system: 'You are a podcast production expert. Generate a concise, professional recommendation. Return valid JSON only.',
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

function generatePDF(recommendation, firstName, lastName, email) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('DR. ESAM PODCAST', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Your Personalized Podcast Recommendation', { align: 'center' });
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Info
      doc.fontSize(10).text(`Prepared for: ${firstName} ${lastName} | Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      doc.moveDown(1);

      // Profile Section
      doc.fontSize(12).font('Helvetica-Bold').text('YOUR PODCAST PROFILE', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`• Type: ${recommendation.podcastType === 'personal' ? 'Personal Brand' : 'Commercial/Business'}`);
      doc.text(`• Guests: ${recommendation.hasGuests ? 'Yes, with guests' : 'Solo podcast'}`);
      doc.text(`• AI Avatar: ${recommendation.needsAvatar ? 'Yes, with AI avatar' : 'No avatar needed'}`);
      doc.text(`• Budget Range: ${recommendation.budgetRange}`);
      doc.moveDown(1);

      // Recommended Package
      doc.fontSize(12).font('Helvetica-Bold').text('RECOMMENDED PACKAGE', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`${recommendation.recommendedPackage}`);
      doc.text(`Price: ${recommendation.packagePrice} AED`, { font: 'Helvetica-Bold' });
      doc.text(SERVICES[recommendation.recommendedPackage].description);
      doc.moveDown(1);

      // Recommended Add-ons
      if (recommendation.recommendedAddons && recommendation.recommendedAddons.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('RECOMMENDED ADD-ONS', { underline: true });
        doc.fontSize(10).font('Helvetica');
        recommendation.recommendedAddons.forEach(addon => {
          doc.text(`✓ ${addon} — ${ADDONS[addon].price} AED`);
        });
        doc.moveDown(1);
      }

      // Total
      doc.fontSize(12).font('Helvetica-Bold').text('TOTAL INVESTMENT', { underline: true });
      doc.fontSize(14).font('Helvetica-Bold').text(`${recommendation.totalPrice} AED`);
      doc.moveDown(1);

      // Timeline & Next Steps
      doc.fontSize(12).font('Helvetica-Bold').text('TIMELINE & NEXT STEPS', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text('• Standard production: 3–5 business days');
      doc.text('• Rush orders available (+20% for 48h, +40% for 24h)');
      doc.text('• Book via WhatsApp or contact form at dresampodcast.com');
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).fillColor('#999999').text('DR. ESAM PODCAST — Transform Your Ideas Into Premium Audio & Video Content', { align: 'center' });
      doc.text('dresampodcast.com | esamalfalasi@gmail.com', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function uploadPDFToSupabase(pdfBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      reject(new Error('Missing Supabase credentials'));
      return;
    }

    const url = new URL(`${supabaseUrl}/storage/v1/object/recommendations/${fileName}`);
    const options = {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Supabase upload failed: ${res.statusCode} ${data}`));
          return;
        }
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/recommendations/${fileName}`;
        resolve(publicUrl);
      });
    });

    req.on('error', reject);
    req.write(pdfBuffer);
    req.end();
  });
}

async function saveToDatabase(supabaseUrl, supabaseKey, recommendation, email, firstName, lastName, pdfUrl) {
  return new Promise((resolve, reject) => {
    const record = {
      email,
      first_name: firstName,
      last_name: lastName,
      podcast_type: recommendation.podcastType,
      has_guests: recommendation.hasGuests,
      needs_avatar: recommendation.needsAvatar,
      budget_range: recommendation.budgetRange,
      recommended_package: recommendation.recommendedPackage,
      recommended_addons: recommendation.recommendedAddons.join(', '),
      total_price_aed: recommendation.totalPrice,
      conversation_summary: recommendation.goals,
      pdf_url: pdfUrl,
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

async function sendEmailViaMailgun(email, firstName, recommendation, pdfUrl) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      reject(new Error('Missing Mailgun credentials'));
      return;
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #c9a84c;">Your Personalized Podcast Recommendation</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for chatting with Dr. Esam's AI Sales Consultant! Based on your needs, here's your personalized recommendation:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${recommendation.recommendedPackage} — ${recommendation.packagePrice} AED</h3>
          <p>${recommendation.podcastType === 'personal' ? 'Personal Brand' : 'Commercial'} Podcast with ${recommendation.hasGuests ? 'Guests' : 'Solo'} ${recommendation.needsAvatar ? '& AI Avatar' : ''}</p>
          ${recommendation.recommendedAddons.length > 0 ? `<p><strong>Enhancements:</strong> ${recommendation.recommendedAddons.join(', ')}</p>` : ''}
          <h2 style="color: #c9a84c;">Total: ${recommendation.totalPrice} AED</h2>
        </div>

        <p><a href="${pdfUrl}" style="display: inline-block; background: #c9a84c; color: #0d0d0d; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">📥 Download PDF Report</a></p>

        <p>Ready to get started? Contact us on WhatsApp or fill out the form at <strong>dresampodcast.com</strong></p>

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
          resolve(); // Don't reject - email failure shouldn't block the whole process
        } else {
          resolve();
        }
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
    const { discoveryData, firstName, lastName, email } = JSON.parse(event.body);

    if (!discoveryData || !email || !firstName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'discoveryData, firstName, email required' })
      };
    }

    // Generate recommendation using Claude
    const recommendationPrompt = `
      Generate a JSON podcast recommendation based on this profile:
      - Type: ${discoveryData.podcastType}
      - Has guests: ${discoveryData.hasGuests}
      - Needs AI avatar: ${discoveryData.needsAvatar}
      - Budget: ${discoveryData.budgetRange}
      - Goals: ${discoveryData.goals}

      Return ONLY this JSON (no other text):
      {
        "podcastType": "personal|commercial",
        "hasGuests": boolean,
        "needsAvatar": boolean,
        "budgetRange": "string",
        "goals": "string",
        "recommendedPackage": "Audio Only|Standard Video|Cinematic|AI Enhanced|Premium Brand",
        "packagePrice": number,
        "recommendedAddons": ["Short Clips", "Subtitles", ...],
        "totalPrice": number
      }
    `;

    let recommendationText = await callClaudeAPI(recommendationPrompt);
    // Extract JSON from response (Claude might add extra text)
    const jsonMatch = recommendationText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse recommendation JSON from Claude');
    }
    const recommendation = JSON.parse(jsonMatch[0]);

    // Generate PDF
    const pdfBuffer = await generatePDF(recommendation, firstName, lastName, email);

    // Upload PDF to Supabase Storage
    const fileName = `recommendation-${Date.now()}.pdf`;
    const pdfUrl = await uploadPDFToSupabase(pdfBuffer, fileName);

    // Save to recommendations table
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    await saveToDatabase(supabaseUrl, supabaseKey, recommendation, email, firstName, lastName, pdfUrl);

    // Send email
    await sendEmailViaMailgun(email, firstName, recommendation, pdfUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pdfUrl,
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
