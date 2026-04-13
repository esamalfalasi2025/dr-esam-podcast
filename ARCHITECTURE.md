# Dr. Esam Podcast - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER (Frontend)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────────────┐         ┌──────────────────────────┐              │
│  │   PUBLIC WEBSITE         │         │    ADMIN DASHBOARD       │              │
│  │  (dreampodcast.com)      │         │ (dreampodcast.com/admin) │              │
│  │                          │         │                          │              │
│  │ • index.html             │         │ • Episodes Manager       │              │
│  │ • Episodes Page          │         │ • Services/Pricing       │              │
│  │ • Services Page          │         │ • Analytics Dashboard    │              │
│  │ • Contact Form           │         │ • Revenue Report         │              │
│  │ • About/Hero Section     │         │ • Subscribers List       │              │
│  │                          │         │ • Dialogue AI            │              │
│  │ (episodes.js)            │         │ • Image AI               │              │
│  │ (script.js)              │         │ (admin.js, admin.css)    │              │
│  │ (style.css)              │         │                          │              │
│  └──────────────────────────┘         └──────────────────────────┘              │
│           │                                        │                             │
│           └────────────────────┬───────────────────┘                            │
│                                │                                                │
└────────────────────────────────┼────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │   NETLIFY FUNCTIONS       │
                    │   (Serverless Backend)    │
                    └────────────┬──────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   SUPABASE       │   │   MAILGUN        │   │   EXTERNAL APIs  │
│   (Database &    │   │   (Email)        │   │                  │
│   Storage)       │   │                  │   │ • HeyGen (Video) │
│                  │   │ • Send emails    │   │ • Replicate (AI) │
│ Database:        │   │ • Track opens    │   │ • OpenAI         │
│ • Episodes       │   │ • Handle bounces │   │ • YouTube        │
│ • Subscribers    │   │                  │   │ • TikTok         │
│ • Service Reqs   │   └──────────────────┘   │ • Spotify        │
│ • Pageviews      │                          │ • Instagram      │
│ • Contacts       │                          │ • Google         │
│                  │                          └──────────────────┘
│ Storage:         │
│ • Episode Images │
│ • Generated Vids │
│ • Uploads        │
└──────────────────┘

```

## Detailed Component Breakdown

### 1. PUBLIC WEBSITE (Client-Side)
**Purpose:** Content delivery and user engagement

| Component | Files | Function |
|-----------|-------|----------|
| **Episodes Section** | episodes.js | Fetch & display episodes from Supabase |
| **Contact Form** | script.js | Collect user inquiries, send to Netlify |
| **Services/Pricing** | index.html, style.css | Display services with AED pricing |
| **Analytics Tracking** | script.js | Track pageviews & episode clicks |
| **Social Links** | index.html | YouTube, TikTok, Spotify, etc. |

**Key Flows:**
```
User Visit Site
    ↓
Load episodes.js
    ↓
Fetch /api/episode-list (Netlify → Supabase)
    ↓
Display episode grid with images from Supabase Storage
    ↓
Click play → Redirect to YouTube/TikTok or play audio
    ↓
Fill contact form → POST to contact-form function
```

### 2. ADMIN DASHBOARD (Client-Side)
**Purpose:** Content management and analytics

| Feature | Netlify Function | Supabase Table |
|---------|-----------------|-----------------|
| **Episodes** | episode-create, episode-delete, episode-list | episodes |
| **Subscribers** | subscriber-create, subscriber-list | subscribers |
| **Services** | N/A (hardcoded in HTML) | N/A |
| **Analytics** | analytics-summary | pageviews, episodes.view_count |
| **Revenue** | service-requests | service_requests |
| **Contacts** | N/A (stored by contact-form) | service_requests |

**Key Flows:**
```
Admin Login (Password)
    ↓
Navigate to Episodes
    ↓
Create/Edit Episode
    - Upload image to Supabase Storage OR
    - Paste Supabase Storage image URL
    - Fill title, guest, description, URLs
    ↓
Click Save → episode-create function
    ↓
Store in Supabase episodes table
    ↓
