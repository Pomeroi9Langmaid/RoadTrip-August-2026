(() => {
  const offsets = {
    'Håverud Aqueduct': [-245, -45],
    'Glaskogen Nature Reserve': [-275, 70],
    'Glava Glasbruk': [-265, -18],
    'Fryksdalen': [-260, 28],
    'Tossebergsklätten': [-255, -58],
    'Ritamäki finngård': [-270, -92],
    'Hovfjället': [72, -138],
    'Klarälvdalen': [112, -42],
    'Vadstena': [148, -66],
    'Gränna': [145, 38]
  };

  // One restored watercolor sprite. Each scenic card is artwork + its painted name only.
  // Camera/photo counts are separate map markers created by app.js.
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

    // Arvika remains part of the route/itinerary, but is not a scenic painting on the overview map.
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
    const pin = document.createElement('span');
    pin.className = 'scenic-location-pin';
    pin.setAttribute('aria-label', title);
    pin.title = title;

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

    const cardWidth = 170;
    const targetX = dx < 0 ? dx + cardWidth : dx;
    const targetY = dy + 58;
    const length = Math.hypot(targetX, targetY);
    const angle = Math.atan2(targetY, targetX) * 180 / Math.PI;
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
