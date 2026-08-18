(() => {
  const fallbackCovers = {
    torsby: {
      src: 'accommodation-art/torsby-valbergsangen.webp',
      alt: 'Valbergsängen Hotel & Hostel — Torsby',
      stay: 3
    },
    hallagarden: {
      src: 'accommodation-art/hallagarden-vintrosa.webp',
      alt: 'Hallagårdens B&B — Vintrosa',
      stay: 4
    },
    stockholm: {
      src: 'accommodation-art/skanstulls-stockholm.webp',
      alt: 'Skanstulls Boutique Hostel — Stockholm',
      stay: 5
    }
  };

  const stayOrder = window.STAY_ORDER || [];
  const stops = new Map((window.TRIP_DATA?.stops || []).map(stop => [stop.id, stop]));

  function bedSvg() {
    return '<svg class="stay-marker__bed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19V8"/><path d="M3 14h18v5H3"/><path d="M7 14v-4h5a3 3 0 0 1 3 3v1"/><path d="M21 19v2M3 19v2"/></svg>';
  }

  function ownCover(stopId) {
    const stop = stops.get(stopId);
    if (!stop) return null;
    const media = stop.media || [];
    const preferred = media.find(item => item.id === stop.cover) || media[0];
    if (!preferred) return null;
    return {
      src: preferred.thumb || preferred.src,
      alt: stop.title
    };
  }

  function coverFor(stopId) {
    return ownCover(stopId) || fallbackCovers[stopId] || null;
  }

  function makeImage(cfg) {
    const img = document.createElement('img');
    img.src = cfg.src;
    img.alt = cfg.alt;
    img.decoding = 'async';
    img.loading = 'lazy';
    img.dataset.accommodationArt = '1';
    return img;
  }

  function applyItinerary() {
    Object.entries(fallbackCovers).forEach(([stopId, cfg]) => {
      const visual = document.querySelector(`.stay-row[data-fly-stop="${stopId}"] .stay-visual`);
      if (!visual || visual.querySelector('[data-accommodation-art="1"]')) return;
      const fallback = visual.querySelector('svg');
      if (!fallback) return; // preserve a genuine trip-photo cover if one exists later
      fallback.remove();
      visual.prepend(makeImage(cfg));
    });
  }

  function applySemanticMapMarkers() {
    stayOrder.forEach((stopId, index) => {
      const stayNumber = index + 1;
      const marker = [...document.querySelectorAll('.trip-marker[title]')]
        .find(el => el.title.startsWith(`Stay ${stayNumber}:`));
      if (!marker) return;
      if (marker.dataset.semanticStayMarker === String(stayNumber)) return;

      marker.dataset.semanticStayMarker = String(stayNumber);
      marker.dataset.stopId = stopId;
      marker.classList.add('stay-marker-semantic');
      marker.setAttribute('aria-label', `Stay ${stayNumber}: ${stops.get(stopId)?.title || 'overnight accommodation'}`);
      marker.innerHTML = `${bedSvg()}<span class="stay-marker__number">${stayNumber}</span>`;
    });
  }

  function enhancePopup() {
    const popup = document.querySelector('.maplibregl-popup .place-popup');
    if (!popup || popup.dataset.accommodationEnhanced === '1') return;
    const heading = popup.querySelector('h3')?.textContent || '';
    const match = heading.match(/^Stay\s+(\d+)\s+·/i);
    if (!match) return;

    const stayNumber = Number(match[1]);
    const stopId = stayOrder[stayNumber - 1];
    const cfg = coverFor(stopId);
    if (!stopId || !cfg) return;

    popup.dataset.accommodationEnhanced = '1';
    popup.classList.add('place-popup--stay');

    const eyebrow = document.createElement('div');
    eyebrow.className = 'stay-popup__eyebrow';
    eyebrow.innerHTML = `${bedSvg()}<span>Overnight stay ${stayNumber} of ${stayOrder.length}</span>`;

    const image = makeImage(cfg);
    image.className = 'stay-popup__image';
    image.loading = 'eager';

    popup.prepend(eyebrow);
    heading ? popup.querySelector('h3').after(image) : popup.prepend(image);
  }

  function apply() {
    applyItinerary();
    applySemanticMapMarkers();
    enhancePopup();
  }

  apply();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();