Image URL saved to image_url field (Supabase Storage reference)
```

### 3. NETLIFY FUNCTIONS (Backend/API Layer)

#### Data Flow Functions
```
┌─────────────────────────────────────────────────────────────┐
│              NETLIFY FUNCTIONS (Node.js)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  READ OPERATIONS:                                            │
│  • episode-list.js         → GET /api/episode-list          │
│  • subscriber-list.js      → GET /api/subscriber-list       │
│  • analytics-summary.js    → GET /api/analytics-summary     │
│  • service-requests.js     → GET /api/service-requests      │
│  • sync-status.js          → GET /api/sync-status           │
│  • talk-status.js          → GET /api/talk-status           │
│  • heygen-video-status.js  → GET /api/heygen-video-status   │
│  • replicate-status.js     → GET /api/replicate-status      │
│                                                               │
│  WRITE OPERATIONS:                                           │
│  • episode-create.js       → POST /api/episode-create       │
│  • episode-delete.js       → DELETE /api/episode-delete     │
│  • contact-form.js         → POST /api/contact-form         │
│  • subscriber-create.js    → POST /api/subscriber-create    │
│  • upload-image.js         → POST /api/upload-image         │
│  • upload-audio.js         → POST /api/upload-audio         │
│  • send-bulk-email.js      → POST /api/send-bulk-email      │
│  • send-confirmation-email → POST /api/send-confirmation    │
│                                                               │
│  AI/GENERATION:                                              │
│  • generate-dialogue.js    → POST /api/generate-dialogue    │
│  • generate-image.js       → POST /api/generate-image       │
│  • heygen-create-video.js  → POST /api/heygen-create-video  │
│  • heygen-upload-photo.js  → POST /api/heygen-upload-photo  │
│  • replicate-create.js     → POST /api/replicate-create     │
│                                                               │
│  TRACKING:                                                   │
│  • track-pageview.js       → POST /api/track-pageview       │
│  • track-episode-click.js  → POST /api/track-episode-click  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4. SUPABASE (Database & Storage)

#### Database Schema
```
┌────────────────────────────────────────────────────────────────┐
│                    SUPABASE PostgreSQL                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  episodes                           subscribers                │
│  ├─ id (UUID, PK)                   ├─ id (UUID, PK)           │
│  ├─ title (TEXT)                    ├─ email (TEXT, UNIQUE)    │
│  ├─ image_url (TEXT)                ├─ name (TEXT)             │
│  ├─ guest_name (TEXT)               ├─ country (TEXT)          │
│  ├─ description (TEXT)              ├─ subscribed_at (TIMESTAMP)
│  ├─ audio_url (TEXT) [REMOVED]      └─ unsubscribed_at (TIMESTAMP)
│  ├─ youtube (TEXT)                                             │
│  ├─ tiktok (TEXT)                   service_requests           │
│  ├─ view_count (INT)                ├─ id (UUID, PK)           │
│  └─ created_at (TIMESTAMP)          ├─ service_key (TEXT)      │
│                                      ├─ first_name (TEXT)       │
│  pageviews                           ├─ last_name (TEXT)        │
│  ├─ id (UUID, PK)                   ├─ email (TEXT)            │
│  ├─ page (TEXT)                     ├─ revenue (NUMERIC)       │
│  └─ visited_at (TIMESTAMP)          ├─ cost (NUMERIC)          │
│                                      ├─ markup (NUMERIC)        │
│  contacts                            ├─ created_at (TIMESTAMP)  │
│  ├─ id (UUID, PK)                   └─ details (JSONB)         │
│  ├─ name (TEXT)                                                │
│  ├─ email (TEXT)                                               │
│  ├─ subject (TEXT)                                             │
│  └─ message (TEXT)                                             │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

#### Storage Buckets
```
Supabase Storage (S3-like)
├── episode-images/
│   ├── 2025 Insights.jpg
│   ├── AI Leadership.jpg
│   ├── Dr Esam.jpg
│   └── [other episode images]
├── generated-videos/
│   └── [HeyGen video outputs]
└── uploads/
    └── [user uploaded files]
```

### 5. EXTERNAL INTEGRATIONS

#### Email (Mailgun)
```
contact-form.js
    ↓
