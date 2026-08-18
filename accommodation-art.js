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
  let mapHooked = false;
  let layingOut = false;

  function bedSvg() {
    return '<svg class="stay-marker__bed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19V8"/><path d="M3 14h18v5H3"/><path d="M7 14v-4h5a3 3 0 0 1 3 3v1"/><path d="M21 19v2M3 19v2"/></svg>';
  }

  function ownCover(stopId) {
    const stop = stops.get(stopId);
    if (!stop) return null;
    const media = stop.media || [];
    const preferred = media.find(item => item.id === stop.cover) || media[0];
    if (!preferred) return null;
    return { src: preferred.thumb || preferred.src, alt: stop.title };
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
      if (!fallback) return;
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
      marker.innerHTML = `
        <span class="stay-marker__anchor" aria-hidden="true"></span>
        <span class="stay-marker__leader" aria-hidden="true"></span>
        <span class="stay-marker__badge">${bedSvg()}<span class="stay-marker__number">${stayNumber}</span></span>`;
    });
  }

  function rectWithMargin(rect, margin = 7) {
    return {
      left: rect.left - margin,
      top: rect.top - margin,
      right: rect.right + margin,
      bottom: rect.bottom + margin,
      width: rect.width + margin * 2,
      height: rect.height + margin * 2
    };
  }

  function overlapArea(a, b) {
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return w * h;
  }

  function isNamedMapFeature(feature) {
    if (feature?.layer?.type !== 'symbol') return false;
    const props = feature.properties || {};
    return Object.keys(props).some(key => /^name($|[:_])/i.test(key) && props[key]);
  }

  function namedFeaturePenalty(rect) {
    const map = window.ROADTRIP_MAP;
    if (!map?.queryRenderedFeatures || !map.getContainer) return 0;
    const mr = map.getContainer().getBoundingClientRect();
    const x1 = Math.max(0, rect.left - mr.left);
    const y1 = Math.max(0, rect.top - mr.top);
    const x2 = Math.min(mr.width, rect.right - mr.left);
    const y2 = Math.min(mr.height, rect.bottom - mr.top);
    if (x2 <= x1 || y2 <= y1) return 0;
    try {
      const features = map.queryRenderedFeatures([[x1, y1], [x2, y2]]) || [];
      return features.filter(isNamedMapFeature).length * 1000000;
    } catch {
      return 0;
    }
  }

  function lineNamedFeaturePenalty(anchor, rect) {
    const map = window.ROADTRIP_MAP;
    if (!map?.queryRenderedFeatures || !map.getContainer) return 0;
    const mr = map.getContainer().getBoundingClientRect();
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    let endX = cx;
    let endY = cy;
    const dx = cx - anchor.x;
    const dy = cy - anchor.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      endX = dx > 0 ? rect.left : rect.right;
      endY = Math.max(rect.top + 7, Math.min(rect.bottom - 7, anchor.y));
    } else {
      endY = dy > 0 ? rect.top : rect.bottom;
      endX = Math.max(rect.left + 7, Math.min(rect.right - 7, anchor.x));
    }
    let penalty = 0;
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const x = anchor.x + (endX - anchor.x) * t - mr.left;
      const y = anchor.y + (endY - anchor.y) * t - mr.top;
      try {
        const features = map.queryRenderedFeatures([x, y]) || [];
        if (features.some(isNamedMapFeature)) penalty += 100000;
      } catch {}
    }
    return penalty;
  }

  function fixedDomObstacles() {
    const selectors = [
      '.media-marker:not(.marker-hidden)',
      '.scenic-location-pin',
      '.scenic-callout-card',
      '.maplibregl-ctrl-top-left',
      '.map-tools',
      '.route-chip',
      '.itinerary-panel.is-open',
      '.gallery-drawer.is-open'
    ];
    return [...document.querySelectorAll(selectors.join(','))]
      .map(el => el.getBoundingClientRect())
      .filter(rect => rect.width > 1 && rect.height > 1)
      .map(rect => rectWithMargin(rect, 6));
  }

  function candidateOffsets(stopId) {
    const preferred = {
      'duse-udde': [-80, -54],
      glava: [-80, 16],
      torsby: [24, -58],
      hallagarden: [24, -58],
      stockholm: [26, 18],
      vadstena: [-82, -56]
    }[stopId] || [24, -56];

    const [px, py] = preferred;
    const sx = px < 0 ? -1 : 1;
    return [
      [px, py],
      [sx * 26, -60],
      [sx * 26, 18],
      [-sx * 84, -60],
      [-sx * 84, 18],
      [sx * 66, -82],
      [sx * 66, 34],
      [-sx * 112, -82],
      [-sx * 112, 34],
      [-29, -84],
      [-29, 38],
      [92, -26],
      [-150, -26]
    ].filter((value, index, all) => all.findIndex(other => other[0] === value[0] && other[1] === value[1]) === index);
  }

  function drawLeader(root, dx, dy) {
    const badge = root.querySelector('.stay-marker__badge');
    const leader = root.querySelector('.stay-marker__leader');
    if (!badge || !leader) return;
    const w = badge.offsetWidth || 58;
    const h = badge.offsetHeight || 40;
    const cx = dx + w / 2;
    const cy = dy + h / 2;
    let endX;
    let endY;
    if (Math.abs(cx) >= Math.abs(cy)) {
      endX = cx > 0 ? dx : dx + w;
      endY = Math.max(dy + 7, Math.min(dy + h - 7, 0));
    } else {
      endY = cy > 0 ? dy : dy + h;
      endX = Math.max(dx + 7, Math.min(dx + w - 7, 0));
    }
    leader.style.width = `${Math.hypot(endX, endY)}px`;
    leader.style.transform = `rotate(${Math.atan2(endY, endX) * 180 / Math.PI}deg)`;
  }

  function layoutStayMarkers() {
    if (layingOut) return;
    layingOut = true;
    try {
      const map = window.ROADTRIP_MAP;
      const mapRect = map?.getContainer?.().getBoundingClientRect() || document.querySelector('#map')?.getBoundingClientRect();
      if (!mapRect) return;

      const roots = [...document.querySelectorAll('.trip-marker.stay-marker-semantic:not(.marker-hidden)')];
      const obstacles = fixedDomObstacles();
      const placed = [];

      roots.forEach(root => {
        const badge = root.querySelector('.stay-marker__badge');
        if (!badge) return;
        const rootRect = root.getBoundingClientRect();
        const anchor = { x: rootRect.left, y: rootRect.top };
        const w = badge.offsetWidth || 58;
        const h = badge.offsetHeight || 40;
        let best = null;

        candidateOffsets(root.dataset.stopId).forEach(([dx, dy], index) => {
          const rect = {
            left: anchor.x + dx,
            top: anchor.y + dy,
            right: anchor.x + dx + w,
            bottom: anchor.y + dy + h,
            width: w,
            height: h
          };
          let score = index * 100;
          const margin = 10;
          if (rect.left < mapRect.left + margin) score += 5000000;
          if (rect.top < mapRect.top + margin) score += 5000000;
          if (rect.right > mapRect.right - margin) score += 5000000;
          if (rect.bottom > mapRect.bottom - margin) score += 5000000;

          score += namedFeaturePenalty(rectWithMargin(rect, 5));
          score += lineNamedFeaturePenalty(anchor, rect);
          obstacles.forEach(obstacle => { score += overlapArea(rectWithMargin(rect, 5), obstacle) * 500; });
          placed.forEach(other => { score += overlapArea(rectWithMargin(rect, 8), other) * 1200; });
          score += Math.hypot(dx, dy) * 1.5;

          if (!best || score < best.score) best = { dx, dy, rect, score };
        });

        if (!best) return;
        badge.style.setProperty('--stay-x', `${best.dx}px`);
        badge.style.setProperty('--stay-y', `${best.dy}px`);
        placed.push(rectWithMargin(best.rect, 8));
        requestAnimationFrame(() => drawLeader(root, best.dx, best.dy));
      });
    } finally {
      layingOut = false;
    }
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
    popup.querySelector('h3')?.after(image);
  }

  function hookMap() {
    const map = window.ROADTRIP_MAP;
    if (!map || mapHooked) return;
    mapHooked = true;
    map.on('moveend', queueApply);
    map.on('zoomend', queueApply);
    map.on('idle', queueApply);
  }

  function apply() {
    applyItinerary();
    applySemanticMapMarkers();
    enhancePopup();
    hookMap();
    requestAnimationFrame(layoutStayMarkers);
  }

  let queued = false;
  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  apply();
  window.addEventListener('roadtrip-map-ready', queueApply);
  window.addEventListener('resize', queueApply, { passive: true });
  new MutationObserver(queueApply).observe(document.documentElement, { childList: true, subtree: true });
})();