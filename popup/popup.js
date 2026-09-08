/**
 * popup.js — Syncs popup controls with ThemeManager
 * Reads/writes to chrome.storage.local directly
 * (ThemeManager cannot manipulate the newtab page from popup context)
 */

const STORAGE_KEY_MODE = 'theme_mode';
const STORAGE_KEY_DARK = 'theme_dark';

async function initPopup() {
  const data = await Storage.get([STORAGE_KEY_MODE, STORAGE_KEY_DARK]);
  const mode   = data[STORAGE_KEY_MODE] ?? 'minimalistic';
  const isDark = data[STORAGE_KEY_DARK] ?? true;

  // Sync mode buttons
  document.querySelectorAll('#popup-mode-toggle .mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
    btn.addEventListener('click', async () => {
      await Storage.set({ [STORAGE_KEY_MODE]: btn.dataset.mode });
      document.querySelectorAll('#popup-mode-toggle .mode-btn').forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
    });
  });

  // Sync dark toggle
  const darkToggle = document.getElementById('popup-dark-toggle');
  if (darkToggle) {
    darkToggle.checked = isDark;
    darkToggle.addEventListener('change', async () => {
      await Storage.set({ [STORAGE_KEY_DARK]: darkToggle.checked });
    });
  }
}

// ── Quick Bookmark Active Tab ───────────────────────────────
async function initQuickBookmark() {
  const card = document.getElementById('popup-bm-card');
  const favEl = document.getElementById('popup-bm-fav');
  const titleEl = document.getElementById('popup-bm-title');
  const urlEl = document.getElementById('popup-bm-url');
  const bmBtn = document.getElementById('popup-btn-bookmark');
  const statusEl = document.getElementById('popup-bm-status');

  if (!card || !bmBtn) return;

  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
    if (titleEl) titleEl.textContent = 'Preview Mode';
    if (urlEl) urlEl.textContent = 'Bookmarks active in Chrome';
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab || !activeTab.url || !/^https?:\/\//i.test(activeTab.url)) {
    if (titleEl) titleEl.textContent = 'Internal / System Page';
    if (urlEl) urlEl.textContent = 'Navigate to a website to bookmark it';
    bmBtn.disabled = true;
    return;
  }

  let host = '';
  try {
    host = new URL(activeTab.url).hostname;
  } catch {}

  if (titleEl) titleEl.textContent = activeTab.title || host;
  if (urlEl) urlEl.textContent = host || activeTab.url;

  if (favEl) {
    favEl.src = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    favEl.style.display = 'block';
  }

  // Check if current tab is already bookmarked
  let existingBookmarkId = null;
  if (chrome.bookmarks && chrome.bookmarks.search) {
    const results = await chrome.bookmarks.search({ url: activeTab.url });
    if (results && results.length > 0) {
      existingBookmarkId = results[0].id;
    }
  }

  function setBookmarkedState(isBookmarked) {
    if (isBookmarked) {
      bmBtn.classList.add('is-bookmarked');
      bmBtn.innerHTML = '<span class="popup-bm-btn-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span><span class="popup-bm-btn-label">Saved in Bookmarks</span>';
      bmBtn.title = 'Click to remove from bookmarks';
    } else {
      bmBtn.classList.remove('is-bookmarked');
      bmBtn.innerHTML = '<span class="popup-bm-btn-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span><span class="popup-bm-btn-label">Bookmark This Tab</span>';
      bmBtn.title = 'Add to bookmarks';
    }
    bmBtn.disabled = false;
  }

  setBookmarkedState(!!existingBookmarkId);

  bmBtn.addEventListener('click', async () => {
    bmBtn.disabled = true;

    if (existingBookmarkId) {
      // Remove bookmark
      if (chrome.bookmarks && chrome.bookmarks.remove) {
        await chrome.bookmarks.remove(existingBookmarkId);
      }
      existingBookmarkId = null;
      setBookmarkedState(false);
      if (statusEl) {
        statusEl.textContent = 'Removed from bookmarks';
        statusEl.classList.remove('hidden');
        setTimeout(() => statusEl.classList.add('hidden'), 2000);
      }
    } else {
      // Add bookmark
      if (chrome.bookmarks && chrome.bookmarks.create) {
        const created = await chrome.bookmarks.create({
          title: activeTab.title || host,
          url: activeTab.url
        });
        existingBookmarkId = created ? created.id : null;
      }
      setBookmarkedState(true);
      if (statusEl) {
        statusEl.textContent = 'Saved to bookmarks';
        statusEl.classList.remove('hidden');
        setTimeout(() => statusEl.classList.add('hidden'), 2000);
      }
    }
  });
}

initPopup();
initQuickBookmark();