POST to Mailgun API
    ├─ To: esamalfalasi@gmail.com (hardcoded)
    ├─ From: noreply@dreampodcast.com
    ├─ Subject: Service Request [Service Name]
    ├─ Body: {name, email, service, details}
    └─ Markup: Service cost + 50% professional markup
    ↓
Mailgun Sends Email
    ↓
Tracking: Opens, clicks, bounces
```

**Mailgun Config:**
- Domain: dreampodcast.com
- API Key: MAILGUN_API_KEY (env var)
- Recipient: esamalfalasi@gmail.com

#### Video Generation (HeyGen)
```
admin/index.html (Podcast Video tab)
    ↓
heygen-create-video.js
    ├─ Upload scene image
    ├─ Upload character image
    ├─ HeyGen API generates video
    └─ Store result in Supabase Storage
    ↓
heygen-video-status.js (poll for completion)
```

#### Image Generation (Replicate)
```
admin/index.html (Image AI tab)
    ↓
generate-image.js
    ├─ Image 1 (scene)
    ├─ Image 2 (character)
    ├─ Prompt (custom instructions)
    ↓
Replicate API (SDXL model)
    ↓
Generate AI image
    ↓
replicate-status.js (poll for completion)
```

#### AI Dialogue (Claude AI)
```
admin/index.html (Dialogue AI tab)
    ↓
generate-dialogue.js
    ├─ Host name
    ├─ Guest name
    ├─ Topic
    ├─ Duration (minutes)
    ↓
Claude API (/api/messages)
    ├─ System: "You are a podcast dialogue writer"
    ├─ User: Generate {duration} minute dialogue
    ↓
Generate podcast script
    ↓
Export as .docx, .pdf, or .txt
```

### 6. DATA FLOW DIAGRAMS

#### Contact Form Submission Flow
```
┌────────────────────────────────────────────────────────────────┐
│                  CONTACT FORM SUBMISSION                       │
└────────────────────────────────────────────────────────────────┘

Customer fills form
├─ First Name
├─ Last Name
├─ Email
└─ Service Selection (with AED pricing)
    ↓
Click "SUBMIT"
    ↓
POST to /.netlify/functions/contact-form
    ↓
contact-form.js processes:
    ├─ Validate input
    ├─ Lookup PRICING for selected service
    │  └─ Cost (base) + Revenue (50% markup) = Total
    ├─ Fire Mailgun (async, non-blocking)
    │  └─ Send to esamalfalasi@gmail.com with cost details
    └─ Fire Supabase Insert (async, non-blocking)
       └─ INSERT service_requests {
            first_name, last_name, email, service_key,
            revenue, cost, markup, created_at, details
          }
    ↓
Return 200 OK to client
    ↓
Show success toast message
    ↓
Email sent immediately
    ↓
Data stored in Supabase for analytics
```

#### Analytics Data Collection
```
┌────────────────────────────────────────────────────────────────┐
│               ANALYTICS & TRACKING FLOW                        │
└────────────────────────────────────────────────────────────────┘

USER VISITS SITE
    ↓
script.js fires pageview tracking
    ↓
POST to /.netlify/functions/track-pageview
    ├─ page: "/" or "/episodes" or "/services"
    └─ timestamp: NOW()
    ↓
INSERT INTO pageviews (page, visited_at)
    ↓
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

USER PLAYS EPISODE
    ↓
episodes.js: playEpisode(id, type)
    ↓
POST to /.netlify/functions/track-episode-click
    ├─ id: episode UUID
    └─ timestamp: NOW()
    ↓
Call Supabase RPC increment_episode_view(episode_id)
    ↓
UPDATE episodes SET view_count = view_count + 1 WHERE id = ?
    ↓
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

ADMIN VIEWS ANALYTICS
    ↓
admin/index.html: Click "Analytics" tab
    ↓
GET /.netlify/functions/analytics-summary
    ├─ Query: COUNT(*) FROM pageviews
    ├─ Query: COUNT(*), country FROM subscribers GROUP BY country
    └─ Query: SELECT id, title, view_count FROM episodes ORDER BY view_count DESC
    ↓
