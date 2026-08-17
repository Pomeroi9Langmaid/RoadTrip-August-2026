(() => {
  const layout = window.SCENIC_LAYOUT?.cards || {};
  const highlights = window.SCENIC_HIGHLIGHTS || [];
  const byTitle = new Map(highlights.map(h => [h.title, h]));

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
    apply(root);
  }

  function drawLeader(root, dx, dy) {
    const leader = root.querySelector('.scenic-leader');
    const card = root.querySelector('.scenic-callout-card');
    if (!leader || !card || root.classList.contains('callout-card-hidden')) return;

    const w = card.offsetWidth || 132;
    const h = card.offsetHeight || 99;
    // app.js places the marker root 8 px to the right of the true coordinate.
    // Leader and pin therefore originate 8 px left of the root.
    const startX = -8;
    const startY = 0;
    const endX = dx < 0 ? dx + w : dx;
    const endY = dy + h / 2;
    const vx = endX - startX;
    const vy = endY - startY;
    leader.style.width = `${Math.hypot(vx, vy)}px`;
    leader.style.transform = `rotate(${Math.atan2(vy, vx) * 180 / Math.PI}deg)`;
  }

  function apply(root) {
    const cfg = layout[root.dataset.highlightId];
    if (!cfg) return;
    const day = activeDay();
    const overview = day === 'all';
    const base = overview ? cfg.overviewOffset : cfg.dayOffset;
    const hidden = overview && !cfg.overview;
    root.classList.toggle('callout-card-hidden', hidden);

    const leader = root.querySelector('.scenic-leader');
    const card = root.querySelector('.scenic-callout-card');
    if (!leader || !card || hidden || !base) return;

    const scale = scaleForViewport();
    const dx = Math.round(base[0] * scale);
    const dy = Math.round(base[1] * scale);
    card.style.setProperty('--callout-x', `${dx}px`);
    card.style.setProperty('--callout-y', `${dy}px`);
    requestAnimationFrame(() => drawLeader(root, dx, dy));
  }

  function sync(node = document) {
    if (node.matches?.('.scenic-marker')) decorate(node);
    node.querySelectorAll?.('.scenic-marker').forEach(decorate);
    document.querySelectorAll('.scenic-anchor').forEach(apply);
  }

  sync();
  let queued = false;
  const queueSync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  };

  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList' && record.addedNodes.length) {
        record.addedNodes.forEach(node => { if (node.nodeType === 1) sync(node); });
      }
    }
    queueSync();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', queueSync, { passive: true });
})();
