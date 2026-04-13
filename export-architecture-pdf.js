#!/usr/bin/env node

/**
 * Export Architecture Diagrams to PDF
 * Requires: npm install puppeteer mermaid
 * Usage: node export-architecture-pdf.js
 */

const fs = require('fs');
const puppeteer = require('puppeteer');

const diagrams = [
  {
    name: 'System-Architecture',
    title: 'System Architecture',
    mermaid: `graph TB
    subgraph Frontend["🎨 Frontend Layer"]
        PubWeb["📱 Public Website<br/>dreampodcast.com<br/>episodes.js<br/>script.js<br/>style.css"]
        Admin["🛠️ Admin Dashboard<br/>dreampodcast.com/admin<br/>admin.js<br/>admin.css"]
    end

    subgraph Netlify["⚡ Netlify Functions<br/>(Serverless Backend)"]
        subgraph Read["Read Operations"]
            EpList["episode-list.js"]
            SubList["subscriber-list.js"]
            AnalyticsSum["analytics-summary.js"]
            ServiceReq["service-requests.js"]
        end

        subgraph Write["Write Operations"]
            EpCreate["episode-create.js"]
            EpDelete["episode-delete.js"]
            ContactForm["contact-form.js"]
            SubCreate["subscriber-create.js"]
        end

        subgraph Track["Tracking"]
            TrackPV["track-pageview.js"]
            TrackClick["track-episode-click.js"]
        end

        subgraph AI["AI/Generation"]
            GenDialogue["generate-dialogue.js"]
            GenImage["generate-image.js"]
            HeyGen["heygen-create-video.js"]
        end
    end

    subgraph Supabase["🗄️ Supabase"]
        subgraph DB["PostgreSQL Database"]
            Episodes["episodes<br/>id, title, image_url<br/>guest_name, description<br/>youtube, tiktok, view_count"]
            Subscribers["subscribers<br/>id, email, name<br/>country, subscribed_at"]
            ServiceReqs["service_requests<br/>id, service_key<br/>revenue, cost<br/>first_name, email, etc"]
            Pageviews["pageviews<br/>id, page<br/>visited_at"]
            Contacts["contacts<br/>id, name, email<br/>subject, message"]
        end

        subgraph Storage["📦 Storage (S3)"]
            EpImages["episode-images/<br/>2025 Insights.jpg<br/>AI Leadership.jpg<br/>..."]
            GenVids["generated-videos/<br/>HeyGen outputs"]
            Uploads["uploads/<br/>user files"]
        end
    end

    subgraph External["🌐 External APIs"]
        Mailgun["📧 Mailgun<br/>Email Delivery<br/>Tracking"]
        HeyGenAPI["🎬 HeyGen API<br/>Video Generation<br/>Avatar Videos"]
        Replicate["🤖 Replicate AI<br/>Image Generation<br/>SDXL Model"]
        Claude["🧠 Claude API<br/>Dialogue Generation<br/>Script Writing"]
    end

    subgraph Social["📱 Social Platforms"]
        YouTube["▶️ YouTube"]
        TikTok["🎵 TikTok"]
        Spotify["🎵 Spotify"]
        Instagram["📸 Instagram"]
        Apple["🎙️ Apple Podcasts"]
    end

    PubWeb -->|episode-list| EpList
    PubWeb -->|track-pageview| TrackPV
    PubWeb -->|track-episode-click| TrackClick
    PubWeb -->|contact form| ContactForm

    Admin -->|CRUD episodes| EpCreate
    Admin -->|episode queries| EpList
    Admin -->|delete episode| EpDelete
    Admin -->|subscriber list| SubList
    Admin -->|analytics| AnalyticsSum
    Admin -->|revenue data| ServiceReq
    Admin -->|create subscriber| SubCreate
    Admin -->|generate video| HeyGen
    Admin -->|generate image| GenImage
    Admin -->|generate dialogue| GenDialogue

    EpList -->|SELECT| Episodes
    EpCreate -->|INSERT| Episodes
    EpDelete -->|DELETE| Episodes
    SubList -->|SELECT| Subscribers
    SubCreate -->|INSERT| Subscribers
    TrackClick -->|UPDATE view_count| Episodes
    TrackPV -->|INSERT| Pageviews
    ContactForm -->|INSERT| ServiceReqs
    AnalyticsSum -->|SELECT| Pageviews
    AnalyticsSum -->|SELECT| Subscribers
    AnalyticsSum -->|SELECT| Episodes
    ServiceReq -->|SELECT| ServiceReqs
    ContactForm -->|INSERT| Contacts

    EpCreate -->|Upload/Reference| EpImages
    HeyGen -->|Store output| GenVids
    GenImage -->|Store output| Uploads

    ContactForm -->|Send email| Mailgun
    HeyGen -->|API call| HeyGenAPI
    GenImage -->|API call| Replicate
    GenDialogue -->|API call| Claude

    Episodes -->|youtube link| YouTube
    Episodes -->|tiktok link| TikTok
    PubWeb -->|Social links| Spotify
    PubWeb -->|Social links| Instagram
    PubWeb -->|Social links| Apple

    classDef frontend fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef netlify fill:#F5A623,stroke:#C67E1A,color:#fff
    classDef supabase fill:#3ECF8E,stroke:#2A9D6F,color:#fff
    classDef external fill:#BD10E0,stroke:#7B0A82,color:#fff
    classDef social fill:#FF6B6B,stroke:#CC5555,color:#fff

    class Frontend frontend
    class Netlify netlify
    class Supabase supabase
    class External external
    class Social social`
  }
];

async function exportDiagram(diagram) {
  console.log(`📄 Exporting: ${diagram.title}...`);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${diagram.title} - Dr. Esam Podcast</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 40px;
            background: #fff;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .diagram-container {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 20px;
            background: #f9f9f9;
          }
          .mermaid {
            display: flex;
            justify-content: center;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>🎙️ Dr. Esam Podcast</h1>
        <h2>${diagram.title}</h2>
        <p class="subtitle">System Architecture & Integration Diagram</p>
        <div class="diagram-container">
          <div class="mermaid">
${diagram.mermaid}
          </div>
        </div>
        <div class="footer">
          <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
          <p><strong>Project:</strong> Dr. Esam Podcast</p>
          <p><strong>Architecture:</strong> Serverless + SaaS (Netlify + Supabase)</p>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = `${diagram.name}.pdf`;
  await page.pdf({
    path: outputPath,
    format: 'A4',
    landscape: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();
  console.log(`✅ Saved: ${outputPath}`);
}

async function exportAll() {
  console.log('\n🚀 Exporting Architecture Diagrams to PDF...\n');

  for (const diagram of diagrams) {
    try {
      await exportDiagram(diagram);
    } catch (err) {
      console.error(`❌ Error exporting ${diagram.name}:`, err.message);
    }
  }

  console.log('\n✨ All diagrams exported successfully!\n');
}

// Run export
exportAll().catch(console.error);
