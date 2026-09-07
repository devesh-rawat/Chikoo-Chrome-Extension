/**
 * bookmarks.js — Bookmarks Manager & Quick-Add Component (Chikoo)
 *
 * Full integration with chrome.bookmarks API:
 * - View & search bookmarks with domain favicons and clean metadata
 * - Add custom bookmarks with manual Title and URL
 * - "From Tab" picker to bookmark any currently open tab in 1 click
 * - Delete bookmarks with instant UI updates
 * - Copy bookmark URL with toast feedback
 * - Live real-time syncing via chrome.bookmarks event listeners
 * - LocalStorage fallback for non-extension / preview environments
 */

const BookmarksComponent = (() => {
  const STORAGE_FALLBACK_KEY = 'chikoo_bookmarks_fallback';
  let _bookmarks = [];
  let _currentContainer = null;
  let _isListenersAttached = false;
  let _isAddDrawerOpen = false;
  let _isTabPickerOpen = false;

  const DEFAULT_MOCK_BOOKMARKS = [
    { id: 'mock-1', title: 'GitHub · Where the world builds software', url: 'https://github.com', dateAdded: Date.now() - 3600000 },
    { id: 'mock-2', title: 'Google AI Studio · Fast prototyping with Gemini', url: 'https://aistudio.google.com', dateAdded: Date.now() - 7200000 },
    { id: 'mock-3', title: 'MDN Web Docs · Resources for Developers', url: 'https://developer.mozilla.org', dateAdded: Date.now() - 86400000 },
    { id: 'mock-4', title: 'YouTube · Videos & Music', url: 'https://youtube.com', dateAdded: Date.now() - 172800000 },
    { id: 'mock-5', title: 'Stack Overflow · Developer Community', url: 'https://stackoverflow.com', dateAdded: Date.now() - 259200000 },
    { id: 'mock-6', title: 'ChatGPT · OpenAI Assistant', url: 'https://chatgpt.com', dateAdded: Date.now() - 345600000 },
    { id: 'mock-7', title: 'Figma · Collaborative Interface Design', url: 'https://figma.com', dateAdded: Date.now() - 432000000 }
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

  // Flatten nested bookmark trees
  function _flattenTree(nodes, list = []) {
    for (const node of nodes) {
      if (node.url && !node.url.startsWith('javascript:')) {
        list.push({
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          dateAdded: node.dateAdded || Date.now(),
          host: _getHost(node.url)
        });
      }
      if (node.children && node.children.length > 0) {
        _flattenTree(node.children, list);
      }
    }
    return list;
  }

  // Load bookmarks (Chrome API or fallback)
  async function _fetchBookmarks() {
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
      return new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => {
          if (chrome.runtime.lastError || !tree) {
            resolve([]);
            return;
          }
          const all = _flattenTree(tree);
          // Sort by dateAdded descending (most recent first)
          all.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
          resolve(all);
        });
      });
    }

    // Fallback: localStorage via Storage helper
    if (typeof Storage !== 'undefined') {
      const data = await Storage.get([STORAGE_FALLBACK_KEY]);
      const saved = data[STORAGE_FALLBACK_KEY];
      if (saved && Array.isArray(saved) && saved.length > 0) {
        return saved.map(item => ({ ...item, host: _getHost(item.url) }));
      }
    }
    return DEFAULT_MOCK_BOOKMARKS.map(item => ({ ...item, host: _getHost(item.url) }));
  }

  // Save bookmark
  async function _createBookmark(title, url) {
    if (!url) return null;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const cleanTitle = (title || '').trim() || _getHost(formattedUrl) || formattedUrl;

    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.create) {
      return new Promise((resolve) => {
        chrome.bookmarks.create({ title: cleanTitle, url: formattedUrl }, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Error creating bookmark:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result);
          }
        });
      });
    }

    // Fallback: save to Storage
    const newEntry = {
      id: 'custom-' + Date.now(),
      title: cleanTitle,
      url: formattedUrl,
      dateAdded: Date.now(),
      host: _getHost(formattedUrl)
    };
    _bookmarks.unshift(newEntry);
    if (typeof Storage !== 'undefined') {
      await Storage.set({ [STORAGE_FALLBACK_KEY]: _bookmarks });
    }
    return newEntry;
  }

  // Remove bookmark
  async function _deleteBookmark(id) {
    if (!id) return;
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.remove) {
      return new Promise((resolve) => {
        chrome.bookmarks.remove(String(id), () => {
          resolve();
        });
      });
    }

    // Fallback removal
    _bookmarks = _bookmarks.filter(b => b.id !== id);
    if (typeof Storage !== 'undefined') {
      await Storage.set({ [STORAGE_FALLBACK_KEY]: _bookmarks });
    }
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
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  // Setup chrome.bookmarks event listeners for instant syncing
  function _initChromeListeners() {
    if (_isListenersAttached) return;
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      const refresh = async () => {
        if (_currentContainer) {
          _bookmarks = await _fetchBookmarks();
          _renderFilteredList();
        }
      };

      try {
        chrome.bookmarks.onCreated?.addListener(refresh);
        chrome.bookmarks.onRemoved?.addListener(refresh);
        chrome.bookmarks.onChanged?.addListener(refresh);
        _isListenersAttached = true;
      } catch (err) {
        console.warn('Bookmarks listeners could not be attached:', err);
      }
    }
  }

  // Filtered bookmark list renderer
  function _renderFilteredList(query = '') {
    if (!_currentContainer) return;
    const listEl = _currentContainer.querySelector('#bookmarks-list-items');
    const countEl = _currentContainer.querySelector('#bookmarks-badge-count');
    if (!listEl) return;

    const trimmed = query.trim().toLowerCase();
    const filtered = _bookmarks.filter(item =>
      (item.title && item.title.toLowerCase().includes(trimmed)) ||
      (item.url && item.url.toLowerCase().includes(trimmed)) ||
      (item.host && item.host.toLowerCase().includes(trimmed))
    );

    if (countEl) {
      countEl.textContent = `${_bookmarks.length} saved`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="bm-empty-state">
          <span class="bm-empty-icon">🔖</span>
          <p class="bm-empty-title">${query ? 'No matching bookmarks' : 'No bookmarks yet'}</p>
          <span class="bm-empty-sub">${query ? 'Try a different search term' : 'Click "+ Add" or "⚡ From Tab" to save your favorite sites.'}</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const fav = _favicon(item.url);
      const ago = _timeAgo(item.dateAdded);
      const displayHost = item.host || _getHost(item.url);

      return `
        <div class="bm-item" data-id="${_esc(item.id)}" data-url="${_esc(item.url)}">
          <a class="bm-item-link" href="${_esc(item.url)}" target="_blank" rel="noopener noreferrer" title="${_esc(item.title)}&#10;${_esc(item.url)}">
            <div class="bm-item-favicon">
              ${fav ? `<img src="${fav}" alt="" onerror="this.parentElement.innerHTML='🔖'" />` : '🔖'}
            </div>
            <div class="bm-item-text">
              <span class="bm-item-title">${_esc(item.title)}</span>
              <span class="bm-item-host">${_esc(displayHost)}</span>
            </div>
          </a>
          <div class="bm-item-actions">
            ${ago ? `<span class="bm-item-time" title="Saved ${new Date(item.dateAdded).toLocaleString()}">${ago}</span>` : ''}
            <button class="bm-action-btn bm-btn-copy" data-url="${_esc(item.url)}" title="Copy Link">📋</button>
            <button class="bm-action-btn bm-btn-delete" data-id="${_esc(item.id)}" data-title="${_esc(item.title)}" title="Delete Bookmark">🗑</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind item action buttons
    listEl.querySelectorAll('.bm-btn-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          _showToast('Link copied to clipboard!', 'success');
        } catch {
          _showToast('Failed to copy link', 'error');
        }
      });
    });

    listEl.querySelectorAll('.bm-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        const title = btn.dataset.title || 'Bookmark';
        await _deleteBookmark(id);
        _bookmarks = _bookmarks.filter(b => String(b.id) !== String(id));
        _renderFilteredList(_currentContainer.querySelector('#bookmarks-search-input')?.value || '');
        _showToast(`Removed "${title}"`, 'info');
      });
    });
  }

  // Render open tabs picker drawer
  async function _renderTabPicker(pickerContainer) {
    pickerContainer.innerHTML = `
      <div class="bm-picker-loading">
        <span class="bm-picker-spinner">⏳</span> Fetching open tabs…
      </div>
    `;

    const openTabs = await _fetchOpenTabs();

    if (openTabs.length === 0) {
      pickerContainer.innerHTML = `
        <div class="bm-picker-empty">
          <span>No external open tabs found to bookmark.</span>
        </div>
      `;
      return;
    }

    // Check which tabs are already bookmarked
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
                <img class="bm-picker-item-fav" src="${tab.favIconUrl}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'" />
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
          _bookmarks = await _fetchBookmarks();
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
    _initChromeListeners();
    _bookmarks = await _fetchBookmarks();

    container.innerHTML = `
      <div class="bookmarks-panel">
        <!-- Panel Header -->
        <div class="bookmarks-header">
          <div class="bookmarks-header-title-group">
            <span class="bookmarks-header-icon">🔖</span>
            <span class="bookmarks-title">Bookmarks Hub</span>
          </div>
          <div class="bookmarks-header-actions">
            <span class="bookmarks-badge" id="bookmarks-badge-count">0 saved</span>
            <button class="bm-header-btn" id="bm-btn-from-tab" title="Save an currently open tab">
              <span class="bm-btn-icon">⚡</span> From Tab
            </button>
            <button class="bm-header-btn bm-btn-highlight" id="bm-btn-toggle-add" title="Add new bookmark">
              <span class="bm-btn-icon">+</span> Add
            </button>
          </div>
        </div>

        <!-- Inline Add Bookmark Drawer -->
        <div class="bm-drawer bm-add-drawer hidden" id="bm-add-drawer">
          <div class="bm-drawer-title">Add New Bookmark</div>
          <div class="bm-form-group">
            <input type="text" class="bm-input" id="bm-input-title" placeholder="Title (e.g. My Favorite Doc)" />
            <input type="url" class="bm-input" id="bm-input-url" placeholder="URL (https://…)" />
          </div>
          <div class="bm-drawer-actions">
            <button class="bm-btn-ghost" id="bm-btn-cancel-add">Cancel</button>
            <button class="bm-btn-confirm" id="bm-btn-save-bookmark">Save Bookmark</button>
          </div>
        </div>

        <!-- Open Tabs Picker Drawer -->
        <div class="bm-drawer bm-picker-drawer hidden" id="bm-picker-drawer"></div>

        <!-- Search Bar -->
        <div class="bookmarks-search-row">
          <input
            type="text"
            class="bookmarks-search-input"
            id="bookmarks-search-input"
            placeholder="Search saved bookmarks…"
            autocomplete="off"
          />
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
        _bookmarks = await _fetchBookmarks();
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

