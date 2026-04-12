// Load and display episodes from Supabase
(function() {
  'use strict';

  async function loadEpisodes() {
    try {
      console.log('Loading episodes from API...');
      const response = await fetch('/api/episode-list');
      console.log('API response status:', response.status);
      if (!response.ok) throw new Error('Failed to load episodes');

      const episodes = await response.json();
      console.log('Loaded episodes:', episodes);
      if (!Array.isArray(episodes) || !episodes.length) {
        showError('No episodes found');
        return;
      }

      renderEpisodes(episodes);
    } catch (err) {
      console.error('Load episodes error:', err);
      showError('Could not load episodes');
    }
  }

  function renderEpisodes(episodes) {
    console.log('renderEpisodes called with:', episodes);
    const grid = document.getElementById('episodes-grid');
    console.log('Grid element:', grid);
    if (!grid) {
      console.error('Grid element not found!');
      return;
    }

    const html = episodes.map((ep, idx) => {
      const imageUrl = ep.image_url || 'assets/logo-main.png';
      const title = ep.title || 'Untitled Episode';
      const guestName = ep.guest_name ? ` with ${ep.guest_name}` : '';
      const description = ep.description || '';
      const delay = (idx % 6) + 1;

      // Determine playable URL - priority: audio > tiktok > youtube
      const playUrl = ep.audio_url || ep.tiktok || ep.youtube || null;
      const playType = ep.audio_url ? 'audio' : (ep.tiktok ? 'tiktok' : (ep.youtube ? 'youtube' : null));

      return `
        <div class="episode-thumbnail reveal" style="opacity: 1; transform: translateY(0);" data-delay="${delay}">
          <a href="${playUrl ? 'javascript:void(0)' : '#'}" onclick="playEpisode('${playUrl || ''}', '${ep.id || ''}', '${playType || ''}', event)" class="episode-thumbnail__image-wrapper">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />
            <div class="episode-thumbnail__overlay">
              <span class="episode-thumbnail__play-icon">▶</span>
            </div>
          </a>
          <h3 class="episode-thumbnail__title">${escapeHtml(title)}</h3>
          ${guestName ? `<p class="episode-thumbnail__guest" style="font-size: 13px; color: #7a7570; margin-top: 4px;">${escapeHtml(guestName)}</p>` : ''}
          ${description ? `<p class="episode-thumbnail__desc" style="font-size: 12px; color: #7a7570; margin-top: 8px; line-height: 1.4;">${escapeHtml(description.substring(0, 80))}${description.length > 80 ? '...' : ''}</p>` : ''}
          <div class="episode-thumbnail__links">
            ${playUrl ? `<a href="javascript:void(0)" onclick="playEpisode('${playUrl}', '${ep.id || ''}', '${playType || ''}', event)" class="btn btn--gold btn--xs" title="Play Episode">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px; fill: currentColor;">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </a>` : ''}
            <a href="https://www.youtube.com/@Dr.EsamAlFalasi" target="_blank" rel="noopener noreferrer" class="btn btn--ghost btn--xs" title="Watch on YouTube">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px; fill: currentColor;">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Add TikTok card at the end
    const tiktokCard = `
      <div class="episode-thumbnail reveal" style="opacity: 1; transform: translateY(0);" data-delay="7">
        <a href="https://www.tiktok.com/@dxbesam" target="_blank" rel="noopener noreferrer" class="episode-thumbnail__image-wrapper" style="background: linear-gradient(135deg, #000000 0%, #1a1a2e 100%); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="text-align: center; color: white; position: relative; z-index: 2;">
            <div style="font-size: 48px; margin-bottom: 12px;">🎵</div>
            <div style="font-size: 16px; font-weight: 600;">More Episodes</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.8;">on TikTok</div>
          </div>
          <div class="episode-thumbnail__overlay"></div>
        </a>
        <h3 class="episode-thumbnail__title">See More Episodes</h3>
        <p class="episode-thumbnail__guest" style="font-size: 13px; color: #7a7570; margin-top: 4px;">@dxbesam</p>
        <div class="episode-thumbnail__links">
          <a href="https://www.tiktok.com/@dxbesam" target="_blank" rel="noopener noreferrer" class="btn btn--gold btn--xs" title="Visit TikTok">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px; fill: currentColor;">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.86 2.86 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.54-.05z"/>
            </svg>
          </a>
        </div>
      </div>
    `;

    console.log('Generated HTML:', html);
    grid.innerHTML = html + tiktokCard;
    console.log('Episodes rendered successfully');
  }

  function showError(msg) {
    const grid = document.getElementById('episodes-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <p style="color: #e07070; font-size: 16px;">⚠️ ${escapeHtml(msg)}</p>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Global function for playing episodes
  window.playEpisode = function(url, episodeId, type, evt) {
    if (evt) evt.preventDefault();
    if (!url) {
      alert('No playable URL for this episode');
      return;
    }

    // Track episode click if id is available
    if (episodeId) {
      fetch('/.netlify/functions/track-episode-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: episodeId })
      }).catch(() => {});
    }

    // Open in new tab (works for audio, YouTube, TikTok)
    window.open(url, '_blank');
  };

  // Load on DOMContentLoaded
  console.log('episodes.js loaded, readyState:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired, calling loadEpisodes');
      loadEpisodes();
    });
  } else {
    console.log('Document already loaded, calling loadEpisodes immediately');
    loadEpisodes();
  }
})();
