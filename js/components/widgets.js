/**
 * widgets.js — Daily Practice & Focus Studio Controller (Chikoo)
 *
 * Featured Capabilities:
 *  - Interactive Hero Focus Station with animated SVG Circular Ring Timer
 *  - 4 High-Contrast Studio Color Themes (Emerald Zen, Cyber Violet, Solar Amber, Deep Ocean)
 *  - Clean Geometric Indicator Badges (no AI-style emojis)
 *  - Direct Target Goal Countdown for deep practice sessions
 *  - Interactive quick adjustments (-15m, -5m, +5m, +15m, Complete, Reset)
 *  - Sleek category management (DSA, DEV, SYS, CORE, DOCS, REVIEW)
 *  - In-app glassmorphic celebration banner & harmonic chime
 *  - Daily Reflection Notes synced per date into persistent storage
 *  - Real-time date-based history synchronization with the Study & Holiday Calendar
 */

const WidgetsController = (() => {
  const PRACTICE_TASKS_KEY   = 'chikoo_practice_tasks';
  const PRACTICE_HISTORY_KEY = 'chikoo_practice_history';
  const PRACTICE_THEME_KEY   = 'chikoo_practice_theme';

  // Available Task Categories
  const CATEGORIES = [
    { key: 'DSA',    label: 'DSA',    desc: 'Algorithms & Data Structures' },
    { key: 'DEV',    label: 'DEV',    desc: 'Frontend & Full-Stack Projects' },
    { key: 'SYS',    label: 'SYS',    desc: 'System Design & Distributed Systems' },
    { key: 'CORE',   label: 'CORE',   desc: 'Computer Architecture & OS' },
    { key: 'DOCS',   label: 'DOCS',   desc: 'Technical Docs & Papers' },
    { key: 'REVIEW', label: 'REVIEW', desc: 'Revision & Mock Interviews' }
  ];

  // ═══════════════════════════════════════════════════════════
  //  STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  let _practiceTasks = [];
  let _activeTaskId = null;
  let _timerRunning = false;
  let _timerInterval = null;
  let _activeTheme = 'emerald'; // 'emerald' | 'cyber' | 'solar' | 'ocean'
  let _isDrawerOpen = false;
  let _editingTaskId = null;
  let _todayNotes = '';

  function _getTodayKey() {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  const DEFAULT_PRACTICE_TASKS = [
    {
      id: 'task-dsa',
      title: 'DSA Practice',
      targetMinutes: 60,
      remainingSeconds: 60 * 60,
      link: 'https://leetcode.com/problemset',
      category: 'DSA',
      completed: false,
      date: _getTodayKey()
    },
    {
      id: 'task-sys',
      title: 'System Design & Aptitude',
      targetMinutes: 45,
      remainingSeconds: 45 * 60,
      link: 'https://www.indiabix.com/aptitude/questions-and-answers/',
      category: 'SYS',
      completed: false,
      date: _getTodayKey()
    },
    {
      id: 'task-core',
      title: 'Core CS / Web Development',
      targetMinutes: 30,
      remainingSeconds: 30 * 60,
      link: 'https://developer.mozilla.org',
      category: 'DEV',
      completed: false,
      date: _getTodayKey()
    }
  ];

  // ═══════════════════════════════════════════════════════════
  //  AUDIO CHIME (Synthesized Web Audio)
  // ═══════════════════════════════════════════════════════════
  function _playCompletionChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.1));

        gain.gain.setValueAtTime(0, ctx.currentTime + (idx * 0.1));
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + (idx * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.1) + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + (idx * 0.1));
        osc.stop(ctx.currentTime + (idx * 0.1) + 0.9);
      });

      setTimeout(() => {
        try { ctx.close(); } catch (e) {}
      }, 1200);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════
  //  CANVAS CONFETTI
  // ═══════════════════════════════════════════════════════════
  function _fireConfetti(container) {
    const canvas = container.querySelector('#focus-confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 600;
    canvas.height = canvas.parentElement.clientHeight || 400;

    const particles = [];
    const colors = ['#10b981', '#38bdf8', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let animId = null;
    function renderFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animId);
      }
    }
    renderFrame();
  }

  // ═══════════════════════════════════════════════════════════
  //  CELEBRATION BANNER (In-App Toast, replaces window.alert)
  // ═══════════════════════════════════════════════════════════
  function _showCelebrationToast(container, taskTitle) {
    const existing = container.querySelector('.studio-celebration-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'studio-celebration-toast';
    toast.innerHTML = `
      <div class="sct-badge">GOAL ACCOMPLISHED</div>
      <div class="sct-title">${_esc(taskTitle)}</div>
      <div class="sct-sub">Target practice completed and recorded to your study history.</div>
      <button class="sct-dismiss-btn" type="button">Dismiss</button>
    `;

    toast.querySelector('.sct-dismiss-btn')?.addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
      }
    }, 5500);
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA PERSISTENCE & HISTORY
  // ═══════════════════════════════════════════════════════════
  async function _loadData() {
    const today = _getTodayKey();
    if (typeof Storage !== 'undefined') {
      const data = await Storage.get([
        PRACTICE_TASKS_KEY,
        PRACTICE_HISTORY_KEY,
        PRACTICE_THEME_KEY
      ]);

      _activeTheme = data[PRACTICE_THEME_KEY] || 'emerald';

      let tasks = data[PRACTICE_TASKS_KEY];
      const history = data[PRACTICE_HISTORY_KEY] || {};

      if (history[today] && history[today].notes) {
        _todayNotes = history[today].notes;
      }

      if (Array.isArray(tasks) && tasks.length > 0) {
        const taskDate = tasks[0].date;
        if (taskDate && taskDate !== today) {
          if (!history[taskDate]) {
            history[taskDate] = _buildSnapshotForTasks(tasks, taskDate, _todayNotes);
            await Storage.set({ [PRACTICE_HISTORY_KEY]: history });
          }
          tasks = tasks.map(t => ({
            ...t,
            remainingSeconds: t.targetMinutes * 60,
            completed: false,
            date: today
          }));
          _todayNotes = '';
        }

        _practiceTasks = tasks.map(t => ({
          ...t,
          category: t.category || _cleanCategory(t.icon) || 'DEV'
        }));

        if (!_activeTaskId && _practiceTasks.length > 0) {
          _activeTaskId = _practiceTasks[0].id;
        }
        await _recordTodayHistory();
        return;
      }
    }

    _practiceTasks = JSON.parse(JSON.stringify(DEFAULT_PRACTICE_TASKS));
    _activeTaskId = _practiceTasks[0].id;
    await _savePracticeTasks();
  }

  function _cleanCategory(iconOrCat) {
    if (!iconOrCat) return 'DEV';
    if (iconOrCat.includes('dsa') || iconOrCat === '💻') return 'DSA';
    if (iconOrCat.includes('apt') || iconOrCat === '🧠') return 'SYS';
    if (iconOrCat.includes('web') || iconOrCat === '🌐') return 'DEV';
    if (iconOrCat.includes('core') || iconOrCat === '⚙️') return 'CORE';
    if (iconOrCat.includes('doc') || iconOrCat === '📚') return 'DOCS';
    return String(iconOrCat).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'DEV';
  }

  function _buildSnapshotForTasks(tasks, dateStr, notes = '') {
    const totalGoalMinutes = tasks.reduce((acc, t) => acc + (t.targetMinutes || 0), 0);
    const practicedMinutes = tasks.reduce((acc, t) => {
      const totalSec = (t.targetMinutes || 0) * 60;
      const remSec = Math.max(0, t.remainingSeconds ?? totalSec);
      return acc + Math.round(Math.max(0, totalSec - remSec) / 60);
    }, 0);
    const practicedSeconds = tasks.reduce((acc, t) => {
      const totalSec = (t.targetMinutes || 0) * 60;
      const remSec = Math.max(0, t.remainingSeconds ?? totalSec);
      return acc + Math.max(0, totalSec - remSec);
    }, 0);
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const pct = totalGoalMinutes > 0 ? Math.min(100, Math.round((practicedMinutes / totalGoalMinutes) * 100)) : 0;

    return {
      date: dateStr,
      totalGoalMinutes,
      practicedMinutes,
      practicedSeconds,
      completedCount,
      totalCount,
      pct,
      notes: notes || '',
      tasks: tasks.map(t => {
        const totalSec = (t.targetMinutes || 0) * 60;
        const remSec = Math.max(0, t.remainingSeconds ?? totalSec);
        return {
          id: t.id,
          title: t.title,
          category: t.category || 'DEV',
          targetMinutes: t.targetMinutes,
          practicedMinutes: Math.round(Math.max(0, totalSec - remSec) / 60),
          completed: !!t.completed
        };
      }),
      updatedAt: Date.now()
    };
  }

  async function _recordTodayHistory() {
    if (typeof Storage === 'undefined') return;
    const today = _getTodayKey();
    const data = await Storage.get([PRACTICE_HISTORY_KEY]);
    const history = data[PRACTICE_HISTORY_KEY] || {};
    const snapshot = _buildSnapshotForTasks(_practiceTasks, today, _todayNotes);
    history[today] = snapshot;
    await Storage.set({ [PRACTICE_HISTORY_KEY]: history });

    window.dispatchEvent(new CustomEvent('chikoo-practice-updated', {
      detail: { date: today, snapshot }
    }));
  }

  async function _savePracticeTasks() {
    if (typeof Storage !== 'undefined') {
      await Storage.set({ [PRACTICE_TASKS_KEY]: _practiceTasks });
      await _recordTodayHistory();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  FORMATTING HELPERS
  // ═══════════════════════════════════════════════════════════
  function _formatHMS(secs) {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`;
    return `${m}m`;
  }

  function _formatDigits(secs) {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remSec = s % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  }

  function _getDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'Resource';
    }
  }

  function _calcDashboardStats() {
    const totalSecs = _practiceTasks.reduce((acc, t) => acc + (t.targetMinutes * 60), 0);
    const remSecs = _practiceTasks.reduce((acc, t) => acc + Math.max(0, t.remainingSeconds), 0);
    const doneSecs = Math.max(0, totalSecs - remSecs);
    const pct = totalSecs > 0 ? Math.min(100, Math.round((doneSecs / totalSecs) * 100)) : 0;
    return { totalSecs, remSecs, doneSecs, pct };
  }

  function _getActiveTask() {
    return _practiceTasks.find(t => String(t.id) === String(_activeTaskId)) || _practiceTasks[0] || null;
  }

  function _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN STUDIO RENDERER
  // ═══════════════════════════════════════════════════════════
  function _renderStudio(display) {
    const stats = _calcDashboardStats();
    const activeTask = _getActiveTask();

    // Active task goal countdown
    const displaySeconds = activeTask ? activeTask.remainingSeconds : 0;
    const totalTargetSeconds = activeTask ? (activeTask.targetMinutes * 60) : 1;
    const progressPct = totalTargetSeconds > 0
      ? Math.min(100, Math.round(((totalTargetSeconds - displaySeconds) / totalTargetSeconds) * 100))
      : 0;

    const statusPillClass = activeTask && activeTask.completed
      ? 'status-accomplished'
      : (_timerRunning ? 'status-running' : 'status-paused');

    const statusLabel = activeTask && activeTask.completed
      ? 'Target Accomplished'
      : (_timerRunning ? 'Session Active' : 'Session Paused');

    // Circumference for r=70 is 2 * PI * 70 = 439.82
    const circumference = 439.82;
    const strokeOffset = circumference - (circumference * (progressPct / 100));

    display.innerHTML = `
      <div class="focus-studio-container theme-${_activeTheme}" id="focus-studio">
        <canvas class="focus-confetti-canvas" id="focus-confetti-canvas"></canvas>

        <!-- Top Studio Bar: Brand & Mood Theme Pills -->
        <div class="studio-top-bar">
          <div class="stb-left">
            <div class="studio-title-badge">
              <span class="stb-pip"></span>
              <div class="stb-title-wrap">
                <span class="stb-main-title">Focus Studio</span>
                <span class="stb-sub-title">Daily Practice &amp; Mastery</span>
              </div>
            </div>
          </div>

          <!-- Color Theme Pills with glowing dot swatches (no emojis) -->
          <div class="studio-theme-picker">
            <button class="stp-btn ${_activeTheme === 'emerald' ? 'active' : ''}" data-theme="emerald" title="Emerald Zen">
              <span class="stp-dot stp-dot-emerald"></span> Emerald
            </button>
            <button class="stp-btn ${_activeTheme === 'cyber' ? 'active' : ''}" data-theme="cyber" title="Cyber Violet">
              <span class="stp-dot stp-dot-cyber"></span> Violet
            </button>
            <button class="stp-btn ${_activeTheme === 'solar' ? 'active' : ''}" data-theme="solar" title="Solar Amber">
              <span class="stp-dot stp-dot-solar"></span> Amber
            </button>
            <button class="stp-btn ${_activeTheme === 'ocean' ? 'active' : ''}" data-theme="ocean" title="Deep Ocean">
              <span class="stp-dot stp-dot-ocean"></span> Ocean
            </button>
          </div>
        </div>

        <!-- Studio Body Grid (2 Columns: Hero Focus Timer on Left, Tasks & Notes on Right) -->
        <div class="studio-body-grid">

          <!-- LEFT: Hero Circular Focus Station -->
          <div class="studio-hero-card">
            <!-- SVG Circular Gauge Timer -->
            <div class="focus-ring-container ${_timerRunning ? 'pulsing' : ''}">
              <svg class="focus-ring-svg" viewBox="0 0 160 160">
                <circle class="focus-ring-bg" cx="80" cy="80" r="70" />
                <circle
                  class="focus-ring-bar"
                  id="focus-ring-bar"
                  cx="80"
                  cy="80"
                  r="70"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${strokeOffset}"
                />
              </svg>
              <div class="focus-ring-center">
                <span class="frc-cat-pill" id="frc-cat-pill">${_esc(activeTask ? (activeTask.category || 'FOCUS') : 'FOCUS')}</span>
                <span class="frc-digits" id="frc-digits">${_formatDigits(displaySeconds)}</span>
                <div class="frc-pill ${statusPillClass}" id="frc-status-pill">
                  <span class="frc-pip"></span>
                  <span id="frc-status-text">${statusLabel}</span>
                </div>
                <span class="frc-pct" id="frc-pct">${progressPct}%</span>
              </div>
            </div>

            <!-- Active Task Info & Quick Links -->
            ${activeTask ? `
              <div class="hero-active-info">
                <div class="hai-title-row">
                  <span class="hai-title">${_esc(activeTask.title)}</span>
                  ${activeTask.link ? `
                    <a href="${_esc(activeTask.link)}" target="_blank" class="hai-link" title="Open practice resource">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      <span>${_esc(_getDomain(activeTask.link))}</span>
                    </a>
                  ` : ''}
                </div>
                <div class="hai-meta">
                  <span>Goal: <strong>${activeTask.targetMinutes}m</strong></span>
                  <span class="hai-divider">·</span>
                  <span>Remaining: <strong id="hai-rem-time">${_formatHMS(activeTask.remainingSeconds)}</strong></span>
                </div>
              </div>
            ` : ''}

            <!-- Timer Action Controls -->
            <div class="hero-controls-row">
              <button class="hero-play-btn ${_timerRunning ? 'running' : ''}" id="hero-btn-play" title="${_timerRunning ? 'Pause Session' : 'Start Focus Session'}">
                <svg class="hpb-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  ${_timerRunning 
                    ? '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>' 
                    : '<path d="M8 5v14l11-7z"/>'}
                </svg>
                <span>${_timerRunning ? 'Pause Focus' : 'Start Focus'}</span>
              </button>
              
              <!-- Quick Adjust Chips -->
              <div class="hero-quick-adjusts">
                <button class="hqa-btn" id="hqa-minus-15" title="Log 15 mins practiced">-15m</button>
                <button class="hqa-btn" id="hqa-minus-5" title="Log 5 mins practiced">-5m</button>
                <button class="hqa-btn" id="hqa-plus-5" title="Add 5 mins target">+5m</button>
                <button class="hqa-btn" id="hqa-plus-15" title="Add 15 mins target">+15m</button>
                <button class="hqa-btn done-btn" id="hqa-mark-done" title="Complete task with celebration">Complete</button>
              </div>
            </div>
          </div>

          <!-- RIGHT: Tasks Manager & Daily Session Reflections -->
          <div class="studio-tasks-pane">
            <!-- Overall Daily Progress & Quick Actions -->
            <div class="studio-stats-header">
              <div class="ssh-metrics">
                <div class="ssh-metric-item">
                  <span class="smi-label">Total Goal</span>
                  <span class="smi-val">${_formatHMS(stats.totalSecs)}</span>
                </div>
                <div class="ssh-metric-item">
                  <span class="smi-label">Practiced</span>
                  <span class="smi-val" id="ssh-val-done">${_formatHMS(stats.doneSecs)}</span>
                </div>
                <div class="ssh-metric-item">
                  <span class="smi-label">Progress</span>
                  <span class="smi-val" id="ssh-val-pct">${stats.pct}%</span>
                </div>
              </div>

              <div class="ssh-actions">
                <button class="ssh-btn" id="ssh-btn-reset-day" title="Reset all task timers for today">Reset</button>
                <button class="ssh-btn primary" id="ssh-btn-add-task">+ New Task</button>
              </div>
            </div>

            <!-- Overall Progress Bar -->
            <div class="studio-overall-bar">
              <div class="studio-overall-fill" id="studio-overall-fill" style="width: ${stats.pct}%;"></div>
            </div>

            <!-- Task Drawer (Collapsible) -->
            <div class="studio-drawer ${_isDrawerOpen ? '' : 'hidden'}" id="studio-drawer">
              <div class="sd-header">
                <span class="sd-title">${_editingTaskId ? 'Edit Practice Task' : 'Add Practice Task'}</span>
                <button class="sd-close" id="sd-btn-close">✕</button>
              </div>
              <div class="sd-body">
                <input type="text" class="sd-input" id="sd-input-name" placeholder="Task name (e.g. LeetCode Trees, Aptitude Ratios)…" />
                <div class="sd-presets-row">
                  <span class="sd-label">Target:</span>
                  <button type="button" class="sd-chip" data-mins="15">15m</button>
                  <button type="button" class="sd-chip" data-mins="30">30m</button>
                  <button type="button" class="sd-chip active" data-mins="60">60m</button>
                  <button type="button" class="sd-chip" data-mins="90">90m</button>
                  <input type="number" class="sd-input-mins" id="sd-input-mins" min="5" max="480" value="60" />
                  <span class="sd-sub">mins</span>
                </div>
                <input type="url" class="sd-input" id="sd-input-link" placeholder="Resource link (e.g. https://leetcode.com/problemset)…" />
                
                <!-- Sleek Category Selector (Replaces emoji picker) -->
                <div class="sd-category-row">
                  <span class="sd-label">Category:</span>
                  <div class="sd-category-picker" id="sd-category-picker">
                    ${CATEGORIES.map(c => `
                      <button type="button" class="sd-cat-btn" data-cat="${c.key}" title="${c.desc}">${c.label}</button>
                    `).join('')}
                  </div>
                </div>

                <div class="sd-actions">
                  <button type="button" class="sd-btn-cancel" id="sd-btn-cancel">Cancel</button>
                  <button type="button" class="sd-btn-save" id="sd-btn-save">${_editingTaskId ? 'Update' : 'Save Task'}</button>
                </div>
              </div>
            </div>

            <!-- Scrollable Tasks List -->
            <div class="studio-tasks-list" id="studio-tasks-list">
              ${_practiceTasks.map(task => {
                const targetSecs = task.targetMinutes * 60;
                const remSecs = task.remainingSeconds;
                const pct = targetSecs > 0 ? Math.min(100, Math.round(((targetSecs - remSecs) / targetSecs) * 100)) : 0;
                const isSelected = activeTask && String(task.id) === String(activeTask.id);
                const category = task.category || 'DEV';

                return `
                  <div class="st-card ${isSelected ? 'selected' : ''} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <div class="stc-cat-pill cat-${category.toLowerCase()}">${category}</div>
                    <div class="stc-content">
                      <div class="stc-row-top">
                        <span class="stc-title">${_esc(task.title)}</span>
                        ${task.completed ? '<span class="stc-badge-done">Accomplished</span>' : ''}
                      </div>
                      <div class="stc-row-meta">
                        <span class="stc-time-chip ${task.completed ? 'done' : ''}">
                          ${task.completed ? 'Goal Complete' : `${_formatHMS(remSecs)} left of ${task.targetMinutes}m`}
                        </span>
                        ${task.link ? `
                          <a href="${_esc(task.link)}" target="_blank" class="stc-link">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            <span>${_esc(_getDomain(task.link))}</span>
                          </a>
                        ` : ''}
                      </div>
                      <div class="stc-progress-bar">
                        <div class="stc-progress-fill ${task.completed ? 'done' : ''}" style="width: ${pct}%;"></div>
                      </div>
                    </div>
                    <div class="stc-actions">
                      <button class="stc-btn-focus" title="${isSelected && _timerRunning ? 'Pause' : 'Focus'}">
                        ${isSelected && _timerRunning 
                          ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>' 
                          : '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'}
                      </button>
                      <button class="stc-btn-sub15" title="Quick record 15 mins">-15m</button>
                      <button class="stc-btn-edit" title="Edit task">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="stc-btn-delete" title="Delete task">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Today's Practice Reflections / Notes Section -->
            <div class="studio-reflection-box">
              <div class="srb-header">
                <span class="srb-title">Daily Practice Reflections</span>
                <span class="srb-hint" id="srb-save-status">
                  <span class="srb-pip"></span> Auto-saved to calendar
                </span>
              </div>
              <textarea
                class="srb-input"
                id="srb-notes-input"
                placeholder="Jot down problems solved, concepts learned, or blockers encountered today… Automatically visible when inspecting this date in the calendar."
                rows="2"
              >${_esc(_todayNotes)}</textarea>
            </div>

          </div>
        </div>
      </div>
    `;

    _bindStudioEvents(display);
  }

  // ═══════════════════════════════════════════════════════════
  //  EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════
  function _bindStudioEvents(display) {
    // 1. Color theme picker
    display.querySelectorAll('.stp-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        _activeTheme = btn.dataset.theme;
        await Storage.set({ [PRACTICE_THEME_KEY]: _activeTheme });
        const container = display.querySelector('#focus-studio');
        if (container) {
          container.className = `focus-studio-container theme-${_activeTheme}`;
        }
        display.querySelectorAll('.stp-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 2. Hero Play / Pause
    display.querySelector('#hero-btn-play')?.addEventListener('click', () => {
      _toggleTimer(display);
    });

    // 3. Hero Quick Adjusts
    display.querySelector('#hqa-minus-15')?.addEventListener('click', async () => {
      await _reduceTimeForActiveTask(900, display);
      _renderStudio(display);
    });

    display.querySelector('#hqa-minus-5')?.addEventListener('click', async () => {
      await _reduceTimeForActiveTask(300, display);
      _renderStudio(display);
    });

    display.querySelector('#hqa-plus-5')?.addEventListener('click', async () => {
      await _addTimeForActiveTask(300);
      _renderStudio(display);
    });

    display.querySelector('#hqa-plus-15')?.addEventListener('click', async () => {
      await _addTimeForActiveTask(900);
      _renderStudio(display);
    });

    display.querySelector('#hqa-mark-done')?.addEventListener('click', async () => {
      const task = _getActiveTask();
      if (task) {
        task.remainingSeconds = 0;
        task.completed = true;
        await _savePracticeTasks();
        _playCompletionChime();
        _fireConfetti(display);
        _showCelebrationToast(display, task.title);
        _renderStudio(display);
      }
    });

    // 4. Reset Day
    display.querySelector('#ssh-btn-reset-day')?.addEventListener('click', async () => {
      if (confirm('Reset all daily practice tasks to their full target time for today?')) {
        if (_timerRunning) {
          clearInterval(_timerInterval);
          _timerRunning = false;
        }
        _practiceTasks.forEach(task => {
          task.remainingSeconds = task.targetMinutes * 60;
          task.completed = false;
          task.date = _getTodayKey();
        });
        await _savePracticeTasks();
        _renderStudio(display);
      }
    });

    // 5. Add Task Drawer Toggle
    display.querySelector('#ssh-btn-add-task')?.addEventListener('click', () => {
      _editingTaskId = null;
      _isDrawerOpen = !_isDrawerOpen;
      _renderStudio(display);
      if (_isDrawerOpen) {
        setTimeout(() => display.querySelector('#sd-input-name')?.focus(), 50);
      }
    });

    display.querySelector('#sd-btn-close')?.addEventListener('click', () => {
      _isDrawerOpen = false;
      _editingTaskId = null;
      _renderStudio(display);
    });

    display.querySelector('#sd-btn-cancel')?.addEventListener('click', () => {
      _isDrawerOpen = false;
      _editingTaskId = null;
      _renderStudio(display);
    });

    // Drawer preset chips
    display.querySelectorAll('.sd-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        display.querySelectorAll('.sd-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const minsInput = display.querySelector('#sd-input-mins');
        if (minsInput) minsInput.value = chip.dataset.mins;
      });
    });

    // Drawer category selector
    let selectedCat = 'DSA';
    const catButtons = display.querySelectorAll('.sd-cat-btn');
    if (catButtons.length > 0) {
      catButtons[0].classList.add('active');
      selectedCat = catButtons[0].dataset.cat;
    }
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCat = btn.dataset.cat;
      });
    });

    // Save Task in drawer
    display.querySelector('#sd-btn-save')?.addEventListener('click', async () => {
      const inputName = display.querySelector('#sd-input-name');
      const inputLink = display.querySelector('#sd-input-link');
      const inputMins = display.querySelector('#sd-input-mins');

      const title = (inputName?.value || '').trim();
      const mins = parseInt(inputMins?.value || '60', 10);
      let link = (inputLink?.value || '').trim();
      if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;

      if (!title) {
        inputName?.focus();
        return;
      }

      if (_editingTaskId) {
        const task = _practiceTasks.find(t => String(t.id) === String(_editingTaskId));
        if (task) {
          task.title = title;
          task.targetMinutes = Math.max(5, mins);
          task.link = link;
          task.category = selectedCat;
          if (task.remainingSeconds > task.targetMinutes * 60) {
            task.remainingSeconds = task.targetMinutes * 60;
          }
          if (task.remainingSeconds > 0) task.completed = false;
        }
        _editingTaskId = null;
      } else {
        const newTask = {
          id: 'task-' + Date.now(),
          title: title,
          targetMinutes: Math.max(5, mins),
          remainingSeconds: Math.max(5, mins) * 60,
          link: link,
          category: selectedCat,
          completed: false,
          date: _getTodayKey()
        };
        _practiceTasks.push(newTask);
        _activeTaskId = newTask.id;
      }

      _isDrawerOpen = false;
      await _savePracticeTasks();
      _renderStudio(display);
    });

    // 6. Task Card Interactions
    display.querySelectorAll('.st-card').forEach(card => {
      const taskId = card.dataset.id;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.stc-actions') || e.target.closest('a')) return;
        _activeTaskId = taskId;
        _renderStudio(display);
      });

      card.querySelector('.stc-btn-focus')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_activeTaskId === taskId && _timerRunning) {
          _toggleTimer(display);
        } else {
          _activeTaskId = taskId;
          if (!_timerRunning) _toggleTimer(display);
          else _renderStudio(display);
        }
      });

      card.querySelector('.stc-btn-sub15')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const task = _practiceTasks.find(t => String(t.id) === String(taskId));
        if (task) {
          task.remainingSeconds = Math.max(0, task.remainingSeconds - 900);
          if (task.remainingSeconds <= 0) {
            task.completed = true;
            _playCompletionChime();
            _fireConfetti(display);
            _showCelebrationToast(display, task.title);
          }
          await _savePracticeTasks();
          _renderStudio(display);
        }
      });

      card.querySelector('.stc-btn-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const task = _practiceTasks.find(t => String(t.id) === String(taskId));
        if (task) {
          _editingTaskId = task.id;
          _isDrawerOpen = true;
          _renderStudio(display);
          const inputName = display.querySelector('#sd-input-name');
          const inputLink = display.querySelector('#sd-input-link');
          const inputMins = display.querySelector('#sd-input-mins');
          if (inputName) inputName.value = task.title;
          if (inputLink) inputLink.value = task.link || '';
          if (inputMins) inputMins.value = task.targetMinutes;

          display.querySelectorAll('.sd-cat-btn').forEach(b => {
            const isMatch = b.dataset.cat === task.category;
            b.classList.toggle('active', isMatch);
            if (isMatch) selectedCat = task.category;
          });
          inputName?.focus();
        }
      });

      card.querySelector('.stc-btn-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this practice task?')) {
          _practiceTasks = _practiceTasks.filter(t => String(t.id) !== String(taskId));
          if (_activeTaskId === taskId) {
            _activeTaskId = _practiceTasks.length > 0 ? _practiceTasks[0].id : null;
            if (_timerRunning) {
              clearInterval(_timerInterval);
              _timerRunning = false;
            }
          }
          await _savePracticeTasks();
          _renderStudio(display);
        }
      });
    });

    // 7. Daily Reflection Notes Input
    const notesInput = display.querySelector('#srb-notes-input');
    const saveStatus = display.querySelector('#srb-save-status');
    let notesTimer = null;
    notesInput?.addEventListener('input', () => {
      if (saveStatus) saveStatus.innerHTML = '<span class="srb-pip saving"></span> Saving…';
      clearTimeout(notesTimer);
      notesTimer = setTimeout(async () => {
        _todayNotes = notesInput.value.trim();
        await _recordTodayHistory();
        if (saveStatus) saveStatus.innerHTML = '<span class="srb-pip"></span> Auto-saved to calendar';
      }, 700);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  TIMER ENGINE
  // ═══════════════════════════════════════════════════════════
  function _toggleTimer(display) {
    _timerRunning = !_timerRunning;

    if (_timerRunning) {
      if (_timerInterval) clearInterval(_timerInterval);
      _timerInterval = setInterval(async () => {
        const activeTask = _getActiveTask();
        if (!activeTask) {
          clearInterval(_timerInterval);
          _timerRunning = false;
          _renderStudio(display);
          return;
        }

        if (activeTask.remainingSeconds > 0) {
          activeTask.remainingSeconds--;
          _updateLiveDisplays(display);
          if (activeTask.remainingSeconds % 5 === 0) {
            await _savePracticeTasks();
          }
        } else {
          activeTask.remainingSeconds = 0;
          activeTask.completed = true;
          clearInterval(_timerInterval);
          _timerRunning = false;
          _playCompletionChime();
          _fireConfetti(display);
          await _savePracticeTasks();
          _renderStudio(display);
          _showCelebrationToast(display, activeTask.title);
        }
      }, 1000);
    } else {
      clearInterval(_timerInterval);
      _savePracticeTasks();
    }

    _renderStudio(display);
  }

  function _updateLiveDisplays(display) {
    const activeTask = _getActiveTask();
    const circumference = 439.82;

    const displaySecs = activeTask ? activeTask.remainingSeconds : 0;
    const targetSecs = activeTask ? (activeTask.targetMinutes * 60) : 1;
    const pct = targetSecs > 0 ? Math.min(100, Math.round(((targetSecs - displaySecs) / targetSecs) * 100)) : 0;

    const digitsEl = display.querySelector('#frc-digits');
    const ringBar = display.querySelector('#focus-ring-bar');
    const pctEl = display.querySelector('#frc-pct');
    const remTimeEl = display.querySelector('#hai-rem-time');

    if (digitsEl) digitsEl.textContent = _formatDigits(displaySecs);
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (ringBar) {
      const offset = circumference - (circumference * (pct / 100));
      ringBar.style.strokeDashoffset = offset;
    }
    if (remTimeEl && activeTask) {
      remTimeEl.textContent = _formatHMS(activeTask.remainingSeconds);
    }

    // Update overall metrics
    const stats = _calcDashboardStats();
    const doneVal = display.querySelector('#ssh-val-done');
    const pctVal = display.querySelector('#ssh-val-pct');
    const overallFill = display.querySelector('#studio-overall-fill');

    if (doneVal) doneVal.textContent = _formatHMS(stats.doneSecs);
    if (pctVal) pctVal.textContent = `${stats.pct}%`;
    if (overallFill) overallFill.style.width = `${stats.pct}%`;
  }

  async function _reduceTimeForActiveTask(seconds, display) {
    const task = _getActiveTask();
    if (!task) return;
    task.remainingSeconds = Math.max(0, task.remainingSeconds - seconds);
    if (task.remainingSeconds <= 0) {
      task.remainingSeconds = 0;
      task.completed = true;
      _playCompletionChime();
      _fireConfetti(display);
      _showCelebrationToast(display, task.title);
    }
    await _savePracticeTasks();
  }

  async function _addTimeForActiveTask(seconds) {
    const task = _getActiveTask();
    if (!task) return;
    task.remainingSeconds += seconds;
    task.completed = false;
    await _savePracticeTasks();
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════
  async function init() {
    const display = document.getElementById('widget-display');
    if (!display) return;
    await _loadData();
    _renderStudio(display);
  }

  return { init };
})();
