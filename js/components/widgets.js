/**
 * widgets.js — Spatial Hub Widgets Controller (Chikoo)
 *
 * Featured Widgets:
 *  1. Music Hub (Persistent YouTube Player — continuous background audio across tab switches)
 *     - Video Mode (with collapsible Saved Songs for Full Length Video view)
 *     - Only Music Mode (with vinyl turntable visualizer and full controls)
 *  2. Chikoo AI (Gemini AI — API key based smart chat assistant)
 *  3. Pomodoro Focus Timer (25m/5m/15m + Progress Ring)
 *  4. Weather & Forecast (Auto-Geolocation + Manual City Search)
 *  5. Scribble Hub & Whiteboard (Text Notepad + Responsive Touch HTML5 Canvas)
 */

const WidgetsController = (() => {
  const STORAGE_KEY          = 'aura_active_widget';
  const SCRIBBLE_KEY         = 'scribble_content';
  const CHAT_KEY             = 'ai_chat_history';
  const GEMINI_KEY_SK        = 'gemini_api_key';
  const CANVAS_KEY           = 'scribble_canvas_data';
  const SCRIBBLE_MODE        = 'scribble_active_mode';
  const SAVED_SONGS_KEY      = 'aura_saved_songs';
  const MUSIC_MODE_KEY       = 'aura_music_mode';
  const MUSIC_SAVED_OPEN_KEY = 'aura_music_saved_open';

  // ═══════════════════════════════════════════════════════════
  //  MUSIC ENGINE STATE (YouTube Direct Embed)
  // ═══════════════════════════════════════════════════════════
  let _audioPlaying = false;
  let _volume = 0.7;

  let _currentTrack = {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl — Lofi Hip Hop Radio',
    artist: 'Live Stream 24/7',
    thumb: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  };

  // Curated YouTube Streams / Presets
  const YT_PRESETS = [
    
  ];

  // Default initial saved songs
  const DEFAULT_SAVED_SONGS = [
    {
      id: 'jfKfPfyJRdk',
      title: 'Lofi Girl - Lofi Hip Hop Radio',
      artist: 'Chikoo Favorites',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      thumb: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
      addedAt: Date.now()
    },
    {
      id: '4xDzrJKXOOY',
      title: 'Synthwave Radio - Chill synth',
      artist: 'Chikoo Favorites',
      url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
      thumb: 'https://img.youtube.com/vi/4xDzrJKXOOY/mqdefault.jpg',
      addedAt: Date.now() - 1000
    }
  ];

  // Gemini API Model Endpoints
  const GEMINI_ENDPOINTS = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
  ];

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://piped-api.garudalinux.org'
  ];

  let _active = 'music';
  let _musicViewMode = 'video';     // 'video' | 'audio'
  let _songsPanelOpen = true;       // toggle: show/hide saved songs below video for full length mode

  // ═══════════════════════════════════════════════════════════
  //  POMODORO TIMER STATE
  // ═══════════════════════════════════════════════════════════
  let _timerSeconds = 25 * 60;
  let _timerTotal = 25 * 60;
  let _timerMode = 'work';
  let _timerRunning = false;
  let _timerInterval = null;

  const TIMER_MODES = {
    work: { label: 'Work Focus', duration: 25 * 60, icon: '🎯' },
    shortBreak: { label: 'Short Break', duration: 5 * 60, icon: '☕' },
    longBreak: { label: 'Long Break', duration: 15 * 60, icon: '🌴' }
  };

  async function _loadState() {
    const data = await Storage.get([STORAGE_KEY, MUSIC_MODE_KEY, MUSIC_SAVED_OPEN_KEY]);
    _active = data[STORAGE_KEY] ?? 'music';
    _musicViewMode = data[MUSIC_MODE_KEY] ?? 'video';
    _songsPanelOpen = data[MUSIC_SAVED_OPEN_KEY] ?? true;
  }

  async function _saveState() {
    await Storage.set({ [STORAGE_KEY]: _active });
  }

  function _extractYouTubeId(input) {
    if (!input) return null;
    const str = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = str.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // ═══════════════════════════════════════════════════════════
  //  PERSISTENT IFRAME POSITIONING & ENGINE
  // ═══════════════════════════════════════════════════════════
  function _positionPersistentIframe() {
    const wrapper = document.getElementById('persistent-yt-wrapper');
    const slot = document.getElementById('music-video-slot');
    if (!wrapper) return;

    if (slot && _active === 'music' && _musicViewMode === 'video') {
      const slotRect = slot.getBoundingClientRect();
      if (slotRect.width > 0 && slotRect.height > 0) {
        wrapper.style.display = 'block';
        wrapper.style.position = 'fixed';
        wrapper.style.top = `${slotRect.top}px`;
        wrapper.style.left = `${slotRect.left}px`;
        wrapper.style.width = `${slotRect.width}px`;
        wrapper.style.height = `${slotRect.height}px`;
        wrapper.style.opacity = '1';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.zIndex = '50';
        return;
      }
    }

    wrapper.style.display = 'block';
    wrapper.style.position = 'fixed';
    wrapper.style.top = '-9999px';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '1px';
    wrapper.style.height = '1px';
    wrapper.style.opacity = '0';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '-1';
  }

  function _loadIframeSrc(id) {
    const iframe = document.getElementById('yt-embed-iframe');
    if (!iframe) return;
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
    _audioPlaying = true;
    _syncFullPlayerUI();
    _updateMiniPlayer();
  }

  function _updateMiniPlayer() {
    const mmp = document.getElementById('music-mini-player');
    if (!mmp) return;

    if (_active === 'music') {
      mmp.style.display = 'none';
      return;
    }

    if (!_audioPlaying && !_currentTrack.id) {
      mmp.style.display = 'none';
      return;
    }

    mmp.style.display = 'flex';

    const thumbImg = document.getElementById('mmp-thumb');
    const fallbackIcon = document.getElementById('mmp-icon');
    const nameEl = document.getElementById('mmp-name');
    const artistEl = document.getElementById('mmp-artist');
    const toggleEl = document.getElementById('mmp-toggle');

    if (nameEl) nameEl.textContent = _currentTrack.title || 'Playing Music';
    if (artistEl) artistEl.textContent = _currentTrack.artist || 'Chikoo Music';
    if (toggleEl) toggleEl.textContent = _audioPlaying ? '⏸' : '▶';

    if (thumbImg && fallbackIcon) {
      if (_currentTrack.thumb) {
        thumbImg.src = _currentTrack.thumb;
        thumbImg.style.display = 'block';
        fallbackIcon.style.display = 'none';
      } else {
        thumbImg.style.display = 'none';
        fallbackIcon.style.display = 'inline';
      }
    }

    mmp.classList.toggle('paused', !_audioPlaying);

    if (toggleEl) {
      const fresh = toggleEl.cloneNode(true);
      toggleEl.replaceWith(fresh);
      fresh.addEventListener('click', () => {
        _togglePlayback();
        _updateMiniPlayer();
      });
    }

    const gotoEl = document.getElementById('mmp-goto');
    if (gotoEl) {
      const fresh = gotoEl.cloneNode(true);
      gotoEl.replaceWith(fresh);
      fresh.addEventListener('click', () => {
        switchTo('music');
      });
    }
  }

  function _togglePlayback() {
    const iframe = document.getElementById('yt-embed-iframe');
    if (iframe && iframe.contentWindow) {
      const cmd = _audioPlaying ? 'pauseVideo' : 'playVideo';
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
      _audioPlaying = !_audioPlaying;
    }
    _syncFullPlayerUI();
    _updateMiniPlayer();
  }

  function _setVolume(volPercent) {
    _volume = volPercent / 100;
    const iframe = document.getElementById('yt-embed-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volPercent] }), '*');
    }
  }

  function _syncFullPlayerUI() {
    const audioPlayBtn = document.getElementById('audio-play-btn');
    const vinyl = document.getElementById('music-vinyl');
    const visBars = document.getElementById('audio-vis-bars');
    const trackTitle = document.getElementById('audio-track-title');
    const trackArtist = document.getElementById('audio-track-artist');

    if (audioPlayBtn) audioPlayBtn.textContent = _audioPlaying ? '⏸ Pause' : '▶ Play';
    if (vinyl) vinyl.classList.toggle('paused', !_audioPlaying);
    if (visBars) visBars.classList.toggle('active', _audioPlaying);
    if (trackTitle) trackTitle.textContent = _currentTrack.title || 'Lofi Chill Beats';
    if (trackArtist) trackArtist.textContent = _currentTrack.artist || 'YouTube Stream';
  }

  // ═══════════════════════════════════════════════════════════
  //  1. MUSIC HUB WIDGET
  // ═══════════════════════════════════════════════════════════
  async function _renderMusic(display) {
    const stored = await Storage.get([SAVED_SONGS_KEY]);
    let savedSongs = stored[SAVED_SONGS_KEY] ?? DEFAULT_SAVED_SONGS;

    display.innerHTML = `
      <div class="widget-view widget-music">
        
        <!-- 1. MUSIC HUB HEADER BAR: Mode Switcher & Saved Songs Toggle -->
        <div class="music-hub-header">
          <div class="music-mode-toggle">
            <button class="music-mode-btn ${_musicViewMode === 'video' ? 'active' : ''}" id="btn-music-mode-video">
              📹 Video Mode
            </button>
            <button class="music-mode-btn ${_musicViewMode === 'audio' ? 'active' : ''}" id="btn-music-mode-audio">
              🎵 Only Music Mode
            </button>
          </div>

          <div class="music-header-actions">
            ${_musicViewMode === 'video' ? `
              <button class="music-toggle-saved-btn ${!_songsPanelOpen ? 'expanded' : ''}" id="btn-toggle-saved" title="Toggle Saved Songs & Quick Tracks panel for full length video">
                ${_songsPanelOpen ? '📐 Full Length Video' : '📋 Show Saved Songs'}
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 2. DIRECT SEARCH / PLAY & SAVE SONG INPUT BAR -->
        <div class="music-yt-bar" id="yt-url-section">
          <input
            type="text"
            class="music-url-input"
            id="music-yt-input"
            placeholder="Paste YouTube link / Video ID, or search song (e.g. Lofi, Arijit)..."
            autocomplete="off"
          />
          <button class="music-load-btn" id="music-yt-load">▶ Play</button>
          <button class="music-save-btn" id="music-yt-save-link" title="Save song to My Saved Songs">⭐ Save Song</button>
        </div>

        <!-- 3. MAIN PLAYER CONTAINER -->
        ${_musicViewMode === 'video' ? `
          <!-- VIDEO MODE: Slot for Persistent Iframe -->
          <div class="music-video-wrapper ${_songsPanelOpen ? 'has-saved-panel' : 'full-length'}">
            <div class="music-video-slot" id="music-video-slot"></div>
          </div>
        ` : `
          <!-- ONLY MUSIC MODE: Audio Visualizer & Turntable Card -->
          <div class="music-audio-card">
            <div class="audio-card-inner">
              <div class="audio-turntable-wrap">
                <div class="music-vinyl ${!_audioPlaying ? 'paused' : ''}" id="music-vinyl">
                  <img src="${_currentTrack.thumb || 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg'}" alt="Album Art" class="vinyl-art" />
                  <div class="vinyl-center"></div>
                </div>
              </div>
              <div class="audio-details">
                <div class="audio-track-title" id="audio-track-title">${_esc(_currentTrack.title || 'Lofi Chill Beats')}</div>
                <div class="audio-track-artist" id="audio-track-artist">${_esc(_currentTrack.artist || 'YouTube Stream')}</div>
                
                <!-- Visualizer Bars -->
                <div class="audio-vis-bars ${_audioPlaying ? 'active' : ''}" id="audio-vis-bars">
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                  <div class="avis-bar"></div>
                </div>

                <!-- Audio Controls -->
                <div class="audio-controls-row">
                  <button class="audio-play-btn" id="audio-play-btn">${_audioPlaying ? '⏸ Pause' : '▶ Play'}</button>
                  <div class="audio-vol-wrap">
                    <span class="vol-icon">🔊</span>
                    <input type="range" class="audio-vol-slider" id="audio-vol-slider" min="0" max="100" value="${Math.round(_volume * 100)}" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        `}

        <!-- 4. SAVED SONGS & QUICK TRACKS SECTION (Shown if songsPanelOpen is true OR in Audio Mode) -->
        <div class="music-saved-section" id="music-saved-section" style="${(_musicViewMode === 'audio' || _songsPanelOpen) ? 'display:flex;' : 'display:none;'}">
          <div class="music-preset-title-row">
            <span class="music-preset-title" id="preset-group-title">⭐ My Saved Songs & Quick Tracks (${savedSongs.length})</span>
          </div>
          <div class="music-preset-grid-scrollable" id="preset-grid">
            ${_renderSavedAndPresetsCombined(savedSongs, YT_PRESETS, _currentTrack.id)}
          </div>
        </div>

      </div>
    `;

    // Ensure iframe is loaded on first launch if empty
    const iframe = document.getElementById('yt-embed-iframe');
    if (iframe && !iframe.src) {
      _loadIframeSrc(_currentTrack.id);
    }

    // Mode Toggle Event Listeners
    const btnVideoMode   = document.getElementById('btn-music-mode-video');
    const btnAudioMode   = document.getElementById('btn-music-mode-audio');
    const btnToggleSaved = document.getElementById('btn-toggle-saved');

    btnVideoMode?.addEventListener('click', async () => {
      _musicViewMode = 'video';
      await Storage.set({ [MUSIC_MODE_KEY]: 'video' });
      _renderMusic(display);
    });

    btnAudioMode?.addEventListener('click', async () => {
      _musicViewMode = 'audio';
      await Storage.set({ [MUSIC_MODE_KEY]: 'audio' });
      _renderMusic(display);
    });

    btnToggleSaved?.addEventListener('click', async () => {
      _songsPanelOpen = !_songsPanelOpen;
      await Storage.set({ [MUSIC_SAVED_OPEN_KEY]: _songsPanelOpen });
      _renderMusic(display);
    });

    // Audio Mode Controls
    const audioPlayBtn   = document.getElementById('audio-play-btn');
    const audioVolSlider = document.getElementById('audio-vol-slider');

    audioPlayBtn?.addEventListener('click', () => {
      _togglePlayback();
    });

    audioVolSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      _setVolume(val);
    });

    // Input Search / Load / Save handlers
    const ytInput       = document.getElementById('music-yt-input');
    const ytLoadBtn     = document.getElementById('music-yt-load');
    const ytSaveLinkBtn = document.getElementById('music-yt-save-link');
    const presetGrid    = document.getElementById('preset-grid');
    const presetGroupTitle = document.getElementById('preset-group-title');

    function playYouTubeVideo(id, title, artist, thumb) {
      _currentTrack = { id, title, artist, thumb };
      _loadIframeSrc(id);
      _syncFullPlayerUI();
      _updateMiniPlayer();
    }

    function renderSavedList() {
      if (!presetGrid) return;
      presetGrid.innerHTML = _renderSavedAndPresetsCombined(savedSongs, YT_PRESETS, _currentTrack.id);
      bindCardEvents();
    }

    async function addNewSavedSong(urlOrId, customTitle = '') {
      const ytId = _extractYouTubeId(urlOrId);
      if (!ytId) {
        searchSongs(urlOrId);
        return;
      }

      const title = customTitle.trim() || `Saved Song (${ytId})`;
      const newSong = {
        id: ytId,
        title: title,
        artist: 'My Saved Collection',
        url: `https://www.youtube.com/watch?v=${ytId}`,
        thumb: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
        addedAt: Date.now()
      };

      savedSongs.unshift(newSong);
      await Storage.set({ [SAVED_SONGS_KEY]: savedSongs });
      if (presetGroupTitle) presetGroupTitle.textContent = `⭐ My Saved Songs & Quick Tracks (${savedSongs.length})`;
      renderSavedList();
      playYouTubeVideo(ytId, title, 'My Saved Collection', newSong.thumb);
    }

    async function searchSongs(query) {
      if (!query.trim()) return;
      if (presetGroupTitle) presetGroupTitle.textContent = `🔍 Search Results for "${query}"`;
      if (presetGrid) presetGrid.innerHTML = `<div class="radio-loading"><span style="font-size:1.5rem">🔍</span> Searching songs...</div>`;

      let results = null;
      for (const base of PIPED_INSTANCES) {
        try {
          const resp = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
            headers: { 'Accept': 'application/json' }
          });
          if (!resp.ok) continue;
          const data = await resp.json();
          if (data && data.items && data.items.length) {
            results = data.items.filter(i => i.url && i.url.startsWith('/watch'));
            break;
          }
        } catch(e) {}
      }

      if (!results || results.length === 0) {
        const rawId = _extractYouTubeId(query);
        if (rawId) {
          playYouTubeVideo(rawId, query, 'YouTube Search', `https://img.youtube.com/vi/${rawId}/hqdefault.jpg`);
          return;
        }

        if (presetGrid) {
          presetGrid.innerHTML = `
            <div class="radio-loading">
              ❌ Couldn't load search results. Try pasting a direct YouTube video link!
            </div>
          `;
        }
        return;
      }

      if (presetGrid) {
        presetGrid.innerHTML = results.slice(0, 12).map(item => {
          const videoId = (item.url || '').replace('/watch?v=', '');
          const thumb = item.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          const title = item.title || 'YouTube Song';
          const uploader = item.uploaderName || 'YouTube Artist';
          return `
            <div class="music-preset-card search-result-card" data-yt-id="${_esc(videoId)}" data-title="${_esc(title)}" data-artist="${_esc(uploader)}" data-thumb="${_esc(thumb)}">
              <div class="mp-thumb-wrap">
                <img src="${_esc(thumb)}" alt="" class="mp-thumb-img" onerror="this.src='https://img.youtube.com/vi/${_esc(videoId)}/mqdefault.jpg'" />
                <span class="mp-play-badge">▶</span>
              </div>
              <div class="mp-card-info">
                <div class="mp-card-title">${_esc(title)}</div>
                <div class="mp-card-sub">${_esc(uploader)}</div>
              </div>
              <button class="search-save-song-btn" data-yt-id="${_esc(videoId)}" data-title="${_esc(title)}" data-artist="${_esc(uploader)}" data-thumb="${_esc(thumb)}" title="Save to My Songs">⭐</button>
            </div>
          `;
        }).join('');

        bindCardEvents();
      }
    }

    function handleInputPlay() {
      const val = ytInput?.value.trim();
      if (!val) return;
      const ytId = _extractYouTubeId(val);
      if (ytId) {
        playYouTubeVideo(ytId, 'Custom YouTube Video', 'YouTube Stream', `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
      } else {
        searchSongs(val);
      }
    }

    ytLoadBtn?.addEventListener('click', handleInputPlay);
    ytInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleInputPlay(); });

    ytSaveLinkBtn?.addEventListener('click', () => {
      const val = ytInput?.value.trim();
      if (!val) {
        alert('Please enter a YouTube video URL or ID to save.');
        return;
      }
      addNewSavedSong(val);
      if (ytInput) ytInput.value = '';
    });

    function bindCardEvents() {
      if (!presetGrid) return;
      presetGrid.querySelectorAll('.music-preset-card').forEach(card => {
        card.addEventListener('click', () => {
          presetGrid.querySelectorAll('.music-preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const { ytId, title, artist, thumb } = card.dataset;
          if (ytId) playYouTubeVideo(ytId, title, artist, thumb);
        });
      });

      presetGrid.querySelectorAll('.saved-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (idx >= 0 && idx < savedSongs.length) {
            savedSongs.splice(idx, 1);
            await Storage.set({ [SAVED_SONGS_KEY]: savedSongs });
            if (presetGroupTitle) presetGroupTitle.textContent = `⭐ My Saved Songs & Quick Tracks (${savedSongs.length})`;
            renderSavedList();
          }
        });
      });

      presetGrid.querySelectorAll('.search-save-song-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const { ytId, title } = btn.dataset;
          addNewSavedSong(ytId, title);
          btn.textContent = '✓';
          btn.style.background = '#10b981';
        });
      });
    }

    bindCardEvents();

    setTimeout(_positionPersistentIframe, 40);
  }

  function _renderSavedAndPresetsCombined(savedList, presetsList, activeId) {
    let html = '';
    if (savedList && savedList.length > 0) {
      html += savedList.map((s, idx) => `
        <div class="music-preset-card saved-song-card ${s.id === activeId ? 'active' : ''}" data-yt-id="${_esc(s.id)}" data-title="${_esc(s.title)}" data-artist="${_esc(s.artist)}" data-thumb="${_esc(s.thumb)}">
          <div class="mp-thumb-wrap">
            <img src="${_esc(s.thumb)}" alt="${_esc(s.title)}" class="mp-thumb-img" onerror="this.src='https://img.youtube.com/vi/${_esc(s.id)}/mqdefault.jpg'" />
            <span class="mp-play-badge">▶</span>
          </div>
          <div class="mp-card-info">
            <div class="mp-card-title">${_esc(s.title)}</div>
            <div class="mp-card-sub">⭐ Saved Link</div>
          </div>
          <button class="saved-delete-btn" data-idx="${idx}" title="Delete Saved Song">🗑️</button>
        </div>
      `).join('');
    }

    if (presetsList && presetsList.length > 0) {
      html += presetsList.map(p => `
        <div class="music-preset-card ${p.id === activeId ? 'active' : ''}" data-yt-id="${p.id}" data-title="${_esc(p.title)}" data-artist="${_esc(p.artist)}" data-thumb="${_esc(p.thumb)}">
          <div class="mp-thumb-wrap">
            <img src="${p.thumb}" alt="${_esc(p.title)}" class="mp-thumb-img" />
            <span class="mp-play-badge">▶</span>
          </div>
          <div class="mp-card-info">
            <div class="mp-card-title">${_esc(p.title)}</div>
            <div class="mp-card-sub">${_esc(p.artist)}</div>
          </div>
        </div>
      `).join('');
    }

    return html;
  }

  // ═══════════════════════════════════════════════════════════
  //  2. CHIKOO AI ASSISTANT WIDGET (Google Gemini)
  // ═══════════════════════════════════════════════════════════
  async function _renderAI(display) {
    const stored = await Storage.get([CHAT_KEY, GEMINI_KEY_SK]);
    let history = stored[CHAT_KEY] ?? [];
    let apiKey = stored[GEMINI_KEY_SK] ?? '';

    display.innerHTML = `
      <div class="widget-view widget-ai">
        
        <!-- GEMINI INTERACTIVE ASSISTANT -->
        <div id="ai-gemini-view" class="ai-view-container" style="display:flex;">
          <div class="ai-panel-header">
            <div class="ai-header-logo">✨</div>
            <div class="ai-header-text">
              <div class="ai-title">Chikoo AI Assistant</div>
              <div class="ai-subtitle">Powered by Google Gemini 2.5 Flash · Smart Productivity Companion</div>
            </div>
            <button class="ai-clear-btn" id="ai-clear-btn">Clear Chat</button>
          </div>

          <!-- API Key Row -->
          <div class="ai-key-row" id="ai-key-row" style="${apiKey ? 'display:none' : ''}">
            <input
              class="ai-key-input"
              id="ai-key-input"
              type="password"
              placeholder="Paste your free Gemini API key here..."
              value="${_esc(apiKey)}"
              autocomplete="off"
            />
            <button class="ai-key-save-btn" id="ai-key-save">Save Key</button>
          </div>
          ${apiKey ? `<div class="ai-key-saved" id="ai-key-saved">✅ Gemini Key Active · <button class="ai-key-reset" id="ai-key-reset">Change Key</button></div>` : ''}

          <!-- Quick Chips -->
          <div class="ai-chips-row">
            <button class="ai-chip" data-prompt="💡 Brainstorm 3 creative project ideas for a web app">💡 Brainstorm</button>
            <button class="ai-chip" data-prompt="💻 Explain how to optimize JavaScript async performance">💻 Code Helper</button>
            <button class="ai-chip" data-prompt="📝 Summarize the main principles of time management">📝 Summarize</button>
            <button class="ai-chip" data-prompt="⚡ Give me a 5-step daily focus routine">⚡ Daily Plan</button>
          </div>

          <div class="ai-messages" id="ai-messages"></div>

          <div class="ai-input-row">
            <textarea
              class="ai-input-textarea"
              id="ai-input"
              placeholder="Ask Chikoo AI anything… (Enter to send, Shift+Enter for newline)"
              rows="2"
              spellcheck="false"
            ></textarea>
            <div class="ai-input-actions">
              <span class="ai-status" id="ai-status"></span>
              <button class="ai-send-btn" id="ai-send-btn">Send ✨</button>
            </div>
          </div>
        </div>

      </div>
    `;

    function _formatMessageText(txt) {
      let formatted = _esc(txt);
      formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="ai-code-block"><code>$1</code></pre>');
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return formatted;
    }

    function _rebuildMessages() {
      const el = document.getElementById('ai-messages');
      if (!el) return;
      if (history.length === 0) {
        el.innerHTML = `
          <div class="ai-empty">
            <span class="ai-empty-icon">✨</span>
            <span class="ai-empty-title">Chikoo Gemini AI</span>
            <span class="ai-empty-sub">Ask questions, generate ideas, summarize text, or debug code.</span>
            ${!apiKey ? `<div class="ai-key-hint">Enter your free Gemini API key above to enable AI.<br><a href="https://aistudio.google.com/app/apikey" target="_blank" class="ai-key-link">Get Free Gemini API Key →</a></div>` : ''}
          </div>
        `;
      } else {
        el.innerHTML = history.map((msg, i) => `
          <div class="ai-bubble ${msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-bot'}">
            <div class="ai-bubble-header">
              <span class="ai-bubble-role">${msg.role === 'user' ? '👤 You' : '✨ Gemini AI'}</span>
              ${msg.role === 'model' ? `<button class="ai-copy-btn" data-idx="${i}">Copy</button>` : ''}
            </div>
            <div class="ai-bubble-text">${_formatMessageText(msg.content)}</div>
          </div>
        `).join('');
        el.scrollTop = el.scrollHeight;

        el.querySelectorAll('.ai-copy-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (history[idx]) {
              navigator.clipboard.writeText(history[idx].content);
              e.target.textContent = 'Copied! ✓';
              setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
            }
          });
        });
      }
    }

    _rebuildMessages();

    const inputEl  = document.getElementById('ai-input');
    const sendBtn  = document.getElementById('ai-send-btn');
    const clearBtn = document.getElementById('ai-clear-btn');
    const statusEl = document.getElementById('ai-status');
    const keyInput = document.getElementById('ai-key-input');
    const keySave  = document.getElementById('ai-key-save');
    const keyReset = document.getElementById('ai-key-reset');

    if (keySave) {
      keySave.addEventListener('click', async () => {
        const k = keyInput?.value.trim();
        if (!k) return;
        apiKey = k;
        await Storage.set({ [GEMINI_KEY_SK]: k });
        await _renderAI(display);
      });
    }

    if (keyReset) {
      keyReset.addEventListener('click', async () => {
        apiKey = '';
        await Storage.set({ [GEMINI_KEY_SK]: '' });
        await _renderAI(display);
      });
    }

    clearBtn?.addEventListener('click', async () => {
      history = [];
      await Storage.set({ [CHAT_KEY]: [] });
      _rebuildMessages();
    });

    display.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (inputEl) {
          inputEl.value = chip.dataset.prompt;
          sendMessage();
        }
      });
    });

    async function sendMessage() {
      const text = inputEl?.value.trim();
      if (!text) return;

      if (!apiKey) {
        const keyRow = document.getElementById('ai-key-row');
        if (keyRow) keyRow.style.display = 'flex';
        if (statusEl) statusEl.textContent = '⚠️ Add Gemini API key first';
        return;
      }

      history.push({ role: 'user', content: text });
      inputEl.value = '';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      if (statusEl) statusEl.textContent = '⏳ Gemini is thinking…';
      _rebuildMessages();

      try {
        const body = {
          contents: history.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
        };

        let resp = null;
        let lastErr = null;

        for (const endpoint of GEMINI_ENDPOINTS) {
          try {
            resp = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            if (resp.ok) { lastErr = null; break; }
            else {
              const err = await resp.json().catch(() => ({}));
              lastErr = new Error(err?.error?.message ?? `HTTP ${resp.status}`);
            }
          } catch (e) { lastErr = e; }
        }

        if (lastErr) throw lastErr;

        const data = await resp.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(No response from Gemini)';
        history.push({ role: 'model', content: reply });
        await Storage.set({ [CHAT_KEY]: history });
        if (statusEl) statusEl.textContent = '';
      } catch (err) {
        history.push({ role: 'model', content: `❌ Error: ${err.message}` });
        if (statusEl) statusEl.textContent = '';
      } finally {
        const curInput = document.getElementById('ai-input');
        const curSend = document.getElementById('ai-send-btn');
        if (curInput) { curInput.disabled = false; curInput.focus(); }
        if (curSend) curSend.disabled = false;
      }

      _rebuildMessages();
    }

    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  3. POMODORO FOCUS TIMER WIDGET
  // ═══════════════════════════════════════════════════════════
  function _renderTimer(display) {
    function formatTimerDisplay(secs) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function calcDashOffset(secs, total) {
      const circumference = 2 * Math.PI * 90;
      const progress = secs / total;
      return circumference * (1 - progress);
    }

    display.innerHTML = `
      <div class="widget-view widget-timer">
        <div class="timer-mode-row">
          <button class="timer-mode-btn ${_timerMode === 'work' ? 'active' : ''}" data-mode="work">🎯 Work Focus (25m)</button>
          <button class="timer-mode-btn ${_timerMode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">☕ Short Break (5m)</button>
          <button class="timer-mode-btn ${_timerMode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">🌴 Long Break (15m)</button>
        </div>

        <div class="timer-ring-container">
          <svg class="timer-svg" viewBox="0 0 200 200">
            <circle class="timer-ring-bg" cx="100" cy="100" r="90" />
            <circle
              class="timer-ring-progress"
              id="timer-ring-progress"
              cx="100"
              cy="100"
              r="90"
              style="stroke-dasharray: ${2 * Math.PI * 90}; stroke-dashoffset: ${calcDashOffset(_timerSeconds, _timerTotal)};"
            />
          </svg>
          <div class="timer-display-wrap">
            <span class="timer-clock-digits" id="timer-digits">${formatTimerDisplay(_timerSeconds)}</span>
            <span class="timer-status-text" id="timer-status">${TIMER_MODES[_timerMode].label}</span>
          </div>
        </div>

        <div class="timer-controls">
          <button class="timer-ctrl-btn primary" id="timer-start-btn">${_timerRunning ? 'Pause ⏸' : 'Start Focus ▶'}</button>
          <button class="timer-ctrl-btn secondary" id="timer-reset-btn">Reset 🔄</button>
        </div>
      </div>
    `;

    const digitsEl = document.getElementById('timer-digits');
    const ringEl = document.getElementById('timer-ring-progress');
    const startBtn = document.getElementById('timer-start-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    function updateTimerUI() {
      if (digitsEl) digitsEl.textContent = formatTimerDisplay(_timerSeconds);
      if (ringEl) ringEl.style.strokeDashoffset = calcDashOffset(_timerSeconds, _timerTotal);
      if (startBtn) startBtn.textContent = _timerRunning ? 'Pause ⏸' : 'Start Focus ▶';
    }

    display.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        _timerMode = mode;
        _timerTotal = TIMER_MODES[mode].duration;
        _timerSeconds = _timerTotal;
        if (_timerRunning) clearInterval(_timerInterval);
        _timerRunning = false;
        display.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateTimerUI();
      });
    });

    startBtn?.addEventListener('click', () => {
      _timerRunning = !_timerRunning;
      if (_timerRunning) {
        _timerInterval = setInterval(() => {
          if (_timerSeconds > 0) {
            _timerSeconds--;
            updateTimerUI();
          } else {
            clearInterval(_timerInterval);
            _timerRunning = false;
            alert(`🎉 Time's up! ${_timerMode === 'work' ? 'Take a break!' : 'Ready to focus again?'}`);
            updateTimerUI();
          }
        }, 1000);
      } else {
        clearInterval(_timerInterval);
      }
      updateTimerUI();
    });

    resetBtn?.addEventListener('click', () => {
      if (_timerRunning) clearInterval(_timerInterval);
      _timerRunning = false;
      _timerSeconds = _timerTotal;
      updateTimerUI();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  4. WEATHER WIDGET
  // ═══════════════════════════════════════════════════════════
  async function _renderWeather(display) {
    display.innerHTML = `
      <div class="widget-view widget-weather">
        <div class="weather-search-bar">
          <input type="text" class="weather-city-input" id="weather-city-input" placeholder="Search any city worldwide (e.g. Tokyo, London, New York, Delhi)…" />
          <button class="weather-city-btn" id="weather-city-btn">Search 🔍</button>
          <button class="weather-geo-btn" id="weather-geo-btn" title="Use current location">📍 Geo</button>
        </div>

        <div class="weather-content" id="weather-content">
          <div class="weather-loading"><span style="font-size:2rem">🌍</span><span>Fetching weather data…</span></div>
        </div>
      </div>
    `;

    const content = document.getElementById('weather-content');
    const input = document.getElementById('weather-city-input');
    const searchBtn = document.getElementById('weather-city-btn');
    const geoBtn = document.getElementById('weather-geo-btn');

    async function fetchWeatherByCoords(lat, lon, cityName = '') {
      if (!content) return;
      content.innerHTML = `<div class="weather-loading"><span>⏳ Loading weather for ${cityName || 'location'}...</span></div>`;
      try {
        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m,surface_pressure,uv_index&timezone=auto`
        );
        const json = await resp.json();
        const w = json.current_weather;

        const CONDITIONS = {
          0: ['☀️','Clear Sky'], 1: ['🌤','Mainly Clear'], 2: ['⛅','Partly Cloudy'],
          3: ['☁️','Overcast'], 45: ['🌫','Foggy'], 51: ['🌦','Light Drizzle'],
          61: ['🌧','Light Rain'], 63: ['🌧','Moderate Rain'], 71: ['❄️','Light Snow'],
          80: ['🌦','Rain Showers'], 95: ['⛈','Thunderstorm']
        };

        const [icon, desc] = CONDITIONS[w.weathercode] ?? ['🌡','Unknown Weather'];
        const tempC = Math.round(w.temperature);
        const windSpd = Math.round(w.windspeed);
        const humidity = json.hourly?.relativehumidity_2m?.[0] ?? '—';
        const feelsLike = Math.round(json.hourly?.apparent_temperature?.[0] ?? tempC - 2);
        const pressure = json.hourly?.surface_pressure?.[0] ? Math.round(json.hourly.surface_pressure[0]) : '—';

        const topWeatherTemp = document.querySelector('.tw-temp');
        const topWeatherIcon = document.querySelector('.tw-icon');
        if (topWeatherTemp) topWeatherTemp.textContent = `${tempC}°C`;
        if (topWeatherIcon) topWeatherIcon.textContent = icon;

        content.innerHTML = `
          <div class="weather-main-card">
            <div class="weather-top-info">
              <span class="weather-city-name">📍 ${cityName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}</span>
              <span class="weather-condition-tag">${desc}</span>
            </div>

            <div class="weather-temp-row">
              <span class="weather-big-icon">${icon}</span>
              <span class="weather-big-temp">${tempC}°C</span>
            </div>

            <div class="weather-grid-stats">
              <div class="wstat-card">
                <span class="wstat-label">Feels Like</span>
                <span class="wstat-val">${feelsLike}°C</span>
              </div>
              <div class="wstat-card">
                <span class="wstat-label">Wind Speed</span>
                <span class="wstat-val">${windSpd} km/h</span>
              </div>
              <div class="wstat-card">
                <span class="wstat-label">Humidity</span>
                <span class="wstat-val">${humidity}%</span>
              </div>
              <div class="wstat-card">
                <span class="wstat-label">Pressure</span>
                <span class="wstat-val">${pressure} hPa</span>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        content.innerHTML = `<div class="weather-error">⚠️ Failed to fetch weather data. Check your connection.</div>`;
      }
    }

    async function searchCity(query) {
      if (!query) return;
      try {
        const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        const json = await resp.json();
        if (json.results && json.results.length > 0) {
          const loc = json.results[0];
          fetchWeatherByCoords(loc.latitude, loc.longitude, `${loc.name}, ${loc.country || ''}`);
        } else {
          content.innerHTML = `<div class="weather-error">City "${query}" not found. Try another city.</div>`;
        }
      } catch {
        content.innerHTML = `<div class="weather-error">Geocoding error. Check your connection.</div>`;
      }
    }

    function useCurrentGeo() {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'My Location'),
        () => searchCity('Tokyo')
      );
    }

    searchBtn?.addEventListener('click', () => searchCity(input.value.trim()));
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchCity(input.value.trim()); });
    geoBtn?.addEventListener('click', useCurrentGeo);

    useCurrentGeo();
  }

  // ═══════════════════════════════════════════════════════════
  //  5. SCRIBBLE HUB & RESPONSIVE TOUCH WHITEBOARD
  // ═══════════════════════════════════════════════════════════
  async function _renderScribble(display) {
    const data = await Storage.get([SCRIBBLE_KEY, CANVAS_KEY, SCRIBBLE_MODE]);
    let savedText = data[SCRIBBLE_KEY] ?? '';
    let savedCanvas = data[CANVAS_KEY] ?? '';
    let currentMode = data[SCRIBBLE_MODE] ?? 'notes';

    display.innerHTML = `
      <div class="widget-view widget-scribble">
        <div class="scribble-header">
          <div class="scribble-title-row">
            <span class="scribble-title">Scribble Hub</span>
            <button class="scribble-mode-btn ${currentMode === 'notes' ? 'active' : ''}" id="scribble-mode-notes">📝 Text Notes</button>
            <button class="scribble-mode-btn ${currentMode === 'sketch' ? 'active' : ''}" id="scribble-mode-sketch">🎨 Whiteboard Canvas</button>
          </div>
          <span class="scribble-hint" id="scribble-hint">Auto-saved ✓</span>
        </div>

        <!-- 1. TEXT NOTES MODE -->
        <div id="scribble-notes-panel" style="${currentMode === 'notes' ? 'display:flex; flex-direction:column; flex:1; min-height:0;' : 'display:none;'}">
          <textarea
            class="scribble-textarea"
            id="scribble-area"
            placeholder="Type your notes, ideas, code snippets, or daily thoughts here... Auto-saves instantly."
            spellcheck="false"
          >${savedText}</textarea>
          <div class="scribble-footer">
            <span class="scribble-wordcount" id="scribble-wc">0 words</span>
            <div class="scribble-footer-actions">
              <button class="scribble-export-btn" id="scribble-export">Export .TXT</button>
              <button class="scribble-clear-btn" id="scribble-clear">Clear Notes</button>
            </div>
          </div>
        </div>

        <!-- 2. TOUCH-ENABLED WHITEBOARD CANVAS MODE -->
        <div id="scribble-sketch-panel" class="sketch-container" style="${currentMode === 'sketch' ? 'display:flex;' : 'display:none;'}">
          <div class="sketch-toolbar">
            <div class="sketch-tool-group sketch-colors-group">
              <span class="sketch-tool-label">Color:</span>
              <div class="sketch-color-dot active" data-color="#10b981" style="background:#10b981;"></div>
              <div class="sketch-color-dot" data-color="#06b6d4" style="background:#06b6d4;"></div>
              <div class="sketch-color-dot" data-color="#8b5cf6" style="background:#8b5cf6;"></div>
              <div class="sketch-color-dot" data-color="#f59e0b" style="background:#f59e0b;"></div>
              <div class="sketch-color-dot" data-color="#ef4444" style="background:#ef4444;"></div>
              <div class="sketch-color-dot" data-color="#ffffff" style="background:#ffffff; border:1px solid #777;"></div>
              <div class="sketch-color-dot" data-color="eraser" style="background:#333; border:1px solid #777; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#fff;" title="Eraser">🧹</div>
            </div>

            <div class="sketch-tool-group">
              <button class="sketch-size-btn active" data-size="3">Thin</button>
              <button class="sketch-size-btn" data-size="6">Med</button>
              <button class="sketch-size-btn" data-size="12">Thick</button>
            </div>

            <div class="sketch-tool-group">
              <button class="scribble-export-btn" id="sketch-export-btn">Save PNG 📷</button>
              <button class="scribble-clear-btn" id="sketch-clear-btn">Clear Canvas</button>
            </div>
          </div>
          <div class="sketch-canvas-wrapper">
            <canvas class="sketch-canvas" id="sketch-canvas"></canvas>
          </div>
        </div>
      </div>
    `;

    const btnNotes    = document.getElementById('scribble-mode-notes');
    const btnSketch   = document.getElementById('scribble-mode-sketch');
    const panelNotes  = document.getElementById('scribble-notes-panel');
    const panelSketch = document.getElementById('scribble-sketch-panel');
    const hint        = document.getElementById('scribble-hint');

    const notesArea   = document.getElementById('scribble-area');
    const wordCount   = document.getElementById('scribble-wc');
    const clearNotes  = document.getElementById('scribble-clear');
    const exportNotes = document.getElementById('scribble-export');

    const canvas      = document.getElementById('sketch-canvas');
    const clearSketch = document.getElementById('sketch-clear-btn');
    const exportSketch = document.getElementById('sketch-export-btn');

    btnNotes?.addEventListener('click', async () => {
      currentMode = 'notes';
      btnNotes.classList.add('active');
      btnSketch.classList.remove('active');
      panelNotes.style.display = 'flex';
      panelSketch.style.display = 'none';
      await Storage.set({ [SCRIBBLE_MODE]: 'notes' });
    });

    btnSketch?.addEventListener('click', async () => {
      currentMode = 'sketch';
      btnSketch.classList.add('active');
      btnNotes.classList.remove('active');
      panelNotes.style.display = 'none';
      panelSketch.style.display = 'flex';
      await Storage.set({ [SCRIBBLE_MODE]: 'sketch' });
      initCanvas();
    });

    let notesTimer;
    const updateWC = () => {
      if (!notesArea) return;
      const w = notesArea.value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount) wordCount.textContent = `${w} word${w !== 1 ? 's' : ''}`;
    };

    updateWC();

    notesArea?.addEventListener('input', () => {
      updateWC();
      if (hint) hint.textContent = 'Saving…';
      clearTimeout(notesTimer);
      notesTimer = setTimeout(async () => {
        await Storage.set({ [SCRIBBLE_KEY]: notesArea.value });
        if (hint) hint.textContent = 'Auto-saved ✓';
      }, 700);
    });

    clearNotes?.addEventListener('click', async () => {
      if (!notesArea.value.trim() || !confirm('Clear all text notes?')) return;
      notesArea.value = '';
      updateWC();
      await Storage.set({ [SCRIBBLE_KEY]: '' });
      if (hint) hint.textContent = 'Notes Cleared';
    });

    exportNotes?.addEventListener('click', () => {
      const blob = new Blob([notesArea.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chikoo_Notes_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Touch & Mouse Canvas Logic
    let ctx = null;
    let drawing = false;
    let currentColor = '#10b981';
    let currentBrushSize = 3;

    function initCanvas() {
      if (!canvas) return;
      ctx = canvas.getContext('2d');

      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth || 600;
        canvas.height = parent.clientHeight || 350;
      }

      if (savedCanvas) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = savedCanvas;
      }

      // Mouse events
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      // Touch events (Mobile & Touchscreen support)
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      }, { passive: false });

      canvas.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
      });
    }

    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    function startDrawing(e) {
      drawing = true;
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function draw(e) {
      if (!drawing) return;
      const { x, y } = getCoords(e);

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = currentColor === 'eraser' ? '#111827' : currentColor;
      ctx.lineWidth = currentBrushSize;

      ctx.lineTo(x, y);
      ctx.stroke();
    }

    async function stopDrawing() {
      if (!drawing) return;
      drawing = false;
      ctx.closePath();
      const dataUrl = canvas.toDataURL();
      savedCanvas = dataUrl;
      await Storage.set({ [CANVAS_KEY]: dataUrl });
      if (hint) hint.textContent = 'Auto-saved ✓';
    }

    const colorDots = panelSketch?.querySelectorAll('.sketch-color-dot');
    colorDots?.forEach(dot => {
      dot.addEventListener('click', () => {
        colorDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        currentColor = dot.dataset.color;
      });
    });

    const sizeBtns = panelSketch?.querySelectorAll('.sketch-size-btn');
    sizeBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBrushSize = parseInt(btn.dataset.size);
      });
    });

    clearSketch?.addEventListener('click', async () => {
      if (!confirm('Clear whiteboard canvas?')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      savedCanvas = '';
      await Storage.set({ [CANVAS_KEY]: '' });
      if (hint) hint.textContent = 'Canvas Cleared';
    });

    exportSketch?.addEventListener('click', () => {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chikoo_Whiteboard_${Date.now()}.png`;
      a.click();
    });

    if (currentMode === 'sketch') {
      setTimeout(initCanvas, 60);
    }
  }

  function _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════
  async function init() {
    await _loadState();
    const tabBtns = document.querySelectorAll('.widget-tab');
    const display = document.getElementById('widget-display');
    if (!display) return;

    window.addEventListener('resize', _positionPersistentIframe);

    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.widget === _active));
    _showWidget(_active, display);
    _updateMiniPlayer();

    tabBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _active = btn.dataset.widget;
        await _saveState();
        _showWidget(_active, display);
        _updateMiniPlayer();
      });
    });
  }

  function _showWidget(name, display) {
    switch (name) {
      case 'music':    _renderMusic(display);    break;
      case 'ai':       _renderAI(display);       break;
      case 'timer':    _renderTimer(display);   break;
      case 'weather':  _renderWeather(display);  break;
      case 'scribble': _renderScribble(display); break;
      default:         _renderMusic(display);
    }
    setTimeout(_positionPersistentIframe, 40);
  }

  async function switchTo(widgetName) {
    const valid = ['music', 'ai', 'timer', 'weather', 'scribble'];
    if (!valid.includes(widgetName)) return;

    _active = widgetName;
    await _saveState();

    const tabBtns = document.querySelectorAll('.widget-tab');
    const display = document.getElementById('widget-display');
    tabBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.widget === widgetName));
    if (display) _showWidget(widgetName, display);
    _updateMiniPlayer();
  }

  return { init, switchTo };
})();