analytics.js renders:
    ├─ Total Visits (stat card)
    ├─ Total Subscribers (stat card)
    ├─ Countries Reached (stat card)
    ├─ Bar Chart: Episode Plays (horizontal bars)
    ├─ Pie Chart: Subscribers by Country
    └─ Refresh Button
```

#### Episode Management Flow
```
┌────────────────────────────────────────────────────────────────┐
│           EPISODE CREATION & IMAGE MANAGEMENT                  │
└────────────────────────────────────────────────────────────────┘

ADMIN IN EPISODE EDITOR
    ↓
┌─ Upload Method Option 1: File Upload
│  ├─ Click file upload area
│  ├─ Select JPG/PNG from computer
│  ├─ Preview shows
│  └─ Converted to base64 (pendingImageData)
│
└─ Upload Method Option 2: Paste Supabase URL
   ├─ Get image URL from Supabase Storage
   │  Format: https://[url]/storage/v1/object/public/episode-images/[filename]
   └─ Paste in "Image URL (Supabase Storage)" field
    ↓
Fill Episode Details:
├─ Title (required)
├─ Guest Name (optional)
├─ Description (optional)
├─ YouTube URL (optional)
└─ TikTok URL (optional)
    ↓
Click "💾 Save Episode"
    ↓
saveEpisode() in admin.js
    ├─ Determine image_url (priority):
    │  1. Pasted URL
    │  2. Uploaded file (base64)
    │  3. Existing image (if editing)
    └─ Create episode object
    ↓
POST to /.netlify/functions/episode-create
    ↓
episode-create.js:
    ├─ Validate: title is required
    └─ INSERT INTO episodes {
        title, image_url, guest_name,
        description, youtube, tiktok, created_at
       }
    ↓
Return new episode to admin
    ↓
renderEpisodes() refreshes list
    ↓
✓ Episode saved successfully

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

PUBLIC SITE LOADS EPISODE
    ↓
episodes.js: loadEpisodes()
    ├─ GET /api/episode-list
    └─ episode-list.js queries:
       SELECT id, title, created_at, youtube, tiktok, image_url
       FROM episodes ORDER BY created_at DESC
    ↓
For each episode:
    ├─ image_url points to Supabase Storage (or base64 if old)
    ├─ Load image from Supabase CDN
    └─ Render episode card with metadata
    ↓
✓ Episodes displayed on public site
```

#### Revenue Report Flow
```
┌────────────────────────────────────────────────────────────────┐
│            REVENUE REPORT & ANALYTICS                          │
└────────────────────────────────────────────────────────────────┘

ADMIN VIEWS REVENUE REPORT
    ↓
admin/index.html: Click "💰 Revenue Report" tab
    ↓
revenue-report.js initializes
    ├─ Set default date range: Last 30 days
    └─ Load data
    ↓
GET /.netlify/functions/service-requests?from=2026-03-13&to=2026-04-12
    ↓
service-requests.js:
    ├─ Parse date range from query params
    ├─ Query Supabase:
    │  SELECT service_key, SUM(revenue), SUM(cost), COUNT(*)
    │  FROM service_requests
    │  WHERE created_at >= from AND created_at <= to
    │  GROUP BY service_key
    └─ Return aggregated data
    ↓
revenue-report.js renders:
    ├─ Stat Cards:
    │  ├─ Total Revenue (AED)
    │  ├─ Total Cost (AED)
    │  ├─ Total Profit (AED)
    │  └─ Number of Requests
    │
    ├─ Charts (Chart.js):
    │  ├─ Bar Chart: Revenue per Service
    │  └─ Pie Chart: Revenue Distribution by Service
    │
    ├─ Detailed Table:
    │  ├─ Service Name
    │  ├─ Count (requests)
    │  ├─ Cost (sum)
    │  ├─ Revenue (sum)
    │  ├─ Profit (revenue - cost)
    │  └─ % of Total Revenue
    │
    └─ Export Options:
       ├─ CSV Download (Excel compatible)
       └─ PDF Download (formatted report)
    ↓
USER can:
    ├─ Change date range
    ├─ Click "Refresh" to reload
    ├─ Download CSV for spreadsheet analysis
    └─ Download PDF for stakeholder reports
