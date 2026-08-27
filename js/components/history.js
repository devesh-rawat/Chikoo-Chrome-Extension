/**
 * history.js — Unique Domain Browsing & History Panel (Aura Tab)
 *
 * Uses chrome.history API with domain deduplication, Google S2 Favicons, and instant search filter.
 */

const HistoryComponent = (() => {
  const CACHE_KEY = 'aura_history_cache';
  let _rawItems = [];

  async function _getHistory() {
    if (typeof chrome !== 'undefined' && chrome.history) {
      return new Promise((resolve) => {
        chrome.history.search({ text: '', maxResults: 100, startTime: 0 }, (results) => {
          const seen = new Set();
          const unique = [];
          for (const r of results) {
            try {
              const host = new URL(r.url).hostname;
              if (seen.has(host) || host.includes('newtab') || !host) continue;
              seen.add(host);
              unique.push({ title: r.title || host, url: r.url, visitTime: r.lastVisitTime, host });
              if (unique.length >= 30) break;
            } catch { /* skip invalid URLs */ }
          }
          resolve(unique);
        });
      });
    }

    const data = await Storage.get([CACHE_KEY]);
    return data[CACHE_KEY] ?? [
      { title: 'GitHub · Build software better', url: 'https://github.com', visitTime: Date.now() - 300000, host: 'github.com' },
      { title: 'Google AI Studio', url: 'https://aistudio.google.com', visitTime: Date.now() - 3600000, host: 'aistudio.google.com' },
      { title: 'YouTube · Watch & Stream', url: 'https://youtube.com', visitTime: Date.now() - 86400000, host: 'youtube.com' },
      { title: 'ChatGPT · OpenAI Workspace', url: 'https://chatgpt.com', visitTime: Date.now() - 7200000, host: 'chatgpt.com' },
      { title: 'Figma · Web Design & Prototyping', url: 'https://figma.com', visitTime: Date.now() - 10800000, host: 'figma.com' },
      { title: 'Stack Overflow · Dev Q&A', url: 'https://stackoverflow.com', visitTime: Date.now() - 14400000, host: 'stackoverflow.com' },
      { title: 'Dev.to · Tech Community', url: 'https://dev.to', visitTime: Date.now() - 18000000, host: 'dev.to' },
      { title: 'Notion · Productivity Suite', url: 'https://notion.so', visitTime: Date.now() - 21600000, host: 'notion.so' },
      { title: 'Reddit · The Front Page', url: 'https://reddit.com', visitTime: Date.now() - 25200000, host: 'reddit.com' },
      { title: 'X / Twitter · Social Feed', url: 'https://x.com', visitTime: Date.now() - 28800000, host: 'x.com' },
      { title: 'Vercel · Cloud Platform', url: 'https://vercel.com', visitTime: Date.now() - 32400000, host: 'vercel.com' },
      { title: 'MDN Web Docs · Developer Docs', url: 'https://developer.mozilla.org', visitTime: Date.now() - 36000000, host: 'developer.mozilla.org' }
    ];
  }

  function _favicon(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch {
      return null;
    }
  }

  function _timeAgo(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  async function render(container) {
    _rawItems = await _getHistory();

    function renderFiltered(query = '') {
      const listEl = container.querySelector('#history-list-items');
      const countEl = container.querySelector('#history-badge-count');
      if (!listEl) return;

      const filtered = _rawItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.url.toLowerCase().includes(query.toLowerCase())
      );

      if (countEl) {
        countEl.textContent = `${filtered.length} tabs`;
      }

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="history-empty">
            <span class="history-empty-icon">🕑</span>
            <span>No matching browsing history.</span>
          </div>
        `;
        return;
      }

      listEl.innerHTML = filtered.map(item => {
        const favUrl = _favicon(item.url);
        const ago = _timeAgo(item.visitTime);
        return `
          <a class="history-item" href="${item.url}" title="${item.url}" target="_blank" rel="noopener noreferrer">
            <div class="history-item-favicon">
              ${favUrl ? `<img src="${favUrl}" alt="" onerror="this.parentElement.innerHTML='🔗'" />` : '🔗'}
            </div>
            <div class="history-item-text">
              <span class="history-item-title">${_esc(item.title)}</span>
              <span class="history-item-url">${_esc(item.host || item.url)}</span>
            </div>
            ${ago ? `<span class="history-item-time">${ago}</span>` : ''}
          </a>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="history-panel">
        <div class="history-header">
          <div class="history-header-title-group">
            <span class="history-header-icon">📑</span>
            <span class="history-title">Frequent & Recent Tabs</span>
          </div>
          <span class="history-badge" id="history-badge-count">0 tabs</span>
        </div>

        <div class="history-search-row">
          <input type="text" class="history-search-input" id="history-search-input" placeholder="Filter history items…" />
        </div>

        <div class="history-list" id="history-list-items"></div>
      </div>
    `;

    renderFiltered();

    const searchInput = container.querySelector('#history-search-input');
    searchInput?.addEventListener('input', (e) => {
      renderFiltered(e.target.value.trim());
    });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
