/**
 * greeting.js — Dynamic Time Greeting, Multi-lingual Quotes & Sticky Notes Board (Chikoo)
 *
 * Supports Hindi (Jaini font), Sanskrit (Jaini font), English (Henny Penny font), and Mixed quote modes.
 */

const GreetingComponent = (() => {
  const KEY_NAME = 'user_name';
  const KEY_QUOTE_LANG = 'quote_language'; // 'hindi' | 'sanskrit' | 'english' | 'all'

  const QUOTES_HINDI = [
    { text: "कर्म ही पूजा है।", attr: "श्रीमद्भगवद्गीता", lang: "hi" },
    { text: "उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए।", attr: "स्वामी विवेकानंद", lang: "hi" },
    { text: "सफलता का कोई मन्त्र नहीं है, यह केवल परिश्रम का फल है।", attr: "चाणक्य", lang: "hi" },
    { text: "विश्वास वह शक्ति है जिससे उजड़ी हुई दुनिया में भी प्रकाश लाया जा सकता है।", attr: "महात्मा गांधी", lang: "hi" },
    { text: "मन के हारे हार है, मन के जीते जीत।", attr: "कबीरदास", lang: "hi" },
    { text: "परिश्रम ही सफलता की कुंजी है।", attr: "नीति श्लोक", lang: "hi" },
    { text: "सत्य के मार्ग पर चलने वाले को कोई हरा नहीं सकता।", attr: "डॉ. ए.पी.जे. अब्दुल कलाम", lang: "hi" },
    { text: "सपने वो नहीं जो हम सोते हुए देखते हैं, सपने वो हैं जो हमें सोने नहीं देते।", attr: "डॉ. ए.पी.जे. अब्दुल कलाम", lang: "hi" },
    { text: "ज्ञान ही परम बल है, और अभ्यास उसकी शक्ति।", attr: "सुभाषित", lang: "hi" },
    { text: "महानता कभी न गिरने में नहीं, बल्कि हर बार गिरकर उठ जाने में है।", attr: "स्वामी विवेकानंद", lang: "hi" }
  ];

  const QUOTES_SANSKRIT = [
    { text: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः। न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥", attr: "हितोपदेश", lang: "sa" },
    { text: "विद्या ददाति विनयं विनयाद्याति पात्रताम्। पात्रत्वाद्धनमाप्नोति धनाद्धर्मं ततः सुखम्॥", attr: "हितोपदेश", lang: "sa" },
    { text: "सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः।", attr: "मुण्डकोपनिषद्", lang: "sa" },
    { text: "वसुधैव कुटुम्बकम्।", attr: "महोपनिषद्", lang: "sa" },
    { text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।", attr: "श्रीमद्भगवद्गीता", lang: "sa" },
    { text: "योगः कर्मसु कौशलम्।", attr: "श्रीमद्भगवद्गीता", lang: "sa" },
    { text: "न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।", attr: "श्रीमद्भगवद्गीता", lang: "sa" },
    { text: "सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।", attr: "बृहदारण्यकोपनिषद्", lang: "sa" },
    { text: "विद्वान् सर्वत्र पूज्यते।", attr: "चाणक्य नीति", lang: "sa" },
    { text: "उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीः।", attr: "पञ्चतन्त्रम्", lang: "sa" }
  ];

  const QUOTES_ENGLISH = [
    { text: "The secret of getting ahead is getting started.", attr: "Mark Twain", lang: "en" },
    { text: "It always seems impossible until it's done.", attr: "Nelson Mandela", lang: "en" },
    { text: "Don't watch the clock; do what it does. Keep going.", attr: "Sam Levenson", lang: "en" },
    { text: "Act as if what you do makes a difference. It does.", attr: "William James", lang: "en" },
    { text: "Believe you can and you're halfway there.", attr: "Theodore Roosevelt", lang: "en" },
    { text: "Start where you are. Use what you have. Do what you can.", attr: "Arthur Ashe", lang: "en" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue.", attr: "Winston Churchill", lang: "en" },
    { text: "Keep your face always toward the sunshine — shadows will fall behind you.", attr: "Walt Whitman", lang: "en" }
  ];

  let _currentLang = 'hindi';
  let _currentQuoteIndex = 0;

  function _getTimeGreeting() {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'good morning ☀️,';
    if (hrs < 18) return 'good afternoon 🌤,';
    return 'good evening 🌙,';
  }

  function _getQuotesList(lang) {
    switch (lang) {
      case 'sanskrit':
        return QUOTES_SANSKRIT;
      case 'english':
        return QUOTES_ENGLISH;
      case 'all':
        return [...QUOTES_HINDI, ...QUOTES_SANSKRIT, ...QUOTES_ENGLISH];
      case 'hindi':
      default:
        return QUOTES_HINDI;
    }
  }

  function _getQuote(lang, indexOffset = 0) {
    const list = _getQuotesList(lang);
    const dayHash = Math.floor(Date.now() / 86400000);
    const idx = (dayHash + _currentQuoteIndex + indexOffset) % list.length;
    return list[idx];
  }

  async function _loadSettings() {
    const data = await Storage.get([KEY_NAME, KEY_QUOTE_LANG]);
    _currentLang = data[KEY_QUOTE_LANG] ?? 'hindi';
    return data[KEY_NAME] ?? null;
  }

  async function render(container) {
    const name = await _loadSettings();
    const displayName = (name && name.trim()) ? name.trim() : 'creator';
    const quote = _getQuote(_currentLang);
    const greetingText = _getTimeGreeting();

    const isDevanagari = (quote.lang === 'hi' || quote.lang === 'sa');
    const quoteFontClass = isDevanagari ? 'font-hindi' : 'font-english';

    container.innerHTML = `
      <div class="section-greeting">

        <div class="greeting-top">
          <span class="greeting-hello">${greetingText}</span>
          <div class="greeting-username-wrap" id="greeting-name-wrap">
            <span class="greeting-username" id="greeting-username">${displayName}</span>
            <span class="greeting-edit-hint">✎ edit</span>
          </div>
        </div>

        <div class="greeting-board-block">
          <div class="greeting-board-header">
            <span class="greeting-board-label">Sticky Notes Board</span>
            <span class="greeting-board-hint">Drag & drop notes or draft below</span>
          </div>
          <div id="sticky-notes-board" class="sticky-notes-board"></div>
        </div>

        <div class="greeting-quote-block">
          <div class="quote-header">
            <span class="quote-header-title">Thought for Today</span>
            <div class="quote-lang-selector" id="quote-lang-selector">
              <button class="quote-lang-btn ${_currentLang === 'hindi' ? 'active' : ''}" data-lang="hindi" title="Hindi Quotes">हिंदी</button>
              <button class="quote-lang-btn ${_currentLang === 'sanskrit' ? 'active' : ''}" data-lang="sanskrit" title="Sanskrit Subhashitani">संस्कृत</button>
              <button class="quote-lang-btn ${_currentLang === 'english' ? 'active' : ''}" data-lang="english" title="English Quotes">English</button>
              <button class="quote-lang-btn ${_currentLang === 'all' ? 'active' : ''}" data-lang="all" title="All Quotes">All</button>
            </div>
          </div>
          <p class="greeting-quote ${quoteFontClass}" id="greeting-quote-text">"${quote.text}"</p>
          <div class="quote-footer">
            <span class="greeting-quote-attr ${quoteFontClass}" id="greeting-quote-attr">— ${quote.attr}</span>
            <button class="quote-refresh-btn" id="btn-refresh-quote" title="Next Quote">Next</button>
          </div>
        </div>

      </div>
    `;

    // Event listeners
    const nameSpan = document.getElementById('greeting-username');
    nameSpan?.addEventListener('click', () => _startNameEdit(container, nameSpan));

    // Quote language buttons
    container.querySelectorAll('.quote-lang-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lang = btn.dataset.lang;
        _currentLang = lang;
        _currentQuoteIndex = 0;
        await Storage.set({ [KEY_QUOTE_LANG]: lang });
        await render(container);
      });
    });

    // Refresh quote button
    document.getElementById('btn-refresh-quote')?.addEventListener('click', () => {
      _currentQuoteIndex++;
      const nextQuote = _getQuote(_currentLang);
      const quoteEl = document.getElementById('greeting-quote-text');
      const attrEl = document.getElementById('greeting-quote-attr');
      if (quoteEl && attrEl) {
        const isDev = (nextQuote.lang === 'hi' || nextQuote.lang === 'sa');
        quoteEl.className = `greeting-quote ${isDev ? 'font-hindi' : 'font-english'}`;
        attrEl.className = `greeting-quote-attr ${isDev ? 'font-hindi' : 'font-english'}`;
        quoteEl.textContent = `"${nextQuote.text}"`;
        attrEl.textContent = `— ${nextQuote.attr}`;
      }
    });

    if (typeof StickyNotesComponent !== 'undefined') {
      StickyNotesComponent.initBoard();
    }
  }

  function _startNameEdit(container, spanEl) {
    const wrap = document.getElementById('greeting-name-wrap');
    if (!wrap) return;

    const currentValue = spanEl.textContent === 'creator' ? '' : spanEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'greeting-name-input';
    input.value = currentValue;
    input.placeholder = 'your name';
    input.maxLength = 24;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    wrap.innerHTML = '';
    wrap.appendChild(input);
    input.focus();
    input.select();

    let committed = false;
    async function commit() {
      if (committed) return;
      committed = true;
      await Storage.set({ [KEY_NAME]: input.value.trim() || null });
      await render(container);
    }

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') { e.preventDefault(); await commit(); }
      if (e.key === 'Escape') { committed = true; await render(container); }
    });
    input.addEventListener('blur', commit);
  }

  return { render };
})();
