(() => {
  // Hand-positioned cartographic callouts. The map coordinate remains the anchor;
  // paintings are deliberately moved into whitespace and linked back by leader lines.
  const offsets = {
    'Håverud Aqueduct': [-220, 34],
    'Glaskogen Nature Reserve': [-238, 132],
    'Glava Glasbruk': [-238, 62],
    'Fryksdalen': [-242, 5],
    'Tossebergsklätten': [-248, -72],
    'Ritamäki finngård': [-238, -150],
    'Hovfjället': [64, -142],
    'Klarälvdalen': [108, -28],
    'Vadstena': [126, -58],
    'Gränna': [120, -4]
  };

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

    // Arvika is a route/place label, not a scenic watercolor card.
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
    root.innerHTML = '';

    const [dx, dy] = offsets[title];

    // app.js currently creates the scenic MapLibre marker with an +8px x offset.
    // This 28x36 pin is shifted -22px so its bottom tip lands exactly on the
    // geographic coordinate rather than 8px to the right of it.
    const pin = document.createElement('span');
    pin.className = 'scenic-location-pin';
    pin.setAttribute('aria-label', `${title} exact location`);
    pin.title = `${title} — exact location`;
    pin.innerHTML = '<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 1.5C7 1.5 1.8 6.7 1.8 13.4c0 8.7 12.2 21.1 12.2 21.1s12.2-12.4 12.2-21.1C26.2 6.7 21 1.5 14 1.5Z"/><circle cx="14" cy="13.5" r="5"/></svg>';

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

    // Leader starts at the exact coordinate (8px left of the marker root) and
    // ends at the nearest edge/centre of the smaller watercolor card.
    const cardWidth = 118;
    const cardHeight = 92;
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

  function scan(node = document) {
    if (node.matches?.('.scenic-marker')) decorate(node);
    node.querySelectorAll?.('.scenic-marker').forEach(decorate);
  }

  scan();
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) scan(node);
    }));
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
