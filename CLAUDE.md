# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Website Builder Workspace

This is a workspace for building high-end, visually rich websites using Claude Code skills.

## Code Style

- Use clean, semantic HTML5
- CSS: Prefer utility-first approach or minimal custom CSS with smooth animations
- JavaScript: Vanilla JS or lightweight libraries only — no heavy frameworks unless required
- Keep all files well-organized in project-specific subfolders under `/active/`

## Project Structure

```
/active/                          # Each website project gets its own subfolder
/active/<project>/assets/         # Store all video (.mp4) and image files here
/active/<project>/frames/         # Extracted video frames (used in scroll animations)
/active/<project>/index.html      # Main entry point
```

## Design Principles

- High-end, luxury aesthetic with generous whitespace
- Smooth scroll-triggered animations
- Hero sections should support full-width video or image backgrounds
- Use inward masking gradients when overlaying video backgrounds
- Text must always be legible over media backgrounds (use overlays/shadows)
- Mobile responsiveness is required for every build

## Asset Handling

- Video assets may come from `downloads/` folder — always check there if not found in project
- When integrating `.mp4` as backgrounds, compress to under 500kB when possible
- For scroll animations, extract video frames as optimized JPEGs and tie to scroll position
- Preload frames for smooth performance

## Performance

- Optimize all assets before deployment
- Compress videos and images aggressively
- Lazy load anything below the fold
- Target < 3 second load time on mobile

## Deployment

- Default deployment target: Netlify (free tier)
- Use `npx netlify-cli deploy --prod -d .` for quick deploys
- Site should be self-contained (no external dependencies that could break)

## Important Rules

- NEVER delete or modify files outside of `/active/` without explicit permission
- Always ask before overwriting existing project folders
- When a skill URL is provided, fetch and apply it before starting any design work
- After building, always open a local preview so the user can review before deploying
