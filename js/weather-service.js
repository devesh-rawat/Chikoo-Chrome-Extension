/**
 * weather-service.js — Shared geolocation weather for Chikoo
 * Powers the clock widget, top nav badge, and weather hub.
 */

const WeatherService = (() => {
  let _data = null;
  let _lastFetchTime = 0;
  let _fetchPromise = null;
  const FETCH_COOLDOWN = 15 * 60 * 1000;
  const _listeners = new Set();

  const SUN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41"/></svg>`;
  const CLOUD_SUN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2"/><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>`;
  const CLOUD_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>`;
  const RAIN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/></svg>`;
  const SNOW_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="16" y1="16" x2="16.01" y2="16"/></svg>`;
  const STORM_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>`;

  const CONDITIONS = {
    0: [SUN_SVG, 'Clear Sky'],
    1: [CLOUD_SUN_SVG, 'Mostly Clear'],
    2: [CLOUD_SUN_SVG, 'Partly Cloudy'],
    3: [CLOUD_SVG, 'Overcast'],
    45: [CLOUD_SVG, 'Foggy'],
    51: [RAIN_SVG, 'Light Drizzle'],
    61: [RAIN_SVG, 'Light Rain'],
    63: [RAIN_SVG, 'Rain'],
    71: [SNOW_SVG, 'Snow'],
    80: [RAIN_SVG, 'Rain Showers'],
    95: [STORM_SVG, 'Thunderstorm'],
  };

  function _notify() {
    _listeners.forEach((fn) => {
      try { fn(_data); } catch (_) { /* ignore listener errors */ }
    });
  }

  function _updateTopBadge() {
    const badge = document.getElementById('top-weather-badge');
    if (!badge) return;

    const iconEl = badge.querySelector('.tw-icon');
    const tempEl = badge.querySelector('.tw-temp');

    if (!_data) {
      if (iconEl) iconEl.innerHTML = CLOUD_SUN_SVG;
      if (tempEl) tempEl.textContent = '--°C';
      badge.title = 'Loading weather…';
      return;
    }

    if (iconEl) iconEl.innerHTML = _data.icon;
    if (tempEl) tempEl.textContent = `${_data.temp}°C`;
    badge.title = `${_data.desc} · ${_data.temp}°C`;
  }

  function _parseWeather(json) {
    const w = json.current_weather;
    const [icon, desc] = CONDITIONS[w.weathercode] ?? [CLOUD_SUN_SVG, 'Weather'];

    return {
      icon,
      desc,
      temp: Math.round(w.temperature),
      wind: Math.round(w.windspeed),
      humidity: json.hourly?.relativehumidity_2m?.[0] ?? '—',
      feelsLike: Math.round(json.hourly?.apparent_temperature?.[0] ?? w.temperature - 2),
      lat: w.latitude,
      lon: w.longitude,
    };
  }

  async function fetchByCoords(lat, lon) {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m&timezone=auto`
    );
    if (!resp.ok) throw new Error('Weather API failed');
    const json = await resp.json();
    _data = _parseWeather(json);
    _lastFetchTime = Date.now();
    _updateTopBadge();
    _notify();
    return _data;
  }

  async function fetchCurrentLocation(options = {}) {
    const { force = false } = options;
    const now = Date.now();

    if (!force && _data && (now - _lastFetchTime < FETCH_COOLDOWN)) {
      _updateTopBadge();
      return _data;
    }

    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = (async () => {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, maximumAge: 60000 })
        );
        return await fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      } finally {
        _fetchPromise = null;
      }
    })();

    return _fetchPromise;
  }

  function subscribe(fn) {
    _listeners.add(fn);
    if (_data) fn(_data);
    return () => _listeners.delete(fn);
  }

  function getData() {
    return _data;
  }

  function init() {
    _updateTopBadge();
    fetchCurrentLocation().catch(() => _updateTopBadge());
  }

  return {
    init,
    fetchCurrentLocation,
    fetchByCoords,
    getData,
    subscribe,
    CONDITIONS,
  };
})();
