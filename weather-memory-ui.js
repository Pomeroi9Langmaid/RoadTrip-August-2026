(() => {
  const weather = window.WEATHER_MEMORY;
  if (!weather) return;
  const icon = kind => ({rain:'☔',showers:'🌦',partly:'⛅',cloud:'☁️'}[kind] || '🌤');
  function init() {
    const shell = document.querySelector('#mapShell');
    if (!shell || document.querySelector('#weatherMemory')) return;
    const card = document.createElement('aside');
    card.id = 'weatherMemory';
    card.className = 'weather-memory';
    shell.appendChild(card);
    function currentDay() {
      const active = document.querySelector('.day-tab.is-active');
      if (!active) return 'all';
      const val = active.dataset.day;
      return val === 'all' ? 'all' : Number(val);
    }
    function render() {
      const day = currentDay();
      if (day === 'all') {
        card.innerHTML = `<button type="button" class="weather-memory__summary" title="${weather.note}"><span>🌤</span><span><strong>Weather memory</strong><small>Select a day to remember the driving conditions</small></span></button>`;
        card.classList.remove('is-detail');
        return;
      }
      const w = weather.days.find(x => x.day === day);
      if (!w) return;
      card.classList.add('is-detail');
      card.innerHTML = `<div class="weather-memory__detail" title="${weather.note}">
        <div class="weather-memory__icon">${icon(w.icon)}</div>
        <div class="weather-memory__copy">
          <span class="weather-memory__eyebrow">Weather memory · Day ${w.day}</span>
          <strong>${w.headline}</strong>
          <span>${w.area}</span>
          <small>${w.detail}</small>
        </div>
        <div class="weather-memory__numbers"><b>${w.high}°</b><span>${w.low}°</span><small>${w.rainMm} mm</small></div>
      </div>`;
    }
    render();
    document.querySelector('#dayTabs')?.addEventListener('click', () => setTimeout(render, 0));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
