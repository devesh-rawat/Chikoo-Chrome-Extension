/**
 * quicklinks.js — Interactive Vertical & Floating Quick Links Bar (Chikoo)
 *
 * Supports adding, deleting shortcuts, automatic favicon resolution, and persistent storage.
 */

const QuickLinksComponent = (() => {
  const STORAGE_KEY = 'aura_quicklinks';

  const DEFAULT_LINKS = [
    { label: 'YouTube',  url: 'https://youtube.com' },
    { label: 'Gmail',    url: 'https://mail.google.com' },
    { label: 'GitHub',   url: 'https://github.com' },
    { label: 'Notion',   url: 'https://notion.so' },
    { label: 'ChatGPT',  url: 'https://chatgpt.com' },
    { label: 'MDN Docs', url: 'https://developer.mozilla.org' },
  ];

  let _links = [];

  function _getHost(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  function _favicon(url) {
    const host = _getHost(url);
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  }

  function _getMonogramBg(str) {
    let hash = 0;
    const text = str || 'chikoo';
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return `linear-gradient(135deg, hsl(${hash}, 65%, 45%), hsl(${(hash + 35) % 360}, 75%, 55%))`;
  }

  function _renderIcon(link) {
    const fav = _favicon(link.url);
    const letter = (link.label || 'L').charAt(0).toUpperCase();
    const bg = _getMonogramBg(link.label || link.url);

    if (fav) {
      return `<img src="${fav}" alt="" class="ql-fav-img" onerror="this.outerHTML='<span class=\\'ql-mono-fallback\\' style=\\'background:${bg}\\'>${letter}</span>'" />`;
    }
    return `<span class="ql-mono-fallback" style="background:${bg}">${letter}</span>`;
  }

  async function _loadLinks() {
    const data = await Storage.get([STORAGE_KEY]);
    _links = data[STORAGE_KEY] ?? DEFAULT_LINKS;
  }

  async function _saveLinks() {
    await Storage.set({ [STORAGE_KEY]: _links });
  }

  async function render(container) {
    await _loadLinks();

    container.innerHTML = `
      <div class="section-quicklinks">
        ${_links.map((link, i) => `
          <div class="quicklink-item-wrap">
            <a
              href="${link.url}"
              class="quicklink-item"
              id="quicklink-${i}"
              title="${_esc(link.label)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="ql-icon-wrap">${_renderIcon(link)}</span>
              <span class="ql-label-tooltip">${_esc(link.label)}</span>
            </a>
            <button class="ql-delete-btn" data-idx="${i}" title="Remove link">✕</button>
          </div>
        `).join('')}
        <button class="quicklink-add" id="quicklink-add-trigger" title="Add quick link">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    `;

    // Hook up delete buttons
    container.querySelectorAll('.ql-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        _links.splice(idx, 1);
        await _saveLinks();
        render(container);
      });
    });

    // Hook up modal trigger
    const addBtn = container.querySelector('#quicklink-add-trigger');
    const modal = document.getElementById('quicklinks-modal');
    const closeBtn = document.getElementById('ql-modal-close');
    const cancelBtn = document.getElementById('ql-modal-cancel');
    const saveBtn = document.getElementById('ql-modal-save');

    const inputLabel = document.getElementById('ql-input-label');
    const inputUrl = document.getElementById('ql-input-url');

    if (addBtn && modal) {
      addBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (inputLabel) inputLabel.value = '';
        if (inputUrl) inputUrl.value = 'https://';
        inputLabel?.focus();
      });

      const closeModal = () => modal.classList.add('hidden');
      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);

      saveBtn.onclick = async () => {
        const label = inputLabel?.value.trim();
        let url = inputUrl?.value.trim();

        if (!label || !url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        _links.push({ label, url });
        await _saveLinks();
        closeModal();
        render(container);
      };
    }
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
