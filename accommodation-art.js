(() => {
  const covers = {
    torsby: {
      src: 'accommodation-art/torsby-valbergsangen.webp',
      alt: 'Valbergsängen Hotel & Hostel — Torsby',
      markerPrefix: 'Stay 3:'
    },
    hallagarden: {
      src: 'accommodation-art/hallagarden-vintrosa.webp',
      alt: 'Hallagårdens B&B — Vintrosa',
      markerPrefix: 'Stay 4:'
    },
    stockholm: {
      src: 'accommodation-art/skanstulls-stockholm.webp',
      alt: 'Skanstulls Boutique Hostel — Stockholm',
      markerPrefix: 'Stay 5:'
    }
  };

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
    Object.entries(covers).forEach(([stopId, cfg]) => {
      const visual = document.querySelector(`.stay-row[data-fly-stop="${stopId}"] .stay-visual`);
      if (!visual || visual.querySelector('[data-accommodation-art="1"]')) return;
      const fallback = visual.querySelector('svg');
      if (!fallback) return; // preserve a genuine trip-photo cover if one exists later
      fallback.remove();
      visual.prepend(makeImage(cfg));
    });
  }

  function applyMapMarkers() {
    Object.values(covers).forEach(cfg => {
      const marker = [...document.querySelectorAll('.trip-marker[title]')]
        .find(el => el.title.startsWith(cfg.markerPrefix));
      if (!marker || marker.querySelector('[data-accommodation-art="1"]')) return;
      const fallback = marker.querySelector('svg');
      if (!fallback) return; // preserve a genuine trip-photo cover if Lisa later supplies one
      fallback.remove();
      marker.prepend(makeImage(cfg));
    });
  }

  function apply() {
    applyItinerary();
    applyMapMarkers();
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
