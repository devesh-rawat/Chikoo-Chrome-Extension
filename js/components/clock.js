/**
 * clock.js — Futuristic Spatial Clock & Weather System (Aura Tab)
 */

const ClockComponent = (() => {
  let _intervalId = null;
  let _weatherData = null;

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _parts() {
    const now  = new Date();
    const h24  = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12  = h24 % 12 || 12;
    return { h24: _pad(h24), h12: _pad(h12), m: _pad(m), s: _pad(s), ampm };
  }

  function _dateStr() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    }).toUpperCase();
  }

  async function _fetchWeather() {
    try {
      await WeatherService.fetchCurrentLocation();
      _weatherData = WeatherService.getData();
      _updateWeatherUI();
    } catch (e) {
      _showWeatherError();
    }
  }

  function _updateWeatherUI() {
    const container = document.getElementById('clock-weather-container');
    if (!container || !_weatherData) return;

    container.innerHTML = `
      <div class="clock-weather-main">
        <div class="clock-weather-emoji">${_weatherData.icon}</div>
        <div class="clock-weather-temp">${_weatherData.temp}°C</div>
      </div>
      <div class="clock-weather-desc">${_weatherData.desc}</div>
      
      <div class="clock-weather-details">
        <div class="clock-weather-stat">
          <span class="weather-stat-label">💨 Wind</span>
          <span class="weather-stat-val">${_weatherData.wind} km/h</span>
        </div>
        <div class="clock-weather-stat">
          <span class="weather-stat-label">💧 Humidity</span>
          <span class="weather-stat-val">${_weatherData.humidity}%</span>
        </div>
        <div class="clock-weather-stat">
          <span class="weather-stat-label">🌡 Feels Like</span>
          <span class="weather-stat-val">${_weatherData.feelsLike}°C</span>
        </div>
      </div>
    `;
  }

  function _showWeatherError() {
    const container = document.getElementById('clock-weather-container');
    if (!container) return;

    container.innerHTML = `
      <div class="clock-weather-error">
        <span style="font-size:1.6rem;">📍</span>
        <span class="weather-error-text">Weather location permissions paused.</span>
        <button class="weather-retry-btn" id="weather-retry-btn">Retry Weather</button>
      </div>
    `;

    const retry = document.getElementById('weather-retry-btn');
    retry?.addEventListener('click', () => {
      container.innerHTML = `<div class="clock-weather-loading"><span>🌍 Loading weather...</span></div>`;
      WeatherService.fetchCurrentLocation({ force: true })
        .then((data) => {
          _weatherData = data;
          _updateWeatherUI();
        })
        .catch(() => _showWeatherError());
    });
  }

  function render(container, opts = {}) {
    const { use24h = false } = opts;

    container.innerHTML = `
      <div class="section-clock">
        <div class="clock-content-grid">
          
          <div class="clock-time-side">
            <div class="clock-top-row">
              <span class="clock-label">Chikoo Clock</span>
              <span class="clock-ampm" id="clock-ampm"></span>
            </div>
            
            <div class="clock-main-time">
              <span class="clock-hhmm" id="clock-hhmm"></span>
            </div>
            
            <div class="clock-sub-row">
              <div class="clock-seconds-block">
                <span class="clock-sec-label">SEC</span>
                <span class="clock-sec-value" id="clock-sec"></span>
              </div>
              <div class="clock-date" id="clock-date"></div>
            </div>
          </div>
          
          <div class="clock-weather-side" id="clock-weather-container">
            <div class="clock-weather-loading">
              <span class="weather-loading-icon">🌍</span>
              <span class="weather-loading-text">Loading weather...</span>
            </div>
          </div>
          
        </div>
      </div>
    `;

    function tick() {
      const t = _parts();
      const hhmm = document.getElementById('clock-hhmm');
      const ampm = document.getElementById('clock-ampm');
      const sec  = document.getElementById('clock-sec');
      const date = document.getElementById('clock-date');

      const h = use24h ? t.h24 : t.h12;

      if (hhmm) hhmm.innerHTML = `${h}<span class="clock-main-sep">:</span>${t.m}`;
      if (ampm) ampm.textContent = t.ampm;
      if (sec)  sec.textContent  = t.s;
      if (date) date.textContent = _dateStr();
    }

    _fetchWeather();

    tick();
    if (_intervalId) clearInterval(_intervalId);
    _intervalId = setInterval(tick, 1000);
  }

  function destroy() {
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }

  return { render, destroy };
})();
