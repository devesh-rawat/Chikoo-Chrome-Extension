/**
 * todo.js — Interactive Productivity Task Tracker (Aura Tab)
 *
 * Features: Categories (Work, Personal, Priority), progress bar, task filters, auto-save.
 */

const TodoComponent = (() => {
  const STORAGE_KEY = 'aura_todo_items';
  let _items = [];
  let _filter = 'all'; // 'all' | 'active' | 'completed'

  async function _load() {
    const data = await Storage.get([STORAGE_KEY]);
    _items = data[STORAGE_KEY] ?? [
      { id: '1', text: 'Plan today’s focus goals', done: false, category: 'work' },
      { id: '2', text: 'Listen to Lofi Girl focus beats', done: true, category: 'personal' }
    ];
  }

  async function _save() {
    await Storage.set({ [STORAGE_KEY]: _items });
  }

  function _newId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function _renderList(container) {
    const listEl = container.querySelector('#todo-list');
    const countEl = container.querySelector('#todo-count');
    const statEl = container.querySelector('#todo-stat');
    const progressFill = container.querySelector('#todo-progress-fill');

    if (!listEl) return;

    const total = _items.length;
    const done = _items.filter(i => i.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    if (countEl) countEl.textContent = `${done}/${total} done (${pct}%)`;
    if (statEl) statEl.textContent = `${done} of ${total} tasks completed`;
    if (progressFill) progressFill.style.width = `${pct}%`;

    let filtered = _items;
    if (_filter === 'active') filtered = _items.filter(i => !i.done);
    if (_filter === 'completed') filtered = _items.filter(i => i.done);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="todo-empty">
          <span class="todo-empty-icon">✅</span>
          <span>${total === 0 ? 'No tasks yet. Add one above to get started!' : 'No tasks in this filter.'}</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(item => `
      <div class="todo-item ${item.done ? 'done' : ''}" data-id="${item.id}">
        <div class="todo-check" data-id="${item.id}" title="Toggle task">
          <span class="todo-check-mark">✓</span>
        </div>
        <div class="todo-item-body">
          <span class="todo-text">${_escape(item.text)}</span>
          ${item.category ? `<span class="todo-cat-tag tag-${item.category}">${item.category}</span>` : ''}
        </div>
        <button class="todo-remove-btn" data-id="${item.id}" title="Remove task">×</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.todo-check').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.getAttribute('data-id');
        const item = _items.find(i => i.id === id);
        if (item) {
          item.done = !item.done;
          await _save();
          _renderList(container);
        }
      });
    });

    listEl.querySelectorAll('.todo-remove-btn').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.getAttribute('data-id');
        _items = _items.filter(i => i.id !== id);
        await _save();
        _renderList(container);
      });
    });
  }

  function _escape(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function render(container) {
    await _load();

    container.innerHTML = `
      <div class="todo-panel">
        <div class="todo-header">
          <div class="todo-title-row">
            <span class="todo-title">Task Tracker</span>
            <span class="todo-count" id="todo-count"></span>
          </div>
          <!-- Progress ring bar -->
          <div class="todo-progress-bar">
            <div class="todo-progress-fill" id="todo-progress-fill" style="width:0%;"></div>
          </div>
        </div>

        <!-- Add Task Input Row -->
        <div class="todo-add-row">
          <input
            type="text"
            class="todo-input"
            id="todo-input"
            placeholder="Add a new task…"
            maxlength="120"
            autocomplete="off"
            spellcheck="false"
          />
          <select class="todo-cat-select" id="todo-cat-select">
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="urgent">Urgent</option>
          </select>
          <button class="todo-add-btn" id="todo-add-btn" title="Add task">+</button>
        </div>

        <!-- Task Filter Pills -->
        <div class="todo-filter-row">
          <button class="todo-filter-btn active" data-filter="all">All</button>
          <button class="todo-filter-btn" data-filter="active">Active</button>
          <button class="todo-filter-btn" data-filter="completed">Completed</button>
        </div>

        <div class="todo-list" id="todo-list"></div>

        <div class="todo-footer" id="todo-footer">
          <span class="todo-footer-stat" id="todo-stat"></span>
          <button class="todo-clear-done" id="todo-clear-done">Clear Done</button>
        </div>
      </div>
    `;

    const input = container.querySelector('#todo-input');
    const catSelect = container.querySelector('#todo-cat-select');
    const addBtn = container.querySelector('#todo-add-btn');
    const clearBtn = container.querySelector('#todo-clear-done');

    async function addTask() {
      const text = input.value.trim();
      if (!text) return;
      const category = catSelect ? catSelect.value : 'work';
      _items.unshift({ id: _newId(), text, done: false, category });
      await _save();
      input.value = '';
      _renderList(container);
      input.focus();
    }

    addBtn?.addEventListener('click', addTask);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

    clearBtn?.addEventListener('click', async () => {
      _items = _items.filter(i => !i.done);
      await _save();
      _renderList(container);
    });

    container.querySelectorAll('.todo-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.todo-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _filter = btn.dataset.filter;
        _renderList(container);
      });
    });

    _renderList(container);
  }

  return { render };
})();
