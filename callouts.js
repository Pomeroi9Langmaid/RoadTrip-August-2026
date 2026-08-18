(() => {
  const layout = window.SCENIC_LAYOUT?.cards || {};
  const highlights = window.SCENIC_HIGHLIGHTS || [];
  const byTitle = new Map(highlights.map(h => [h.title, h]));
  const byId = new Map(highlights.map(h => [h.id, h]));
  let mapHooked = false;
  let layingOut = false;

  function activeDay() {
    return document.querySelector('.day-tab.is-active')?.dataset.day || 'all';
  }

  function scaleForViewport() {
    if (window.innerWidth < 900) return 0.62;
    if (window.innerWidth < 1200) return 0.80;
    return 1;
  }

  function exactPinSvg() {
    return '<svg viewBox="0 0 26 34" aria-hidden="true"><path d="M13 1.5C6.5 1.5 1.6 6.3 1.6 12.6c0 8.1 11.4 19.8 11.4 19.8s11.4-11.7 11.4-19.8C24.4 6.3 19.5 1.5 13 1.5Z"/><circle cx="13" cy="12.8" r="4.6"/></svg>';
  }

  function decorate(root) {
    if (!root || root.dataset.calloutReady === '1') return;
    const title = root.querySelector('strong')?.textContent?.trim();
    if (!title) return;
    const highlight = byTitle.get(title);

    if (!highlight || highlight.id === 'arvika' || !layout[highlight.id]) {
      if (highlight?.id === 'arvika') root.style.display = 'none';
      root.dataset.calloutReady = '1';
      return;
    }

    root.dataset.calloutReady = '1';
    root.dataset.highlightId = highlight.id;
    root.classList.add('scenic-anchor', 'has-watercolor');
    root.innerHTML = '';

    const pin = document.createElement('span');
    pin.className = 'scenic-location-pin';
    pin.title = `${title} — exact location`;
    pin.setAttribute('aria-label', `${title} exact location`);
    pin.innerHTML = exactPinSvg();

    const leader = document.createElement('span');
    leader.className = 'scenic-leader';

    const card = document.createElement('div');
    card.className = 'scenic-callout-card scenic-callout-card--watercolor';
    card.title = title;

    const img = document.createElement('img');
    img.className = 'scenic-watercolor';
    img.src = layout[highlight.id].asset;
    img.alt = title;
    img.decoding = 'async';
    img.draggable = false;
    card.appendChild(img);

    root.append(pin, leader, card);
  }

  function rectWithMargin(rect, margin = 8) {
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

  function pointInRect(x, y, r, margin = 4) {
    return x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin;
  }

  function isNamedMapFeature(feature) {
    if (feature?.layer?.type !== 'symbol') return false;
    const p = feature.properties || {};
    return Object.keys(p).some(key => /^name($|[:_])/i.test(key) && p[key]);
  }

  function renderedFeaturePenalty(rect) {
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
      let penalty = 0;
      features.forEach(feature => {
        const id = String(feature?.layer?.id || '').toLowerCase();
        if (isNamedMapFeature(feature)) penalty += 18000;
        if (id === 'trip-route-line' || id === 'trip-route-arrows') penalty += 9000;
      });
      return penalty;
    } catch {
      return 0;
    }
  }

  function linePenalty(anchor, rect, obstacles) {
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    const dx = cx - anchor.x;
    const dy = cy - anchor.y;
    let endX = cx;
    let endY = cy;
    if (Math.abs(dx) >= Math.abs(dy)) {
      endX = dx > 0 ? rect.left : rect.right;
      endY = Math.max(rect.top + 8, Math.min(rect.bottom - 8, anchor.y));
    } else {
      endY = dy > 0 ? rect.top : rect.bottom;
      endX = Math.max(rect.left + 8, Math.min(rect.right - 8, anchor.x));
    }

    let penalty = 0;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      const x = anchor.x + (endX - anchor.x) * t;
      const y = anchor.y + (endY - anchor.y) * t;
      if (obstacles.some(r => pointInRect(x, y, r, 3))) penalty += 5000;

      const map = window.ROADTRIP_MAP;
      if (map?.queryRenderedFeatures && map.getContainer) {
        const mr = map.getContainer().getBoundingClientRect();
        try {
          const features = map.queryRenderedFeatures([x - mr.left, y - mr.top]) || [];
          if (features.some(isNamedMapFeature)) penalty += 4500;
        } catch {}
      }
    }
    return penalty;
  }

  function candidateOffsets(base, scale) {
    const bx = Math.round((base?.[0] || 150) * scale);
    const by = Math.round((base?.[1] || -60) * scale);
    const side = bx < 0 ? -1 : 1;
    const r1 = Math.round(150 * scale);
    const r2 = Math.round(210 * scale);
    const r3 = Math.round(270 * scale);
    const ys = [Math.round(-145 * scale), Math.round(-75 * scale), Math.round(20 * scale), Math.round(95 * scale)];
    const raw = [
      [bx, by],
      [side * r2, by - Math.round(90 * scale)],
      [side * r2, by + Math.round(90 * scale)],
      [side * r3, ys[0]],
      [side * r3, ys[1]],
      [side * r3, ys[2]],
      [side * r3, ys[3]],
      [-side * r2, ys[0]],
      [-side * r2, ys[1]],
      [-side * r2, ys[2]],
      [-side * r2, ys[3]],
      [side * r1, Math.round(-175 * scale)],
      [side * r1, Math.round(120 * scale)],
      [-side * r1, Math.round(-175 * scale)],
      [-side * r1, Math.round(120 * scale)]
    ];
    const seen = new Set();
    return raw.filter(([x, y]) => {
      const key = `${x},${y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function currentDomObstacles() {
    const selectors = [
      '.trip-marker:not(.marker-hidden)',
      '.media-marker:not(.marker-hidden)',
      '.maplibregl-ctrl-top-left',
      '.map-tools',
      '.route-chip',
      '.itinerary-panel.is-open',
      '.gallery-drawer.is-open'
    ];
    return [...document.querySelectorAll(selectors.join(','))]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 1 && r.height > 1)
      .map(r => rectWithMargin(r, 7));
  }

  function drawLeader(root, dx, dy) {
    const leader = root.querySelector('.scenic-leader');
    const card = root.querySelector('.scenic-callout-card');
    if (!leader || !card || root.classList.contains('marker-hidden')) return;

    const w = card.offsetWidth || 112;
    const h = card.offsetHeight || 84;
    const startX = -8;
    const startY = 0;
    const cx = dx + w / 2;
    const cy = dy + h / 2;
    let endX;
    let endY;
    if (Math.abs(cx - startX) >= Math.abs(cy - startY)) {
      endX = cx > startX ? dx : dx + w;
      endY = Math.max(dy + 8, Math.min(dy + h - 8, startY));
    } else {
      endY = cy > startY ? dy : dy + h;
      endX = Math.max(dx + 8, Math.min(dx + w - 8, startX));
    }
    const vx = endX - startX;
    const vy = endY - startY;
    leader.style.width = `${Math.hypot(vx, vy)}px`;
    leader.style.transform = `rotate(${Math.atan2(vy, vx) * 180 / Math.PI}deg)`;
  }

  function layoutVisibleCallouts() {
    if (layingOut) return;
    layingOut = true;
    try {
      const overview = activeDay() === 'all';
      const map = window.ROADTRIP_MAP;
      const mapRect = map?.getContainer?.().getBoundingClientRect() || document.querySelector('#map')?.getBoundingClientRect();
      if (!mapRect) return;

      const roots = [...document.querySelectorAll('.scenic-anchor')]
        .filter(root => !root.classList.contains('marker-hidden') && getComputedStyle(root).display !== 'none');
      roots.forEach(root => root.classList.toggle('is-overview-callout', overview));

      const placed = [];
      const fixedObstacles = currentDomObstacles();
      const scale = scaleForViewport();

      roots.forEach(root => {
        const cfg = layout[root.dataset.highlightId];
        if (!cfg) return;
        const card = root.querySelector('.scenic-callout-card');
        if (!card) return;
        const rr = root.getBoundingClientRect();
        const anchor = { x: rr.left - 8, y: rr.top };
        const w = card.offsetWidth || (overview ? 112 : 132);
        const h = card.offsetHeight || (overview ? 84 : 99);
        const base = overview ? cfg.overviewOffset : cfg.dayOffset;
        const candidates = candidateOffsets(base, scale);
        let best = null;

        candidates.forEach(([dx, dy], index) => {
          const rect = {
            left: anchor.x + dx,
            top: anchor.y + dy,
            right: anchor.x + dx + w,
            bottom: anchor.y + dy + h,
            width: w,
            height: h
          };
          let score = index * 35;
          const margin = 10;
          if (rect.left < mapRect.left + margin) score += 500000 + (mapRect.left + margin - rect.left) * 1000;
          if (rect.top < mapRect.top + margin) score += 500000 + (mapRect.top + margin - rect.top) * 1000;
          if (rect.right > mapRect.right - margin) score += 500000 + (rect.right - (mapRect.right - margin)) * 1000;
          if (rect.bottom > mapRect.bottom - margin) score += 500000 + (rect.bottom - (mapRect.bottom - margin)) * 1000;

          placed.forEach(r => { score += overlapArea(rectWithMargin(rect, 10), r) * 500; });
          fixedObstacles.forEach(r => { score += overlapArea(rectWithMargin(rect, 5), r) * 120; });
          score += renderedFeaturePenalty(rect);
          score += linePenalty(anchor, rect, [...fixedObstacles, ...placed]);
          score += Math.hypot(dx - Math.round((base?.[0] || dx) * scale), dy - Math.round((base?.[1] || dy) * scale)) * 2;

          if (!best || score < best.score) best = { dx, dy, rect, score };
        });

        if (!best) return;
        card.style.setProperty('--callout-x', `${best.dx}px`);
        card.style.setProperty('--callout-y', `${best.dy}px`);
        placed.push(rectWithMargin(best.rect, 10));
        requestAnimationFrame(() => drawLeader(root, best.dx, best.dy));
      });
    } finally {
      layingOut = false;
    }
  }

  function sync(node = document) {
    if (node.matches?.('.scenic-marker')) decorate(node);
    node.querySelectorAll?.('.scenic-marker').forEach(decorate);
    requestAnimationFrame(layoutVisibleCallouts);
  }

  function hookMap() {
    const map = window.ROADTRIP_MAP;
    if (!map || mapHooked) return;
    mapHooked = true;
    map.on('moveend', queueSync);
    map.on('zoomend', queueSync);
  }

  sync();
  hookMap();
  window.addEventListener('roadtrip-map-ready', () => { hookMap(); queueSync(); });

  let queued = false;
  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
      hookMap();
    });
  }

  new MutationObserver(records => {
    let relevant = false;
    for (const record of records) {
      if (record.type === 'childList' && record.addedNodes.length) {
        relevant = true;
        record.addedNodes.forEach(node => { if (node.nodeType === 1) sync(node); });
      }
      if (record.type === 'attributes' && record.attributeName === 'class') relevant = true;
    }
    if (relevant) queueSync();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', queueSync, { passive: true });
})();