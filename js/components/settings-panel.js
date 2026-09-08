/**
 * settings-panel.js — Slide-Over Glass Settings Panel (Chikoo)
 */

const SettingsPanel = (() => {
  let _isOpen = false;
  let _quoteLang = 'hindi';

  async function _loadState() {
    const data = await Storage.get(['quote_language']);
    _quoteLang = data['quote_language'] ?? 'hindi';
  }

  function _buildHTML() {
    const { mode, isDark } = ThemeManager.getState();
    return `
      <div class="settings-content-wrap">
        <div class="settings-header">
          <div class="settings-header-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <h3>Chikoo Settings</h3>
          </div>
          <button class="settings-close-btn" id="settings-close-btn" title="Close">✕</button>
        </div>

        <!-- Layout Mode -->
        <div class="settings-section">
          <div class="settings-section-title">Layout Mode</div>
          <div class="theme-grid">
            <div class="theme-option ${mode === 'minimalistic' ? 'selected' : ''}" data-mode="minimalistic">
              <span class="to-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              </span>
              <span class="to-title">Minimalistic</span>
              <span class="to-desc">Zen clock, greeting &amp; sticky board</span>
            </div>
            <div class="theme-option ${mode === 'work' ? 'selected' : ''}" data-mode="work">
              <span class="to-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </span>
              <span class="to-title">Work Workspace</span>
              <span class="to-desc">Multi-widget hub &amp; study calendar</span>
            </div>
          </div>
        </div>

        <!-- Quote Language -->
        <div class="settings-section">
          <div class="settings-section-title">Daily Quote Language</div>
          <div class="settings-input-group">
            <select class="settings-input" id="sp-quote-lang">
              <option value="hindi" ${_quoteLang === 'hindi' ? 'selected' : ''}>Hindi (हिंदी विचार - Jaini Font)</option>
              <option value="sanskrit" ${_quoteLang === 'sanskrit' ? 'selected' : ''}>Sanskrit (संस्कृत सुभाषितानि - Jaini Font)</option>
              <option value="english" ${_quoteLang === 'english' ? 'selected' : ''}>English (Henny Penny Font)</option>
              <option value="all" ${_quoteLang === 'all' ? 'selected' : ''}>All Languages (मिश्रित / Combined)</option>
            </select>
          </div>
          <p class="settings-hint">Choose your preferred language for daily wisdom. Hindi &amp; Sanskrit use Ek Type's Jaini font; English uses Henny Penny font.</p>
        </div>

        <!-- Dark / Light -->
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="settings-toggle-row">
            <span>Dark Theme</span>
            <label class="toggle-switch">
              <input type="checkbox" id="sp-dark-toggle" ${isDark ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Custom Background -->
        <div class="settings-section">
          <div class="settings-section-title">Custom Wallpaper</div>
          <div class="settings-input-group">
            <input type="text" class="settings-input" id="sp-bg-url" placeholder="Paste image URL (https://…)" />
            <button class="settings-action-btn" id="sp-bg-apply">Apply</button>
          </div>
          <p class="settings-hint">Leave blank to use the default Chikoo gradient background.</p>
        </div>

        <!-- Reset -->
        <div class="settings-section">
          <button class="settings-danger-btn" id="sp-reset-all">Reset All Extension Data</button>
        </div>

        <div class="settings-version-badge">Chikoo v2.1 · Crafted for nephew Chikoo</div>
      </div>
    `;
  }

  function _bindPanelEvents() {
    // Close button
    document.getElementById('settings-close-btn')?.addEventListener('click', close);

    // Mode switcher cards
    document.querySelectorAll('.theme-option[data-mode]').forEach(el => {
      el.addEventListener('click', () => {
        ThemeManager.setMode(el.dataset.mode);
        _refresh();
      });
    });

    // Quote language change
    document.getElementById('sp-quote-lang')?.addEventListener('change', async (e) => {
      _quoteLang = e.target.value;
      await Storage.set({ quote_language: _quoteLang });
      const greetSlot = document.getElementById('slot-greeting');
      if (greetSlot && typeof GreetingComponent !== 'undefined') {
        await GreetingComponent.render(greetSlot);
      }
    });

    // Dark mode toggle
    document.getElementById('sp-dark-toggle')?.addEventListener('change', () => {
      ThemeManager.toggleDark();
    });

    // Custom wallpaper
    document.getElementById('sp-bg-apply')?.addEventListener('click', async () => {
      const url = document.getElementById('sp-bg-url')?.value.trim();
      if (!url) return;
      await Storage.set({ aura_custom_bg_url: url });
      const bgLayer = document.getElementById('bg-layer');
      if (bgLayer) bgLayer.style.backgroundImage = `url("${url}")`;
    });

    // Reset all data
    document.getElementById('sp-reset-all')?.addEventListener('click', async () => {
      if (confirm('Reset all Chikoo data? This cannot be undone.')) {
        await Storage.clear();
        window.location.reload();
      }
    });
  }

  async function _refresh() {
    await _loadState();
    const panel = document.getElementById('settings-panel');
    if (panel && !panel.classList.contains('hidden')) {
      panel.innerHTML = _buildHTML();
      _bindPanelEvents();
    }
  }

  async function open() {
    _isOpen = true;
    await _loadState();
    const panel   = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');

    if (panel) {
      panel.innerHTML = _buildHTML();
      panel.classList.remove('hidden');
      _bindPanelEvents();
    }
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.onclick = close;
    }
  }

  function close() {
    _isOpen = false;
    document.getElementById('settings-panel')?.classList.add('hidden');
    document.getElementById('settings-overlay')?.classList.add('hidden');
  }

  function toggle() {
    _isOpen ? close() : open();
  }

  function init() {
    const btn = document.getElementById('btn-settings-trigger');
    btn?.addEventListener('click', toggle);
  }

  return { init, open, close, toggle };
})();
