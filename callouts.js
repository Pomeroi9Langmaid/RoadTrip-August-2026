(() => {
  // Scenic locations are always pinned at the exact map coordinate.
  // Watercolor cards are displaced into whitespace and linked back to the pin.
  // On the All-days overview only the major paintings remain visible; all exact
  // scenic pins stay visible. Day views reveal the additional paintings.
  const offsets = {
    'Håverud Aqueduct': [-158, 34],
    'Glaskogen Nature Reserve': [-152, 72],
    'Glava Glasbruk': [-164, -12],
    'Fryksdalen': [-154, 22],
    'Tossebergsklätten': [-158, -52],
    'Ritamäki finngård': [-168, -105],
    'Hovfjället': [58, -108],
    'Klarälvdalen': [78, -24],
    'Vadstena': [94, -52],
    'Gränna': [94, 24]
  };

  const overviewPaintings = new Set([
    'Håverud Aqueduct',
    'Glava Glasbruk',
    'Ritamäki finngård',
    'Hovfjället',
    'Vadstena',
    'Gränna'
  ]);

  // Restored watercolor sprite. Scenic artwork never contains photo/video counts;
  // those remain separate clickable camera markers created by app.js.
  const paintings = {
    'Håverud Aqueduct': [0, 0],
    'Glava Glasbruk': [25, 0],
    'Fryksdalen': [50, 0],
    'Tossebergsklätten': [75, 0],
    'Ritamäki finngård': [100, 0],
    'Hovfjället': [0, 100],
    'Klarälvdalen': [25, 100],
    'Vadstena': [50, 100],
    'Gränna': [75, 100],
    'Glaskogen Nature Reserve': [100, 100]
  };

  function decorate(root) {
    if (!root || root.dataset.calloutReady === '1') return;
    const title = root.querySelector('strong')?.textContent?.trim();
    if (!title) return;

    // Arvika is a route/place label rather than a scenic watercolor feature.
    if (title === 'Arvika') {
      root.style.display = 'none';
      root.dataset.calloutReady = '1';
      return;
    }

    const art = paintings[title];
    if (!art || !offsets[title]) return;

    root.dataset.calloutReady = '1';
    root.dataset.highlightTitle = title;
    root.classList.add('scenic-anchor', 'has-watercolor');
    if (!overviewPaintings.has(title)) root.classList.add('overview-detail');
    root.innerHTML = '';

    const [dx, dy] = offsets[title];

    // app.js creates the MapLibre marker with an +8px x offset. This SVG is
    // shifted so the bottom tip lands on the true geographic coordinate.
    const pin = document.createElement('span');
    pin.className = 'scenic-location-pin';
    pin.setAttribute('aria-label', `${title} exact location`);
    pin.title = `${title} — exact location`;
    pin.innerHTML = '<svg viewBox="0 0 26 34" aria-hidden="true"><path d="M13 1.5C6.5 1.5 1.6 6.3 1.6 12.6c0 8.1 11.4 19.8 11.4 19.8s11.4-11.7 11.4-19.8C24.4 6.3 19.5 1.5 13 1.5Z"/><circle cx="13" cy="12.8" r="4.6"/></svg>';

    const leader = document.createElement('span');
    leader.className = 'scenic-leader';

    const card = document.createElement('div');
    card.className = 'scenic-callout-card scenic-callout-card--watercolor';
    card.style.setProperty('--callout-x', `${dx}px`);
    card.style.setProperty('--callout-y', `${dy}px`);
    card.title = title;

    const painting = document.createElement('span');
    painting.className = 'scenic-watercolor';
    painting.setAttribute('role', 'img');
    painting.setAttribute('aria-label', title);
    painting.style.setProperty('--sprite-x', `${art[0]}%`);
    painting.style.setProperty('--sprite-y', `${art[1]}%`);
    card.appendChild(painting);

    const cardWidth = 108;
    const cardHeight = 84;
    const startX = -8;
    const startY = 0;
    const endX = dx < 0 ? dx + cardWidth : dx;
    const endY = dy + cardHeight / 2;
    const vx = endX - startX;
    const vy = endY - startY;
    const length = Math.hypot(vx, vy);
    const angle = Math.atan2(vy, vx) * 180 / Math.PI;
    leader.style.width = `${length}px`;
    leader.style.transform = `rotate(${angle}deg)`;

    root.append(pin, leader, card);
  }

  function syncOverviewMode() {
    const active = document.querySelector('.day-tab.is-active');
    const isOverview = !active || active.dataset.day === 'all';
    document.body.classList.toggle('map-overview', isOverview);
  }

  function scan(node = document) {
    if (node.matches?.('.scenic-marker')) decorate(node);
    node.querySelectorAll?.('.scenic-marker').forEach(decorate);
    syncOverviewMode();
  }

  scan();

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) scan(node);
    }));
    syncOverviewMode();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
})();