```

## Security & Access Control

```
┌────────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                              │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PUBLIC SITE:                                                    │
│ ├─ No authentication required                                  │
│ ├─ CORS enabled for episode fetching                           │
│ └─ Contact form: Hardcoded recipient email (hidden from UI)    │
│                                                                  │
│ ADMIN DASHBOARD:                                               │
│ ├─ Password protection (localStorage check)                    │
│ ├─ Session storage for auth state                              │
│ └─ Access to all management functions restricted               │
│                                                                  │
│ SUPABASE:                                                       │
│ ├─ Row Level Security (RLS) policies                           │
│ ├─ API key authentication (in function headers)                │
│ └─ Public read access (episodes) / Restricted write            │
│                                                                  │
│ NETLIFY FUNCTIONS:                                             │
│ ├─ Environment variables (SUPABASE_URL, SUPABASE_KEY, etc.)    │
│ ├─ CORS headers configured                                     │
│ └─ Input validation on all endpoints                           │
│                                                                  │
│ MAILGUN:                                                        │
│ ├─ API key in environment variables (not exposed to client)    │
│ ├─ Hardcoded recipient email                                   │
│ └─ Domain verification required                                │
│                                                                  │
│ EXTERNAL APIs:                                                  │
│ ├─ OpenAI API key (env var)                                    │
│ ├─ HeyGen API credentials (env var)                            │
│ └─ Replicate API token (env var)                               │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Environment Variables Required

```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon-key-or-service-key]
MAILGUN_API_KEY=[your-api-key]
MAILGUN_DOMAIN=dreampodcast.com
OPENAI_API_KEY=[for-dialogue-generation]
HEYGEN_API_KEY=[for-video-generation]
REPLICATE_API_TOKEN=[for-image-generation]
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT STACK                             │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ VERSION CONTROL:                                               │
│ ├─ GitHub (esamalfalasi2025/dr-esam-podcast)                   │
│ └─ Branch: clean-main                                          │
│                                                                  │
│ HOSTING & DEPLOYMENT:                                          │
│ ├─ Netlify (Frontend + Functions)                              │
│ ├─ Auto-deploy on git push                                     │
│ ├─ CDN for static assets (global edge locations)               │
│ └─ Production URL: https://genuine-dusk-a5bde9.netlify.app    │
│                                                                  │
│ DATABASE HOSTING:                                              │
│ ├─ Supabase Cloud (PostgreSQL managed service)                 │
│ ├─ Automatic backups                                           │
│ ├─ Point-in-time recovery                                      │
│ └─ S3-compatible object storage for files                      │
│                                                                  │
│ EMAIL SERVICE:                                                  │
│ ├─ Mailgun (transactional email SaaS)                          │
│ ├─ Domain-based authentication                                 │
│ └─ Delivery & bounce tracking                                  │
│                                                                  │
│ CUSTOM DOMAIN:                                                  │
│ ├─ dreampodcast.com (via domain registrar)                     │
│ └─ DNS → Netlify nameservers                                   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Performance & Scalability

| Component | Type | Scaling | Status |
|-----------|------|---------|--------|
| **CDN (Netlify)** | Edge | Automatic | Auto-scales globally |
| **Functions** | Serverless | Per-request | Pay-as-you-go |
| **Database** | PostgreSQL | Vertical | Upgrade plan as needed |
| **Storage** | S3-compatible | Unlimited | Billed per GB |
| **Email** | SaaS | Unlimited | Monthly allocation |

## Summary

**Frontend:** React-less vanilla JS with minimal dependencies
**Backend:** Serverless Netlify Functions (Node.js)
**Database:** Supabase PostgreSQL with RLS
**Storage:** Supabase Storage (S3)
**Email:** Mailgun API
**AI/Video:** HeyGen, Replicate, OpenAI APIs
**Hosting:** Netlify (frontend + functions) + Supabase (backend)

This architecture is:
✅ **Scalable** - Serverless auto-scales
✅ **Cost-effective** - Pay per usage
✅ **Maintainable** - Clear separation of concerns
✅ **Secure** - Environment variables, RLS policies
✅ **Integrated** - Multiple third-party services working together
