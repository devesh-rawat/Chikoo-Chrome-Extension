/**
 * theme-manager.js — Manages the 4-variant theme system
 *
 * Themes:  minimalistic | work
 * Modes:   light | dark
 *
 * Active theme stylesheet is swapped via #theme-stylesheet <link>.
 * body[data-mode] controls which layout panel is visible.
 * State is persisted to chrome.storage.local.
 */

const ThemeManager = (() => {
  const STORAGE_KEY_MODE = 'theme_mode';   // 'minimalistic' | 'work'
  const STORAGE_KEY_DARK = 'theme_dark';   // true | false
  const STYLESHEET_ID    = 'theme-stylesheet';

  // Map [mode][isDark] → CSS file path
  const THEME_MAP = {
    minimalistic: {
      true:  'css/themes/minimalistic-dark.css',
      false: 'css/themes/minimalistic-light.css',
    },
    work: {
      true:  'css/themes/work-dark.css',
      false: 'css/themes/work-light.css',
    },
  };

  let _mode   = 'minimalistic';
  let _isDark = false;

  // ── Private helpers ──────────────────────────────────────

  function _applyTheme() {
    // Swap stylesheet
    const path = THEME_MAP[_mode]?.[String(_isDark)]
               ?? THEME_MAP['minimalistic']['false'];
    const link = document.getElementById(STYLESHEET_ID);
    if (link) link.href = path;

    // body attributes — drives CSS layout switching AND component visibility
    document.body.dataset.mode = _mode;
    document.body.dataset.dark = String(_isDark);

    // Update dark toggle icon / label
    const icon  = document.getElementById('light-dark-icon');
    const label = document.getElementById('light-dark-label');
    if (icon) {
      icon.innerHTML = _isDark 
        ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    }
    if (label) label.textContent = _isDark ? 'Dark' : 'Light';

    // Update active mode-btn highlight
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === _mode);
    });

  }

  async function _persist() {
    await Storage.set({
      [STORAGE_KEY_MODE]: _mode,
      [STORAGE_KEY_DARK]: _isDark,
    });
  }

  // ── Public API ───────────────────────────────────────────

  async function init() {
    const data = await Storage.get([STORAGE_KEY_MODE, STORAGE_KEY_DARK]);
    _mode   = data[STORAGE_KEY_MODE] ?? 'minimalistic';
    _isDark = data[STORAGE_KEY_DARK] ?? false;
    _applyTheme();
    _bindControls();
  }

  function setMode(mode) {
    if (!THEME_MAP[mode]) return;
    _mode = mode;
    _applyTheme();
    _persist();
    window.dispatchEvent(new CustomEvent('chikoo-mode-change', { detail: { mode } }));
  }

  function toggleDark() {
    _isDark = !_isDark;
    _applyTheme();
    _persist();
  }

  function getState() {
    return { mode: _mode, isDark: _isDark };
  }

  function _bindControls() {
    // Mode buttons (bottom-left pill)
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Dark mode toggle (bottom-right pill)
    const ldBtn = document.getElementById('btn-light-dark');
    if (ldBtn) ldBtn.addEventListener('click', toggleDark);
  }

  return { init, setMode, toggleDark, getState };
})();
