/**
 * quicklinks.js — Interactive Vertical & Floating Quick Links Bar (Aura Tab)
 *
 * Supports adding, editing, deleting shortcuts, custom emoji icons, and persisting in chrome.storage.
 */

const QuickLinksComponent = (() => {
  const STORAGE_KEY = 'aura_quicklinks';

  const DEFAULT_LINKS = [
    { label: 'YouTube', url: 'https://youtube.com', emoji: '▶️' },
    { label: 'Gmail',   url: 'https://mail.google.com', emoji: '📧' },
    { label: 'GitHub',  url: 'https://github.com',      emoji: '🐙' },
    { label: 'Notion',  url: 'https://notion.so',       emoji: '📋' },
    { label: 'ChatGPT', url: 'https://chatgpt.com',     emoji: '🤖' },
    { label: 'Figma',   url: 'https://figma.com',       emoji: '🎨' },
  ];

  let _links = [];

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
              <span class="ql-emoji">${link.emoji || '🔗'}</span>
              <span class="ql-label-tooltip">${_esc(link.label)}</span>
            </a>
            <button class="ql-delete-btn" data-idx="${i}" title="Remove link">×</button>
          </div>
        `).join('')}
        <button class="quicklink-add" id="quicklink-add-trigger" title="Add quick link">+</button>
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
    const inputEmoji = document.getElementById('ql-input-emoji');

    if (addBtn && modal) {
      addBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (inputLabel) inputLabel.value = '';
        if (inputUrl) inputUrl.value = 'https://';
        if (inputEmoji) inputEmoji.value = '🚀';
      });

      const closeModal = () => modal.classList.add('hidden');
      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);

      saveBtn?.onclick = async () => {
        const label = inputLabel?.value.trim();
        let url = inputUrl?.value.trim();
        const emoji = inputEmoji?.value.trim() || '🔗';

        if (!label || !url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        _links.push({ label, url, emoji });
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
