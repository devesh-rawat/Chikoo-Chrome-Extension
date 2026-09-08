/**
 * calendar.js — Interactive Study & Holiday Calendar (Chikoo)
 *
 * Professional, clean design without emojis:
 *  - High-contrast geometric indicator pips (gold for holidays, emerald for sessions)
 *  - Interactive Month view with fast month/year jumper dropdown
 *  - 2026 Official Holiday Schedule with clear typography & category tags
 *  - Rich interactive hover & click-to-hold card with outside-click dismissal
 *  - Real-time synchronization with Daily Practice Studio
 */

const CalendarComponent = (() => {
  const STORAGE_KEY = 'chikoo_practice_history';

  let _container = null;
  let _viewYear = new Date().getFullYear();
  let _viewMonth = new Date().getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  let _practiceHistory = {};
  let _tooltipEl = null;
  let _pinnedDate = null;
  let _pinnedCell = null;
  let _isMonthPickerOpen = false;

  // ═══════════════════════════════════════════════════════════
  //  HOLIDAYS DATABASE (National, Gazetted, Festivals)
  // ═══════════════════════════════════════════════════════════
  const HOLIDAYS_BY_YEAR = {
    2025: {
      '2025-01-01': { name: "New Year's Day", type: 'Celebration' },
      '2025-01-14': { name: 'Makar Sankranti / Pongal', type: 'Festival' },
      '2025-01-26': { name: 'Republic Day', type: 'Gazetted Holiday' },
      '2025-02-26': { name: 'Maha Shivratri', type: 'Gazetted Holiday' },
      '2025-03-14': { name: 'Holi', type: 'Gazetted Holiday' },
      '2025-03-31': { name: 'Eid ul-Fitr', type: 'Gazetted Holiday' },
      '2025-04-10': { name: 'Mahavir Jayanti', type: 'Gazetted Holiday' },
      '2025-04-14': { name: 'Dr. Ambedkar Jayanti', type: 'Public Holiday' },
      '2025-04-18': { name: 'Good Friday', type: 'Gazetted Holiday' },
      '2025-05-01': { name: 'International Labour Day', type: 'Public Holiday' },
      '2025-05-12': { name: 'Buddha Purnima', type: 'Gazetted Holiday' },
      '2025-06-07': { name: 'Eid al-Adha (Bakrid)', type: 'Gazetted Holiday' },
      '2025-07-06': { name: 'Muharram', type: 'Gazetted Holiday' },
      '2025-08-15': { name: 'Independence Day', type: 'Gazetted Holiday' },
      '2025-08-16': { name: 'Janmashtami', type: 'Festival' },
      '2025-08-27': { name: 'Ganesh Chaturthi', type: 'Festival' },
      '2025-09-05': { name: 'Milad un-Nabi', type: 'Gazetted Holiday' },
      '2025-10-02': { name: 'Mahatma Gandhi Jayanti', type: 'Gazetted Holiday' },
      '2025-10-02': { name: 'Dussehra (Vijayadashami)', type: 'Gazetted Holiday' },
      '2025-10-20': { name: 'Diwali (Deepavali)', type: 'Gazetted Holiday' },
      '2025-10-22': { name: 'Bhai Dooj', type: 'Festival' },
      '2025-10-27': { name: 'Chhath Puja', type: 'Festival' },
      '2025-11-05': { name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' },
      '2025-12-25': { name: 'Christmas Day', type: 'Gazetted Holiday' }
    },
    2026: {
      '2026-01-26': { name: 'गणतंत्र दिवस (Republic Day)', type: 'National Holiday' },
      '2026-02-15': { name: 'महाशिवरात्रि (Maha Shivratri)', type: 'Gazetted Holiday' },
      '2026-03-03': { name: 'होलिका दहन (Holika Dahan)', type: 'Festival' },
      '2026-03-04': { name: 'होली (Holi)', type: 'Gazetted Holiday' },
      '2026-03-19': { name: 'चेटीचंद (Cheti Chand)', type: 'Festival' },
      '2026-03-21': { name: 'ईद-उल-फितर (Eid-ul-Fitr)', type: 'Gazetted Holiday' },
      '2026-03-26': { name: 'राम नवमी (Ram Navami)', type: 'Gazetted Holiday' },
      '2026-03-31': { name: 'महावीर जयंती (Mahavir Jayanti)', type: 'Gazetted Holiday' },
      '2026-04-03': { name: 'गुड फ्राइडे (Good Friday)', type: 'Gazetted Holiday' },
      '2026-04-14': { name: 'डॉ. भीमराव अंबेडकर जयंती (Dr. Ambedkar Jayanti)', type: 'Gazetted Holiday' },
      '2026-05-01': { name: 'बुद्ध पूर्णिमा (Buddha Purnima)', type: 'Gazetted Holiday' },
      '2026-05-27': { name: 'ईद-उल-जुहा / बकरीद (Eid-ul-Adha)', type: 'Gazetted Holiday' },
      '2026-06-26': { name: 'मोहर्रम (Muharram)', type: 'Gazetted Holiday' },
      '2026-07-16': { name: 'हरेला (Harela)', type: 'Festival / Public Holiday' },
      '2026-08-15': { name: 'स्वतंत्रता दिवस (Independence Day)', type: 'National Holiday' },
      '2026-08-26': { name: 'ईद-ए-मिलाद / मिलाद-उन-नबी (Milad-un-Nabi)', type: 'Gazetted Holiday' },
      '2026-08-28': { name: 'रक्षा बंधन (Raksha Bandhan)', type: 'Festival' },
      '2026-09-04': { name: 'जन्माष्टमी (Janmashtami)', type: 'Gazetted Holiday' },
      '2026-09-17': { name: 'विश्वकर्मा पूजा (Vishwakarma Puja)', type: 'Festival' },
      '2026-10-02': { name: 'महात्मा गांधी जयंती (Mahatma Gandhi Jayanti)', type: 'National Holiday' },
      '2026-10-20': { name: 'दशहरा (विजयदशमी) (Dussehra)', type: 'Gazetted Holiday' },
      '2026-10-26': { name: 'महर्षि वाल्मीकि जयंती (Maharishi Valmiki Jayanti)', type: 'Gazetted Holiday' },
      '2026-11-08': { name: 'दीपावली (Diwali / Deepawali)', type: 'Gazetted Holiday' },
      '2026-11-10': { name: 'दीपावली (गोवर्धन पूजा) (Govardhan Puja)', type: 'Festival' },
      '2026-11-20': { name: 'ईगास-बग्वाल (Igas Bagwal)', type: 'State Festival / Holiday' },
      '2026-11-24': { name: 'गुरु नानक जयंती / गुरु तेगबहादुर शहीद दिवस', type: 'Gazetted Holiday' },
      '2026-12-25': { name: 'क्रिसमस दिवस (Christmas Day)', type: 'Gazetted Holiday' }
    },
    2027: {
      '2027-01-01': { name: "New Year's Day", type: 'Celebration' },
      '2027-01-14': { name: 'Makar Sankranti / Pongal', type: 'Festival' },
      '2027-01-26': { name: 'Republic Day', type: 'Gazetted Holiday' },
      '2027-03-06': { name: 'Maha Shivratri', type: 'Gazetted Holiday' },
      '2027-03-10': { name: 'Eid ul-Fitr', type: 'Gazetted Holiday' },
      '2027-03-23': { name: 'Holi', type: 'Gazetted Holiday' },
      '2027-03-26': { name: 'Good Friday', type: 'Gazetted Holiday' },
      '2027-04-14': { name: 'Dr. Ambedkar Jayanti', type: 'Public Holiday' },
      '2027-04-19': { name: 'Mahavir Jayanti', type: 'Gazetted Holiday' },
      '2027-05-01': { name: 'International Labour Day', type: 'Public Holiday' },
      '2027-05-17': { name: 'Eid al-Adha (Bakrid)', type: 'Gazetted Holiday' },
      '2027-05-20': { name: 'Buddha Purnima', type: 'Gazetted Holiday' },
      '2027-06-15': { name: 'Muharram', type: 'Gazetted Holiday' },
      '2027-08-15': { name: 'Independence Day', type: 'Gazetted Holiday' },
      '2027-08-17': { name: 'Raksha Bandhan', type: 'Festival' },
      '2027-08-25': { name: 'Janmashtami', type: 'Festival' },
      '2027-09-04': { name: 'Ganesh Chaturthi', type: 'Festival' },
      '2027-09-14': { name: 'Milad un-Nabi', type: 'Gazetted Holiday' },
      '2027-10-02': { name: 'Mahatma Gandhi Jayanti', type: 'Gazetted Holiday' },
      '2027-10-10': { name: 'Dussehra (Vijayadashami)', type: 'Gazetted Holiday' },
      '2027-10-29': { name: 'Diwali (Deepavali)', type: 'Gazetted Holiday' },
      '2027-11-14': { name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' },
      '2027-12-25': { name: 'Christmas Day', type: 'Gazetted Holiday' }
    }
  };

  // Fixed recurring annual holidays
  const FIXED_HOLIDAYS = {
    '01-01': { name: "New Year's Day", type: 'Celebration' },
    '01-26': { name: 'गणतंत्र दिवस (Republic Day)', type: 'National Holiday' },
    '04-14': { name: 'डॉ. भीमराव अंबेडकर जयंती', type: 'Public Holiday' },
    '08-15': { name: 'स्वतंत्रता दिवस (Independence Day)', type: 'National Holiday' },
    '10-02': { name: 'महात्मा गांधी जयंती (Mahatma Gandhi Jayanti)', type: 'National Holiday' },
    '12-25': { name: 'क्रिसमस दिवस (Christmas Day)', type: 'Gazetted Holiday' }
  };

  function _getHoliday(dateStr) {
    const yr = dateStr.slice(0, 4);
    if (HOLIDAYS_BY_YEAR[yr] && HOLIDAYS_BY_YEAR[yr][dateStr]) {
      return HOLIDAYS_BY_YEAR[yr][dateStr];
    }
    const mmdd = dateStr.slice(5);
    return FIXED_HOLIDAYS[mmdd] || null;
  }

  function _formatDateKey(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  function _getTodayKey() {
    const d = new Date();
    return _formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════
  async function _loadPracticeHistory() {
    if (typeof Storage !== 'undefined') {
      const data = await Storage.get([STORAGE_KEY]);
      _practiceHistory = data[STORAGE_KEY] || {};
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TOOLTIP & POPUP INSPECTION
  // ═══════════════════════════════════════════════════════════
  function _createTooltipElement() {
    if (_tooltipEl && document.body.contains(_tooltipEl)) return;
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'calendar-hover-tooltip hidden';
    _tooltipEl.id = 'calendar-hover-tooltip';
    document.body.appendChild(_tooltipEl);
  }

  function _formatDuration(minutes) {
    const m = Math.max(0, Math.round(minutes));
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) return `${h}h ${remM > 0 ? remM + 'm' : ''}`;
    return `${remM}m`;
  }

  function _showTooltip(targetCell, dateStr, isPinned = false) {
    if (!_tooltipEl) _createTooltipElement();

    if (isPinned) {
      _pinnedDate = dateStr;
      _pinnedCell = targetCell;
      if (_container) {
        _container.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('is-pinned-cell'));
      }
      targetCell.classList.add('is-pinned-cell');
      _tooltipEl.classList.add('is-pinned');
    } else {
      _tooltipEl.classList.remove('is-pinned');
    }

    const holiday = _getHoliday(dateStr);
    const session = _practiceHistory[dateStr];

    const [yr, mo, da] = dateStr.split('-').map(Number);
    const dateObj = new Date(yr, mo - 1, da);
    const dateTitle = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const isToday = dateStr === _getTodayKey();

    let holidayHTML = '';
    if (holiday) {
      holidayHTML = `
        <div class="cht-holiday-banner">
          <div class="cht-h-type-badge">${_escape(holiday.type)}</div>
          <div class="cht-h-name">${_escape(holiday.name)}</div>
        </div>
      `;
    }

    let practiceHTML = '';
    if (session && (session.practicedMinutes > 0 || (session.tasks && session.tasks.length > 0))) {
      const goalMin = session.totalGoalMinutes || 0;
      const doneMin = session.practicedMinutes || 0;
      const pct = session.pct !== undefined ? session.pct : (goalMin > 0 ? Math.min(100, Math.round((doneMin / goalMin) * 100)) : 0);
      const completedCount = session.completedCount || 0;
      const totalCount = session.totalCount || (session.tasks ? session.tasks.length : 0);

      const tasksList = (session.tasks || []).map(t => `
        <div class="cht-task-item ${t.completed ? 'completed' : ''}">
          <span class="cht-t-status-tag ${t.completed ? 'done' : 'pending'}">${t.completed ? 'DONE' : 'PENDING'}</span>
          <span class="cht-t-name">${_escape(t.title)}</span>
          <span class="cht-t-time">${t.practicedMinutes || 0}m / ${t.targetMinutes || 0}m</span>
        </div>
      `).join('');

      practiceHTML = `
        <div class="cht-practice-card">
          <div class="cht-p-header">
            <span class="cht-p-title">Study Session</span>
            <span class="cht-p-pct">${pct}% Goal</span>
          </div>

          <div class="cht-p-progress-bar">
            <div class="cht-p-progress-fill" style="width: ${pct}%;"></div>
          </div>

          <div class="cht-p-stats-grid">
            <div class="cht-stat-box">
              <span class="csb-num">${_formatDuration(doneMin)}</span>
              <span class="csb-lbl">Practiced</span>
            </div>
            <div class="cht-stat-box">
              <span class="csb-num">${_formatDuration(goalMin)}</span>
              <span class="csb-lbl">Target Goal</span>
            </div>
            <div class="cht-stat-box">
              <span class="csb-num">${completedCount}/${totalCount}</span>
              <span class="csb-lbl">Completed</span>
            </div>
          </div>

          ${tasksList ? `
            <div class="cht-p-tasks-wrap">
              <span class="cht-p-tasks-label">Session Tasks</span>
              <div class="cht-p-tasks-list">${tasksList}</div>
            </div>
          ` : ''}

          ${session.notes ? `
            <div class="cht-p-notes-wrap">
              <span class="cht-p-notes-label">Daily Reflection</span>
              <div class="cht-p-notes-text">${_escape(session.notes)}</div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      practiceHTML = `
        <div class="cht-practice-empty">
          <div class="cht-pe-info">
            <span class="cht-pe-title">No Session Logged</span>
            <span class="cht-pe-desc">${isToday ? 'Focus on practice tasks today to record study metrics.' : 'Rest day or off-schedule.'}</span>
          </div>
        </div>
      `;
    }

    _tooltipEl.innerHTML = `
      <div class="cht-header">
        <div class="cht-header-left">
          <span class="cht-date">${dateTitle}</span>
          ${isToday ? '<span class="cht-today-chip">Today</span>' : ''}
        </div>
        <div class="cht-header-actions">
          ${isPinned ? '<span class="cht-pin-badge">Locked</span>' : ''}
          <button class="cht-close-btn" id="cht-close-btn" title="Close popup">×</button>
        </div>
      </div>
      ${holidayHTML}
      ${practiceHTML}
    `;

    const closeBtn = _tooltipEl.querySelector('#cht-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _unpinAndHide();
      });
    }

    _tooltipEl.classList.remove('hidden');

    // Position tooltip near targetCell
    const rect = targetCell.getBoundingClientRect();
    const tooltipWidth = 280;
    const padding = 12;

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) left = padding;

    const estimatedHeight = 220;
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = rect.top - estimatedHeight - 8;
    }

    _tooltipEl.style.top = `${Math.max(padding, top)}px`;
    _tooltipEl.style.left = `${left}px`;
    _tooltipEl.style.width = `${tooltipWidth}px`;
  }

  function _hideTooltip() {
    if (_tooltipEl) {
      _tooltipEl.classList.add('hidden');
    }
  }

  function _unpinAndHide() {
    _pinnedDate = null;
    if (_pinnedCell) {
      _pinnedCell.classList.remove('is-pinned-cell');
      _pinnedCell = null;
    }
    if (_container) {
      _container.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('is-pinned-cell'));
    }
    _hideTooltip();
  }

  function _escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  //  CALENDAR RENDERER
  // ═══════════════════════════════════════════════════════════
  function _calcMonthlySummary() {
    let totalPracticedMinutes = 0;
    let practiceDaysCount = 0;
    let holidaysCount = 0;

    const daysInMonth = new Date(_viewYear, _viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = _formatDateKey(_viewYear, _viewMonth, d);
      if (_getHoliday(dateKey)) {
        holidaysCount++;
      }
      const session = _practiceHistory[dateKey];
      if (session && (session.practicedMinutes > 0 || session.completedCount > 0)) {
        practiceDaysCount++;
        totalPracticedMinutes += (session.practicedMinutes || 0);
      }
    }

    return {
      holidaysCount,
      practiceDaysCount,
      totalHours: (totalPracticedMinutes / 60).toFixed(1)
    };
  }

  function _renderCalendar() {
    if (!_container) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const todayKey = _getTodayKey();
    const firstDayIndex = new Date(_viewYear, _viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInCurrentMonth = new Date(_viewYear, _viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(_viewYear, _viewMonth, 0).getDate();

    const summary = _calcMonthlySummary();

    let gridCellsHTML = '';

    // 1. Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMo = _viewMonth === 0 ? 11 : _viewMonth - 1;
      const prevYr = _viewMonth === 0 ? _viewYear - 1 : _viewYear;
      const dateKey = _formatDateKey(prevYr, prevMo, d);
      const holiday = _getHoliday(dateKey);
      const session = _practiceHistory[dateKey];
      const hasPractice = session && session.practicedMinutes > 0;

      gridCellsHTML += `
        <div class="calendar-day-cell other-month" data-date="${dateKey}">
          <span class="cdc-number">${d}</span>
          <div class="cdc-indicators">
            ${holiday ? '<span class="cdc-dot dot-holiday"></span>' : ''}
            ${hasPractice ? '<span class="cdc-dot dot-practice"></span>' : ''}
          </div>
        </div>
      `;
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateKey = _formatDateKey(_viewYear, _viewMonth, d);
      const isToday = dateKey === todayKey;
      const isPinned = dateKey === _pinnedDate;
      const holiday = _getHoliday(dateKey);
      const session = _practiceHistory[dateKey];
      const hasPractice = session && (session.practicedMinutes > 0 || session.completedCount > 0);

      gridCellsHTML += `
        <div class="calendar-day-cell ${isToday ? 'is-today' : ''} ${isPinned ? 'is-pinned-cell' : ''} ${holiday ? 'has-holiday' : ''} ${hasPractice ? 'has-practice' : ''}" data-date="${dateKey}">
          <span class="cdc-number">${d}</span>
          <div class="cdc-indicators">
            ${holiday ? '<span class="cdc-dot dot-holiday"></span>' : ''}
            ${hasPractice ? '<span class="cdc-dot dot-practice"></span>' : ''}
          </div>
        </div>
      `;
    }

    // 3. Next month leading days to complete grid
    const totalFilled = startOffset + daysInCurrentMonth;
    const totalCells = totalFilled > 35 ? 42 : 35;
    const nextDaysCount = totalCells - totalFilled;

    for (let d = 1; d <= nextDaysCount; d++) {
      const nextMo = _viewMonth === 11 ? 0 : _viewMonth + 1;
      const nextYr = _viewMonth === 11 ? _viewYear + 1 : _viewYear;
      const dateKey = _formatDateKey(nextYr, nextMo, d);
      const holiday = _getHoliday(dateKey);
      const session = _practiceHistory[dateKey];
      const hasPractice = session && session.practicedMinutes > 0;

      gridCellsHTML += `
        <div class="calendar-day-cell other-month" data-date="${dateKey}">
          <span class="cdc-number">${d}</span>
          <div class="cdc-indicators">
            ${holiday ? '<span class="cdc-dot dot-holiday"></span>' : ''}
            ${hasPractice ? '<span class="cdc-dot dot-practice"></span>' : ''}
          </div>
        </div>
      `;
    }

    _container.innerHTML = `
      <div class="calendar-panel">
        <!-- Calendar Header -->
        <div class="calendar-header">
          <div class="cal-title-row">
            <div class="cal-title-wrap" id="cal-title-trigger" title="Jump to month">
              <span class="cal-main-title">${monthNames[_viewMonth]}</span>
              <span class="cal-year-badge">${_viewYear}</span>
              <span class="cal-dropdown-arrow">▾</span>
            </div>
            <div class="cal-nav-buttons">
              <button class="cal-nav-btn" id="cal-btn-prev" title="Previous Month">‹</button>
              <button class="cal-nav-btn today-btn" id="cal-btn-today" title="Jump to Today">Today</button>
              <button class="cal-nav-btn" id="cal-btn-next" title="Next Month">›</button>
            </div>
          </div>

          <!-- Quick Month Dropdown Picker (Collapsible) -->
          <div class="cal-month-popover ${_isMonthPickerOpen ? '' : 'hidden'}" id="cal-month-popover">
            <div class="cmp-year-bar">
              <button type="button" class="cmp-year-nav" id="cmp-year-prev">‹</button>
              <span class="cmp-year-display">${_viewYear}</span>
              <button type="button" class="cmp-year-nav" id="cmp-year-next">›</button>
            </div>
            <div class="cmp-months-grid">
              ${monthShort.map((m, idx) => `
                <button type="button" class="cmp-month-btn ${idx === _viewMonth ? 'active' : ''}" data-month="${idx}">${m}</button>
              `).join('')}
            </div>
          </div>

          <!-- Quick Month Stats Banner -->
          <div class="cal-summary-strip">
            <div class="cal-stat-tile">
              <span class="cst-value">${summary.practiceDaysCount}</span>
              <span class="cst-label">Active Days</span>
            </div>
            <div class="cal-stat-tile">
              <span class="cst-value">${summary.totalHours}h</span>
              <span class="cst-label">Study Time</span>
            </div>
            <div class="cal-stat-tile">
              <span class="cst-value">${summary.holidaysCount}</span>
              <span class="cst-label">Holidays</span>
            </div>
          </div>
        </div>

        <!-- Weekday Headers -->
        <div class="calendar-weekdays-row">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span class="weekend">Sa</span>
          <span class="weekend">Su</span>
        </div>

        <!-- Calendar Month Grid -->
        <div class="calendar-days-grid" id="cal-grid">
          ${gridCellsHTML}
        </div>

        <!-- Minimalist Calendar Legend -->
        <div class="calendar-footer-legend">
          <div class="cal-legend-item">
            <span class="legend-dot holiday-dot"></span>
            <span>Holiday</span>
          </div>
          <div class="cal-legend-item">
            <span class="legend-dot practice-dot"></span>
            <span>Study Session</span>
          </div>
          <div class="cal-legend-item">
            <span class="legend-ring today-ring"></span>
            <span>Today</span>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    // Navigation
    _container.querySelector('#cal-btn-prev')?.addEventListener('click', () => {
      _unpinAndHide();
      _viewMonth--;
      if (_viewMonth < 0) {
        _viewMonth = 11;
        _viewYear--;
      }
      _renderCalendar();
    });

    _container.querySelector('#cal-btn-next')?.addEventListener('click', () => {
      _unpinAndHide();
      _viewMonth++;
      if (_viewMonth > 11) {
        _viewMonth = 0;
        _viewYear++;
      }
      _renderCalendar();
    });

    _container.querySelector('#cal-btn-today')?.addEventListener('click', () => {
      _unpinAndHide();
      const d = new Date();
      _viewYear = d.getFullYear();
      _viewMonth = d.getMonth();
      _renderCalendar();
    });

    // Month Quick-Jump Trigger
    _container.querySelector('#cal-title-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _isMonthPickerOpen = !_isMonthPickerOpen;
      const popover = _container.querySelector('#cal-month-popover');
      if (popover) {
        popover.classList.toggle('hidden', !_isMonthPickerOpen);
      }
    });

    // Year navigation inside popover
    _container.querySelector('#cmp-year-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _viewYear--;
      _renderCalendar();
    });

    _container.querySelector('#cmp-year-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _viewYear++;
      _renderCalendar();
    });

    // Month buttons inside popover
    _container.querySelectorAll('.cmp-month-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _unpinAndHide();
        _viewMonth = parseInt(btn.dataset.month, 10);
        _isMonthPickerOpen = false;
        _renderCalendar();
      });
    });

    // Hover & click interactions for day cells
    const cells = _container.querySelectorAll('.calendar-day-cell');
    cells.forEach(cell => {
      const dateStr = cell.dataset.date;
      if (!dateStr) return;

      cell.addEventListener('mouseenter', () => {
        if (_pinnedDate) return;
        _showTooltip(cell, dateStr, false);
      });

      cell.addEventListener('mouseleave', (e) => {
        if (_pinnedDate) return;
        if (e.relatedTarget && e.relatedTarget.closest('#calendar-hover-tooltip')) return;
        _hideTooltip();
      });

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_pinnedDate === dateStr) {
          _unpinAndHide();
        } else {
          _showTooltip(cell, dateStr, true);
        }
      });
    });

    if (_tooltipEl) {
      _tooltipEl.addEventListener('mouseleave', () => {
        if (_pinnedDate) return;
        _hideTooltip();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════
  async function render(container) {
    _container = container;
    _createTooltipElement();
    await _loadPracticeHistory();
    _renderCalendar();

    // Listen to real-time practice updates from Daily Practice widget
    window.addEventListener('chikoo-practice-updated', async () => {
      await _loadPracticeHistory();
      _renderCalendar();
    });

    // Global click listener to close popups when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.calendar-day-cell') && !e.target.closest('#calendar-hover-tooltip')) {
        _unpinAndHide();
      }
      if (!e.target.closest('#cal-title-trigger') && !e.target.closest('#cal-month-popover')) {
        if (_isMonthPickerOpen) {
          _isMonthPickerOpen = false;
          _container?.querySelector('#cal-month-popover')?.classList.add('hidden');
        }
      }
    });

    // Hide tooltip on window scroll if not locked
    window.addEventListener('scroll', () => {
      if (!_pinnedDate) _hideTooltip();
    }, true);
  }

  return { render };
})();
