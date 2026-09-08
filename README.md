# ✦ Custom New Tab — Chrome Extension

A beautiful, feature-packed Chrome New Tab replacement with **two distinct modes** — a zen **Minimalistic** mode for focus and a powerful **Work** mode for productivity — each with full **light & dark theme** support.

<p align="center">
  <img src="icons/icon128.png" alt="Custom New Tab Icon" width="96" />
</p>

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| 🎨 **Dual Layouts** | Switch between Minimalistic (zen) and Work (productivity) modes |
| 🌗 **Light & Dark Themes** | 4 hand-crafted theme variants with custom background support |
| 🎯 **Daily Practice** | Task timers, instant deductions (-15m/-30m), and per-date session history |
| 📅 **Study & Holiday Calendar** | Interactive calendar showing public/cultural holidays and daily practice stats on hover |
| 🌤 **Live Weather** | Real-time weather using geolocation via Open-Meteo |
| ✏️ **Scribble Hub** | Text notepad + HTML5 canvas whiteboard with auto-save |
| 📝 **Sticky Notes** | Drag-and-drop sticky notes with a masonry board |
| 🕐 **Live Clock** | Beautiful clock display with bottom bar companion |
| 🔗 **Quick Links** | Collapsible sidebar with your most-used websites |
| 🔖 **Bookmarks Hub** | Native bookmarks manager with instant search, 1-click open tab saving & quick-add |
| 🔍 **Web Search** | Integrated Google search bar in both modes |

---

## 🖥 Modes

### 🌿 Minimalistic Mode
A clean, distraction-free interface designed for focus:
- **Live clock** with elegant typography
- **Personalized greeting** — click your name to edit it inline
- **Sticky notes** — create, drag & drop onto a masonry board
- **Daily motivational quotes** that rotate automatically
- **Collapsible quick-links sidebar** for your favorite sites
- **Integrated search bar**

### 💼 Work Mode
A three-column productivity dashboard:
- **Left** — Bookmarks Hub (view, search, add custom bookmarks, and save open tabs in 1 click; bookmarks persist until deleted)
- **Center** — Search bar + tabbed widget area (**Daily Practice** · Weather · Scribble)
- **Right** — Interactive Study & Holiday Calendar with hover data for daily practice sessions

---

## 📅 Study & Holiday Calendar

An interactive calendar designed for students and professionals to track learning consistency alongside public holidays:

- 🗓 **Interactive Month Navigation** — Quick jump to previous/next month or back to "Today"
- 🎉 **Public & Cultural Holidays** — Comprehensive gazetted and cultural holidays (Republic Day, Holi, Eid, Independence Day, Diwali, Christmas, and more)
- 🎯 **Daily Practice Session Tracking** — Days with practice sessions are marked with active indicators
- 🔍 **Rich Hover Tooltips** — Hover over any date to inspect that day's:
  - Practiced duration vs target goal (e.g. `1h 30m / 2h 00m`)
  - Session completion percentage progress bar
  - Breakdown of individual practice tasks and completion statuses
  - Holiday titles and holiday categories
- 📊 **Monthly Activity Strip** — See active practice days, total study hours, and monthly holidays at a glance
- ⚡ **Real-Time Live Sync** — Instantly updates as you start/stop timers or log practice sessions

---

## 🎯 Daily Practice & Study Task Management

Replace your old Pomodoro timer with a full **interactive task tracker** built for students and coders:

- **Add unlimited tasks** — DSA, Aptitude, System Design, SQL, Core CS, or anything you practice daily
- **Set target time** per task (15 mins → 2 hrs), with quick-select chips
- **Attach resource links** — LeetCode, IndiaBIX, MDN, or any website; opens in a new tab with one click
- **Choose a category icon** — 💻 🧠 🌐 ⚙️ 📚 🎯
- **Live countdown timer** — Start/Pause focus sessions with real-time digit display
- **Instant time deductions** — `-15m`, `-30m` buttons to mark time practiced without running the timer
- **Progress bars** — per-task completion fill and overall daily progress indicator
- **Stats dashboard** — see Total Goal / Remaining / Practiced / Overall % at a glance
- **Reset Day** — clear all timers back to full duration for a fresh day
- **Edit & Delete** — update task name, time, link, or icon anytime
- **Persistent storage** — all tasks, progress, and timers saved in `chrome.storage.local` until you delete them

**Highlights:**
- 🔴 Timer glows when a focus session is actively running
- ✅ Completed tasks turn green automatically
- 🗑 Delete tasks permanently when no longer needed



---

## 🚀 Installation

### Method 1: Load from Source (Recommended)

