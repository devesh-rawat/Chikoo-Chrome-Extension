/**
 * newtab.js — Main Entry Point (Chikoo)
 *
 * Initializes spatial layouts, components, settings triggers, and live clock.
 */

(async () => {
  // 1. Apply active saved theme
  await ThemeManager.init();

  // 2. Render Minimalistic and Work layouts
  await Promise.all([
    _renderMinimalistic(),
    _renderWork(),
  ]);

  // 3. Initialize Settings Panel
  if (typeof SettingsPanel !== 'undefined') {
    SettingsPanel.init();
  }

  // 4. Shared weather + top navigation actions
  if (typeof WeatherService !== 'undefined') {
    WeatherService.init();
  }
  _initTopNavActions();

  // 5. Start Bottom Bar Clock & Date
  _startBottomClock();
})();

// ── Minimalistic layout renderer ─────────────────────────────
async function _renderMinimalistic() {
  if (typeof ClockComponent !== 'undefined') ClockComponent.destroy();

  const clockSlot = document.getElementById('slot-clock');
  if (clockSlot && typeof ClockComponent !== 'undefined') {
    ClockComponent.render(clockSlot, { use24h: false });
  }

  const searchMin = document.getElementById('slot-search-min');
  if (searchMin && typeof SearchComponent !== 'undefined') {
    await SearchComponent.render(searchMin);
  }

  const creatorSlot = document.getElementById('slot-note-creator');
  if (creatorSlot && typeof StickyNotesComponent !== 'undefined') {
    await StickyNotesComponent.renderCreator(creatorSlot);
  }

  const greetSlot = document.getElementById('slot-greeting');
  if (greetSlot && typeof GreetingComponent !== 'undefined') {
    await GreetingComponent.render(greetSlot);
  }

  const linksSlot = document.getElementById('slot-quicklinks');
  if (linksSlot && typeof QuickLinksComponent !== 'undefined') {
    await QuickLinksComponent.render(linksSlot);
  }
}

// ── Work layout renderer ──────────────────────────────────────
async function _renderWork() {
  const bmSlot = document.getElementById('slot-bookmarks') || document.getElementById('slot-history');
  if (bmSlot && typeof BookmarksComponent !== 'undefined') {
    await BookmarksComponent.render(bmSlot);
  }

  const searchWork = document.getElementById('slot-search-work');
  if (searchWork && typeof SearchComponent !== 'undefined') {
    await SearchComponent.render(searchWork);
  }

  if (typeof WidgetsController !== 'undefined') {
    await WidgetsController.init();
  }

  const todoSlot = document.getElementById('slot-todo');
  if (todoSlot && typeof TodoComponent !== 'undefined') {
    await TodoComponent.render(todoSlot);
  }
}

// ── Top navigation (Weather shortcut) ────────────────────────
function _initTopNavActions() {
  document.getElementById('top-weather-badge')?.addEventListener('click', () => {
    ThemeManager.setMode('work');
    if (typeof WidgetsController !== 'undefined') {
      WidgetsController.switchTo('weather');
    }
  });
}

// ── Bottom bar clock ──────────────────────────────────────────
let _clockInterval = null;
function _startBottomClock() {
  const clockEl = document.getElementById('bottom-clock');
  const dateEl = document.getElementById('bottom-date');
  if (!clockEl && !dateEl) return;
  
  const tick = () => {
    const n = new Date();
    const h = String(n.getHours()).padStart(2, '0');
    const m = String(n.getMinutes()).padStart(2, '0');
    const s = String(n.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    if (dateEl) dateEl.textContent = n.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  tick();
  if (_clockInterval) clearInterval(_clockInterval);
  _clockInterval = setInterval(tick, 1000);
}
