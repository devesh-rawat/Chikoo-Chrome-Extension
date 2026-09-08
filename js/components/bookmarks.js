/**
 * bookmarks.js — Bookmarks Manager & Quick-Add Component (Chikoo)
 *
 * Dedicated persistent storage via chrome.storage.local (Storage helper):
 * - Bookmarks are saved persistently until explicitly deleted by the user
 * - Pinned / Favorites system with filter chips (All, Pinned, Recent)
 * - Modern letter monogram fallback for missing favicons (no AI emojis)
 * - Clean SVG actions for Pin, Edit, Copy link, and Delete
 * - Option to edit bookmark name inline with instant keyboard/click confirmation
 * - Add custom bookmarks with manual Title and URL
 * - "From Tab" picker to bookmark any currently open tab in 1 click
 * - Copy bookmark URL with animated inline badge and toast feedback
 * - Real-time syncing across tabs and popup via chrome.storage.onChanged
 * - Dual-sync with chrome.bookmarks API when available
 */

const BookmarksComponent = (() => {
  const STORAGE_KEY = 'chikoo_bookmarks';
  let _bookmarks = [];
  let _currentContainer = null;
  let _editingId = null;
  let _isAddDrawerOpen = false;
  let _isTabPickerOpen = false;
  let _isStorageListenerAttached = false;
  let _currentFilter = 'all'; // 'all' | 'pinned' | 'recent'

  const DEFAULT_INITIAL_BOOKMARKS = [
    { id: 'bm-1', title: 'GitHub', url: 'https://github.com', pinned: true, dateAdded: Date.now() - 3600000 },
    { id: 'bm-2', title: 'Google AI Studio', url: 'https://aistudio.google.com', pinned: true, dateAdded: Date.now() - 7200000 },
    { id: 'bm-3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', pinned: false, dateAdded: Date.now() - 86400000 },
    { id: 'bm-4', title: 'YouTube', url: 'https://youtube.com', pinned: false, dateAdded: Date.now() - 172800000 },
    { id: 'bm-5', title: 'ChatGPT', url: 'https://chatgpt.com', pinned: false, dateAdded: Date.now() - 259200000 },
    { id: 'bm-6', title: 'Stack Overflow', url: 'https://stackoverflow.com', pinned: false, dateAdded: Date.now() - 345600000 }
  ];

  // Helper to extract hostname
  function _getHost(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  // Google S2 Favicon URL
  function _favicon(url) {
    const host = _getHost(url);
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  }

  // Generate clean letter monogram when favicon fails
  function _getMonogramBg(str) {
    let hash = 0;
    const text = str || 'chikoo';
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) % 360;
    }
    return `linear-gradient(135deg, hsl(${hash}, 65%, 45%), hsl(${(hash + 35) % 360}, 75%, 55%))`;
  }

  function _renderMonogram(title, url) {
    const text = (title || url || 'B').trim();
    const letter = text.charAt(0).toUpperCase();
    const bg = _getMonogramBg(text);
    return `<span class="bm-monogram" style="background:${bg}">${_esc(letter)}</span>`;
  }

  // Human readable time ago
  function _timeAgo(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Load bookmarks from persistent Storage
  async function _loadBookmarks() {
    if (typeof Storage !== 'undefined') {
      const data = await Storage.get([STORAGE_KEY]);
      if (data && data[STORAGE_KEY] !== undefined && Array.isArray(data[STORAGE_KEY])) {
        _bookmarks = data[STORAGE_KEY].map(item => ({
          ...item,
          pinned: !!item.pinned,
          host: _getHost(item.url)
        }));
        return _bookmarks;
      }
    }

    _bookmarks = DEFAULT_INITIAL_BOOKMARKS.map(item => ({
      ...item,
      pinned: !!item.pinned,
      host: _getHost(item.url)
    }));

    if (typeof Storage !== 'undefined') {
      await Storage.set({ [STORAGE_KEY]: _bookmarks });
    }
    return _bookmarks;
  }

  // Persist bookmarks to Storage
  async function _saveBookmarks() {
    if (typeof Storage !== 'undefined') {
      await Storage.set({ [STORAGE_KEY]: _bookmarks });
    }
  }

  // Save new bookmark
  async function _createBookmark(title, url) {
    if (!url) return null;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const cleanTitle = (title || '').trim() || _getHost(formattedUrl) || formattedUrl;
    const newEntry = {
      id: 'bm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: cleanTitle,
      url: formattedUrl,
      pinned: false,
      dateAdded: Date.now(),
      host: _getHost(formattedUrl)
    };

    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.create) {
      try {
        chrome.bookmarks.create({ title: cleanTitle, url: formattedUrl }, (result) => {
          if (!chrome.runtime.lastError && result && result.id) {
            newEntry.chromeBookmarkId = result.id;
            _saveBookmarks();
          }
        });
      } catch (err) {
        console.warn('Chrome bookmarks create error:', err);
      }
    }

    _bookmarks.unshift(newEntry);
    await _saveBookmarks();
    return newEntry;
  }

  // Toggle Pin
  async function _togglePin(id) {
    const item = _bookmarks.find(b => String(b.id) === String(id));
    if (!item) return;
    item.pinned = !item.pinned;
    await _saveBookmarks();
  }

  // Edit bookmark name
  async function _editBookmarkName(id, newTitle) {
    const trimmed = (newTitle || '').trim();
    if (!trimmed) {
      _showToast('Bookmark name cannot be empty', 'error');
      return false;
    }

    const item = _bookmarks.find(b => String(b.id) === String(id));
    if (!item) return false;

    item.title = trimmed;
    _editingId = null;
    await _saveBookmarks();

    if (item.chromeBookmarkId && typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.update) {
      try {
        chrome.bookmarks.update(item.chromeBookmarkId, { title: trimmed });
      } catch (err) {
        console.warn('Chrome bookmarks update error:', err);
      }
    }

    return true;
  }

  // Remove bookmark
  async function _deleteBookmark(id) {
    if (!id) return;
    const item = _bookmarks.find(b => String(b.id) === String(id));

    if (item && item.chromeBookmarkId && typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.remove) {
      try {
        chrome.bookmarks.remove(String(item.chromeBookmarkId));
      } catch (err) {
        console.warn('Chrome bookmarks remove error:', err);
      }
    }

    _bookmarks = _bookmarks.filter(b => String(b.id) !== String(id));
    await _saveBookmarks();
  }

  // Fetch open browser tabs
  async function _fetchOpenTabs() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      return new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError || !tabs) {
            resolve([]);
            return;
          }
          const valid = tabs
            .filter(t => t.url && /^https?:\/\//i.test(t.url) && !t.url.includes('chrome://'))
            .map(t => ({
              id: t.id,
              title: t.title || t.url,
              url: t.url,
              favIconUrl: t.favIconUrl || _favicon(t.url),
              host: _getHost(t.url)
            }));
          resolve(valid);
        });
      });
    }
    return [];
  }

  // Show inline toast
  function _showToast(message, type = 'info') {
    if (!_currentContainer) return;
    let toastContainer = _currentContainer.querySelector('.bm-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'bm-toast-container';
      _currentContainer.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `bm-toast bm-toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('bm-toast-fade');
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  // Storage listener for live sync
  function _initStorageListener() {
    if (_isStorageListenerAttached) return;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          const newVal = changes[STORAGE_KEY].newValue;
          if (Array.isArray(newVal)) {
            _bookmarks = newVal.map(item => ({
              ...item,
              pinned: !!item.pinned,
              host: _getHost(item.url)
            }));
            if (_currentContainer) {
              _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
            }
          }
        }
      });
      _isStorageListenerAttached = true;
    }
  }

  // Filter and sort bookmarks
  function _getVisibleBookmarks(query = '') {
    const trimmed = query.trim().toLowerCase();
    let list = _bookmarks.filter(item =>
      (item.title && item.title.toLowerCase().includes(trimmed)) ||
      (item.url && item.url.toLowerCase().includes(trimmed)) ||
      (item.host && item.host.toLowerCase().includes(trimmed))
    );

    if (_currentFilter === 'pinned') {
      list = list.filter(item => item.pinned);
    } else if (_currentFilter === 'recent') {
      list = [...list].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } else {
      // 'all': Pinned items first, then dateAdded desc
      list = [...list].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.dateAdded || 0) - (a.dateAdded || 0);
      });
    }

    return list;
  }

  // Filtered bookmark list renderer
  function _renderFilteredList(query = '') {
    if (!_currentContainer) return;
    const listEl = _currentContainer.querySelector('#bookmarks-list-items');
    const countEl = _currentContainer.querySelector('#bookmarks-badge-count');
    if (!listEl) return;

    const visible = _getVisibleBookmarks(query);

    if (countEl) {
      countEl.textContent = `${_bookmarks.length} saved`;
    }

    if (visible.length === 0) {
      listEl.innerHTML = `
        <div class="bm-empty-state">
          <div class="bm-empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p class="bm-empty-title">${query ? 'No matching bookmarks' : (_currentFilter === 'pinned' ? 'No pinned bookmarks' : 'No bookmarks yet')}</p>
          <span class="bm-empty-sub">${query ? 'Try searching with a different keyword' : (_currentFilter === 'pinned' ? 'Pin important links using the pin icon on any bookmark.' : 'Click "+ Add" or "From Tab" to save useful resources.')}</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = visible.map(item => {
      const isEditing = String(_editingId) === String(item.id);
      const fav = _favicon(item.url);
      const ago = _timeAgo(item.dateAdded);
      const displayHost = item.host || _getHost(item.url);

      if (isEditing) {
        return `
          <div class="bm-item bm-item-editing" data-id="${_esc(item.id)}">
            <div class="bm-inline-edit-wrap">
              <div class="bm-item-favicon">
                ${fav 
                  ? `<img src="${fav}" alt="" onerror="this.outerHTML='${_renderMonogram(item.title, item.url).replace(/'/g, "\\'")}'" />` 
                  : _renderMonogram(item.title, item.url)}
              </div>
              <input
                type="text"
                class="bm-inline-edit-input"
                id="bm-edit-input-${_esc(item.id)}"
                value="${_esc(item.title)}"
                placeholder="Bookmark name"
                autocomplete="off"
              />
              <button class="bm-action-btn bm-btn-save-inline" data-id="${_esc(item.id)}" title="Save name">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button class="bm-action-btn bm-btn-cancel-inline" data-id="${_esc(item.id)}" title="Cancel">✕</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="bm-item ${item.pinned ? 'is-pinned' : ''}" data-id="${_esc(item.id)}" data-url="${_esc(item.url)}">
          <a class="bm-item-link" href="${_esc(item.url)}" target="_blank" rel="noopener noreferrer" title="${_esc(item.title)}&#10;${_esc(item.url)}">
            <div class="bm-item-favicon">
              ${fav 
                ? `<img src="${fav}" alt="" onerror="this.outerHTML='${_renderMonogram(item.title, item.url).replace(/'/g, "\\'")}'" />` 
                : _renderMonogram(item.title, item.url)}
            </div>
            <div class="bm-item-text">
              <div class="bm-item-title-row">
                <span class="bm-item-title">${_esc(item.title)}</span>
                ${item.pinned ? '<span class="bm-pin-badge" title="Pinned to top">PINNED</span>' : ''}
              </div>
              <span class="bm-item-host">${_esc(displayHost)}</span>
            </div>
          </a>
          <div class="bm-item-actions">
            ${ago ? `<span class="bm-item-time" title="Saved ${new Date(item.dateAdded).toLocaleString()}">${ago}</span>` : ''}
            <button class="bm-action-btn bm-btn-pin ${item.pinned ? 'active' : ''}" data-id="${_esc(item.id)}" title="${item.pinned ? 'Unpin' : 'Pin to top'}">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="${item.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
            </button>
            <button class="bm-action-btn bm-btn-edit" data-id="${_esc(item.id)}" title="Edit Name">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="bm-action-btn bm-btn-copy" data-url="${_esc(item.url)}" title="Copy Link">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="bm-action-btn bm-btn-delete" data-id="${_esc(item.id)}" data-title="${_esc(item.title)}" title="Delete Bookmark">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Inline edit autofocus & handler
    if (_editingId) {
      const editInput = listEl.querySelector(`#bm-edit-input-${_editingId}`);
      if (editInput) {
        editInput.focus();
        editInput.select();

        const handleSaveInline = async () => {
          const success = await _editBookmarkName(_editingId, editInput.value);
          if (success) {
            _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
            _showToast('Bookmark name updated!', 'success');
          }
        };

        const handleCancelInline = () => {
          _editingId = null;
          _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
        };

        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleSaveInline();
          if (e.key === 'Escape') handleCancelInline();
        });

        listEl.querySelector(`.bm-btn-save-inline[data-id="${_editingId}"]`)?.addEventListener('click', handleSaveInline);
        listEl.querySelector(`.bm-btn-cancel-inline[data-id="${_editingId}"]`)?.addEventListener('click', handleCancelInline);
      }
    }

    // Bind Pin buttons
    listEl.querySelectorAll('.bm-btn-pin').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await _togglePin(btn.dataset.id);
        _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
      });
    });

    // Bind Edit buttons
    listEl.querySelectorAll('.bm-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        _editingId = btn.dataset.id;
        _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
      });
    });

    // Bind Copy buttons with micro feedback
    listEl.querySelectorAll('.bm-btn-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          btn.classList.add('copied-badge');
          _showToast('Link copied to clipboard!', 'success');
          setTimeout(() => btn.classList.remove('copied-badge'), 1200);
        } catch {
          _showToast('Failed to copy link', 'error');
        }
      });
    });

    // Bind Delete buttons
    listEl.querySelectorAll('.bm-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        const title = btn.dataset.title || 'Bookmark';
        await _deleteBookmark(id);
        _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
        _showToast(`Removed "${title}"`, 'info');
      });
    });
  }

  // Render open tabs picker drawer
  async function _renderTabPicker(pickerContainer) {
    pickerContainer.innerHTML = `
      <div class="bm-picker-loading">
        <span>Scanning open tabs…</span>
      </div>
    `;

    const openTabs = await _fetchOpenTabs();

    if (openTabs.length === 0) {
      pickerContainer.innerHTML = `
        <div class="bm-picker-empty">
          <span>No external browser tabs found to bookmark.</span>
        </div>
      `;
      return;
    }

    const bookmarkedUrls = new Set(_bookmarks.map(b => b.url.toLowerCase()));

    pickerContainer.innerHTML = `
      <div class="bm-picker-header">
        <span class="bm-picker-title">Select an open tab to bookmark:</span>
        <button class="bm-picker-close-btn" id="bm-picker-close-btn">✕</button>
      </div>
      <div class="bm-picker-list">
        ${openTabs.map(tab => {
          const isSaved = bookmarkedUrls.has(tab.url.toLowerCase());
          return `
            <div class="bm-picker-item">
              <div class="bm-picker-item-info">
                <div class="bm-picker-fav-wrap">
                  ${tab.favIconUrl 
                    ? `<img class="bm-picker-item-fav" src="${tab.favIconUrl}" alt="" onerror="this.outerHTML='${_renderMonogram(tab.title, tab.url).replace(/'/g, "\\'")}'" />` 
                    : _renderMonogram(tab.title, tab.url)}
                </div>
                <div class="bm-picker-item-text">
                  <span class="bm-picker-item-title">${_esc(tab.title)}</span>
                  <span class="bm-picker-item-url">${_esc(tab.host || tab.url)}</span>
                </div>
              </div>
              <button class="bm-picker-save-btn ${isSaved ? 'already-saved' : ''}" data-url="${_esc(tab.url)}" data-title="${_esc(tab.title)}" ${isSaved ? 'disabled' : ''}>
                ${isSaved ? 'Saved' : '+ Save'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    pickerContainer.querySelector('#bm-picker-close-btn')?.addEventListener('click', () => {
      pickerContainer.classList.add('hidden');
      _isTabPickerOpen = false;
    });

    pickerContainer.querySelectorAll('.bm-picker-save-btn:not(.already-saved)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        const title = btn.dataset.title;
        btn.disabled = true;
        btn.textContent = 'Saving…';
        const res = await _createBookmark(title, url);
        if (res) {
          btn.textContent = 'Saved';
          btn.classList.add('already-saved');
          _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
          _showToast(`Saved "${title}"!`, 'success');
        } else {
          btn.textContent = 'Error';
          setTimeout(() => {
            btn.textContent = '+ Save';
            btn.disabled = false;
          }, 1500);
        }
      });
    });
  }

  // Main render method
  async function render(container) {
    _currentContainer = container;
    _initStorageListener();
    await _loadBookmarks();

    container.innerHTML = `
      <div class="bookmarks-panel">
        <!-- Panel Header -->
        <div class="bookmarks-header">
          <div class="bookmarks-header-title-group">
            <div class="bm-brand-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="bm-title-wrap">
              <span class="bookmarks-title">Bookmarks Hub</span>
              <span class="bookmarks-badge" id="bookmarks-badge-count">0 saved</span>
            </div>
          </div>
          <div class="bookmarks-header-actions">
            <button class="bm-header-btn" id="bm-btn-from-tab" title="Save a currently open tab">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span>From Tab</span>
            </button>
            <button class="bm-header-btn bm-btn-highlight" id="bm-btn-toggle-add" title="Add new bookmark">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Add</span>
            </button>
          </div>
        </div>

        <!-- Inline Add Bookmark Drawer -->
        <div class="bm-drawer bm-add-drawer hidden" id="bm-add-drawer">
          <div class="bm-drawer-title">Add New Bookmark</div>
          <div class="bm-form-group">
            <input type="text" class="bm-input" id="bm-input-title" placeholder="Title (e.g. System Design Primer, LeetCode)" />
            <input type="url" class="bm-input" id="bm-input-url" placeholder="URL (https://…)" />
          </div>
          <div class="bm-drawer-actions">
            <button class="bm-btn-ghost" id="bm-btn-cancel-add">Cancel</button>
            <button class="bm-btn-confirm" id="bm-btn-save-bookmark">Save Bookmark</button>
          </div>
        </div>

        <!-- Open Tabs Picker Drawer -->
        <div class="bm-drawer bm-picker-drawer hidden" id="bm-picker-drawer"></div>

        <!-- Search Bar & Filter Chips -->
        <div class="bookmarks-control-row">
          <div class="bookmarks-search-wrap">
            <svg class="bm-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              class="bookmarks-search-input"
              id="bookmarks-search-input"
              placeholder="Filter bookmarks…"
              autocomplete="off"
            />
          </div>

          <!-- Interactive Filter Chips -->
          <div class="bm-filter-chips">
            <button class="bm-chip active" data-filter="all">All</button>
            <button class="bm-chip" data-filter="pinned">Pinned</button>
            <button class="bm-chip" data-filter="recent">Recent</button>
          </div>
        </div>

        <!-- List of Bookmarks -->
        <div class="bookmarks-list" id="bookmarks-list-items"></div>
      </div>
    `;

    // Render list
    _renderFilteredList();

    // Bind search input
    const searchInput = container.querySelector('#bookmarks-search-input');
    searchInput?.addEventListener('input', (e) => {
      _renderFilteredList(e.target.value);
    });

    // Bind filter chips
    container.querySelectorAll('.bm-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.bm-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        _currentFilter = chip.dataset.filter;
        _renderFilteredList(searchInput?.value || '');
      });
    });

    // Bind Add Drawer toggle
    const addDrawer = container.querySelector('#bm-add-drawer');
    const pickerDrawer = container.querySelector('#bm-picker-drawer');
    const toggleAddBtn = container.querySelector('#bm-btn-toggle-add');
    const cancelAddBtn = container.querySelector('#bm-btn-cancel-add');
    const saveBookmarkBtn = container.querySelector('#bm-btn-save-bookmark');
    const inputTitle = container.querySelector('#bm-input-title');
    const inputUrl = container.querySelector('#bm-input-url');

    toggleAddBtn?.addEventListener('click', () => {
      _isAddDrawerOpen = !_isAddDrawerOpen;
      if (_isAddDrawerOpen) {
        addDrawer?.classList.remove('hidden');
        pickerDrawer?.classList.add('hidden');
        _isTabPickerOpen = false;
        inputTitle?.focus();
      } else {
        addDrawer?.classList.add('hidden');
      }
    });

    cancelAddBtn?.addEventListener('click', () => {
      _isAddDrawerOpen = false;
      addDrawer?.classList.add('hidden');
      if (inputTitle) inputTitle.value = '';
      if (inputUrl) inputUrl.value = '';
    });

    const submitAdd = async () => {
      const url = inputUrl?.value.trim();
      const title = inputTitle?.value.trim();

      if (!url) {
        inputUrl?.focus();
        _showToast('Please enter a valid URL', 'error');
        return;
      }

      saveBookmarkBtn.disabled = true;
      saveBookmarkBtn.textContent = 'Saving…';

      const created = await _createBookmark(title, url);
      saveBookmarkBtn.disabled = false;
      saveBookmarkBtn.textContent = 'Save Bookmark';

      if (created) {
        _isAddDrawerOpen = false;
        addDrawer?.classList.add('hidden');
        if (inputTitle) inputTitle.value = '';
        if (inputUrl) inputUrl.value = '';
        _renderFilteredList(searchInput?.value || '');
        _showToast(`Bookmark saved!`, 'success');
      } else {
        _showToast('Failed to save bookmark', 'error');
      }
    };

    saveBookmarkBtn?.addEventListener('click', submitAdd);
    inputUrl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdd();
      if (e.key === 'Escape') cancelAddBtn?.click();
    });
    inputTitle?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inputUrl?.focus();
      if (e.key === 'Escape') cancelAddBtn?.click();
    });

    // Bind Open Tabs Picker
    const fromTabBtn = container.querySelector('#bm-btn-from-tab');
    fromTabBtn?.addEventListener('click', async () => {
      _isTabPickerOpen = !_isTabPickerOpen;
      if (_isTabPickerOpen) {
        pickerDrawer?.classList.remove('hidden');
        addDrawer?.classList.add('hidden');
        _isAddDrawerOpen = false;
        await _renderTabPicker(pickerDrawer);
      } else {
        pickerDrawer?.classList.add('hidden');
      }
    });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