1. **Clone this repository:**
   ```bash
   git clone https://github.com/PranjalArya1908/extension.git
   ```

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** — toggle the switch in the top-right corner.

4. **Click "Load unpacked"** in the top-left corner.

5. **Select the cloned `extension` folder** (the root folder containing `manifest.json`).

6. **Open a new tab** — enjoy your new custom workspace! 🎉

### Method 2: Download ZIP

1. Click the green **Code** button on GitHub → **Download ZIP**
2. Extract the ZIP to a folder on your computer
3. Follow steps 2–6 above, selecting the extracted folder

---

## ⚙️ Configuration

###  Custom Background Images
Drop your own backgrounds into the appropriate folder:

```
assets/backgrounds/
├── minimalistic/
│   ├── light/bg.jpg    ← Minimalistic Light background
│   └── dark/bg.jpg     ← Minimalistic Dark background
└── work/
    ├── light/bg.jpg    ← Work Light background
    └── dark/bg.jpg     ← Work Dark background
```

**Tips:**
- Recommended resolution: **2560×1440** or higher for retina screens
- Supported formats: JPG (photos), PNG (illustrations)
- Leave a folder empty to fall back to the solid `--color-bg` defined in the theme CSS

### 🎨 Theme Customization
Each theme is defined via CSS custom properties in `css/themes/`. You can modify colors, fonts, opacities, and more by editing these files:
- `minimalistic-light.css`
- `minimalistic-dark.css`
- `work-light.css`
- `work-dark.css`

---

## 🗂 Project Structure

```
extension/
├── manifest.json                  ← Chrome Extension manifest (Manifest V3)
├── newtab.html                    ← Main new tab page shell
├── README.md
│
├── icons/                         ← Extension icons (16/32/48/128px)
│
├── assets/
│   ├── backgrounds/               ← Theme-specific background images
│   ├── fonts/                     ← Custom font files
│   └── icons/                     ← UI icons (SVG/PNG)
│
├── css/
│   ├── base.css                   ← Layout grids, resets, base variables
│   ├── themes/                    ← 4 theme variants (light/dark × mode)
│   └── components/                ← Per-component stylesheets
│       ├── clock.css
│       ├── search.css
│       ├── greeting.css
│       ├── quicklinks.css
│       ├── stickynotes.css
│       ├── settings-panel.css
│       ├── widgets.css            ← Daily Practice, Weather & Scribble styling
│       ├── calendar.css           ← Study & Holiday Calendar styling
│       └── bookmarks.css          ← Bookmarks Hub & Quick Add styling
│
├── js/
│   ├── storage.js                 ← chrome.storage.local Promise wrapper
│   ├── theme-manager.js           ← Mode & theme sync/persistence
│   ├── newtab.js                  ← Page router & layout initializer
│   └── components/
│       ├── clock.js               ← Clock rendering
│       ├── search.js              ← Google search integration
│       ├── greeting.js            ← Personalized greeting card
│       ├── quicklinks.js          ← Sidebar link manager
│       ├── stickynotes.js         ← Sticky notes with drag & drop
│       ├── settings-panel.js      ← Settings panel controller
│       ├── widgets.js             ← Daily Practice + Weather + Scribble
│       ├── calendar.js            ← Study & Holiday Calendar component
│       └── bookmarks.js           ← Chrome bookmarks manager & quick-add
│
└── popup/
    ├── popup.html                 ← Toolbar popup settings & quick bookmark
    ├── popup.css
    └── popup.js
```

---

## 🔐 Permissions Explained

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save preferences, notes, study tasks, and daily practice history locally |
| `bookmarks` | View, search, add, and manage your Chrome bookmarks directly from Chikoo |
| `tabs` | Fetch open tabs to bookmark them in 1 click and identify active tab in popup |
| `geolocation` | Fetch weather data based on your current location |

All data stays **100% local** on your machine. No external telemetry or analytics.

---

## 🛠 Tech Stack

- **Manifest V3** — latest Chrome extension architecture
- **Vanilla HTML / CSS / JavaScript** — zero dependencies, zero build step
- **Open-Meteo API** — free, open-source weather data (no key required)

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** this repository
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Make your changes** and test by loading the extension locally
4. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add new feature X"
   ```
5. **Push** and open a **Pull Request**

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 💡 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't load | Make sure you selected the folder containing `manifest.json`, not a parent directory |
| Weather shows "Location denied" | Allow location access when prompted, or enable it in Chrome site settings |
| Backgrounds not showing | Ensure your image is named `bg.jpg` and placed in the correct theme subfolder |

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/PranjalArya1908">Devesh Rawat</a>
</p>
# Chikoo-New-Tab-Extension
