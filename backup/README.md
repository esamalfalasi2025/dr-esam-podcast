# Backup: localStorage Version

This folder contains the **old episode management system** that used localStorage only (before Supabase integration).

## Files

- **admin-admin.js.bak** — Old `admin/admin.js` with localStorage-based episodes
- **admin-index.html.bak** — Old `admin/index.html` episode drawer HTML

## What Changed

### Old System (localStorage):
- Episodes stored in browser's localStorage
- Images converted to base64 and embedded in the episodes object
- No database persistence
- Changes required "Save All" button to publish

### New System (Supabase):
- Episodes stored in Supabase database
- Images stored as base64 in database columns
- Real-time updates
- Automatic persistence on save
- Public site fetches episodes from Supabase API

## How to Restore localStorage Version

If you need to revert to the old localStorage system:

1. Replace `admin/admin.js` with code from `admin-admin.js.bak`
2. Replace the episode drawer HTML in `admin/index.html` with code from `admin-index.html.bak`
3. Remove the Supabase functions:
   - Delete `netlify/functions/episode-create.js`
   - Delete `netlify/functions/episode-delete.js`
   - Delete `netlify/functions/episode-list.js`
4. Update `episodes.js` on the public site to load from localStorage instead of API

## Column Reference

### Supabase episodes table columns:
- `id` (uuid) — Primary key, auto-generated
- `title` (text) — Episode title
- `image_url` (text) — Base64 encoded image or URL
- `guest_name` (text) — Guest name (nullable)
- `description` (text) — Episode description (nullable)
- `audio_url` (text) — Audio file URL (nullable)
- `youtube` (text) — YouTube URL (nullable)
- `tiktok` (text) — TikTok URL (nullable)
- `created_at` (timestamp) — Episode creation date

## Current Status

✅ Supabase integration is active
✅ Admin panel adds/edits episodes to database
✅ Public site fetches episodes from database API
✅ Images stored as base64 in database
