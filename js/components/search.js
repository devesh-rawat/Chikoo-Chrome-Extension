/**
 * search.js — Search bar with multi-engine support (Aura Tab)
 *
 * Engines: Google, DuckDuckGo, Bing, Brave, YouTube, Perplexity
 */

const SearchComponent = (() => {
  const ENGINES = [
    { name: 'Google',     url: 'https://www.google.com/search?q=',       label: 'Google' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',             label: 'DuckDuckGo' },
    { name: 'Brave',      url: 'https://search.brave.com/search?q=',     label: 'Brave' },
    { name: 'YouTube',    url: 'https://www.youtube.com/results?search_query=', label: 'YouTube' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=',    label: 'Perplexity' },
    { name: 'Bing',       url: 'https://www.bing.com/search?q=',         label: 'Bing' }
  ];

  const STORAGE_KEY = 'aura_search_engine_idx';
  let _idx = 0;
  const _instances = [];

  const SEARCH_ICON_SVG = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  async function _loadEngine() {
    const data = await Storage.get([STORAGE_KEY]);
    _idx = Number(data[STORAGE_KEY] ?? 0);
    if (_idx >= ENGINES.length) _idx = 0;
  }

  function _syncAllPills() {
    _instances.forEach((container) => {
      const pill = container.querySelector('.search-engine-pill');
      const toggle = container.querySelector('.search-engine-toggle');
      if (pill) pill.textContent = ENGINES[_idx].label;
      if (toggle) toggle.setAttribute('data-engine', ENGINES[_idx].name.toLowerCase());
    });
  }

  function _cycleEngine() {
    _idx = (_idx + 1) % ENGINES.length;
    Storage.set({ [STORAGE_KEY]: _idx });
    _syncAllPills();
  }

  function _doSearch(query) {
    if (!query.trim()) return;
    const trimmed = query.trim();
    if (/^https?:\/\//i.test(trimmed) || /^[\w-]+\.[\w]{2,}(\/|$)/.test(trimmed)) {
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
      window.location.href = url;
    } else {
      window.location.href = ENGINES[_idx].url + encodeURIComponent(trimmed);
    }
  }

  async function render(container) {
    await _loadEngine();

    if (!_instances.includes(container)) {
      _instances.push(container);
    }

    container.innerHTML = `
      <div class="section-search">
        <div class="search-bar">
          <span class="search-icon">${SEARCH_ICON_SVG}</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search web or enter URL..."
            autocomplete="off"
            spellcheck="false"
          />
          <span class="search-engine-toggle" data-engine="${ENGINES[_idx].name.toLowerCase()}" title="Click to switch search engine">
            <span class="search-engine-pill">${ENGINES[_idx].icon} ${ENGINES[_idx].label}</span>
          </span>
        </div>
        <div class="search-hint">
          Press <kbd>Enter</kbd> to search · Click pill to switch engine
        </div>
      </div>
    `;

    const input  = container.querySelector('.search-input');
    const toggle = container.querySelector('.search-engine-toggle');

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _doSearch(input.value);
    });

    toggle?.addEventListener('click', _cycleEngine);
  }

  return { render };
})();
