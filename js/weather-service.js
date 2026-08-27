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

  const CONDITIONS = {
    0: ['☀️', 'Clear Sky'],
    1: ['🌤', 'Mostly Clear'],
    2: ['⛅', 'Partly Cloudy'],
    3: ['☁️', 'Overcast'],
    45: ['🌫', 'Foggy'],
    51: ['🌦', 'Light Drizzle'],
    61: ['🌧', 'Light Rain'],
    63: ['🌧', 'Rain'],
    71: ['❄️', 'Snow'],
    80: ['🌦', 'Rain Showers'],
    95: ['⛈', 'Thunderstorm'],
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
      if (iconEl) iconEl.textContent = '🌤';
      if (tempEl) tempEl.textContent = '--°C';
      badge.title = 'Loading weather…';
      return;
    }

    if (iconEl) iconEl.textContent = _data.icon;
    if (tempEl) tempEl.textContent = `${_data.temp}°C`;
    badge.title = `${_data.desc} · ${_data.temp}°C`;
  }

  function _parseWeather(json) {
    const w = json.current_weather;
    const [icon, desc] = CONDITIONS[w.weathercode] ?? ['🌡', 'Weather'];

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
