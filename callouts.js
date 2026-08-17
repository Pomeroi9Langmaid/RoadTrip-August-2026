(() => {
  const offsets = {
    'Kungälv': [42, -8],
    'Håverud Aqueduct': [58, -34],
    'Glaskogen Nature Reserve': [-190, 24],
    'Glava Glasbruk': [-198, -18],
    'Arvika': [62, -32],
    'Fryksdalen': [78, 28],
    'Tossebergsklätten': [76, -38],
    'Ritamäki finngård': [-220, -62],
    'Hovfjället': [68, -88],
    'Klarälvdalen': [104, 16],
    'Stockholm': [-196, -28],
    'Vadstena': [72, -42],
    'Gränna': [68, 24]
  };

  function decorate(root) {
    if (!root || root.dataset.calloutReady === '1') return;
    const title = root.querySelector('strong')?.textContent?.trim();
    if (!title || !offsets[title]) return;

    root.dataset.calloutReady = '1';
    root.classList.add('scenic-anchor');

    const [dx, dy] = offsets[title];
    const children = [...root.children];
    const card = document.createElement('div');
    card.className = 'scenic-callout-card';
    children.forEach(child => card.appendChild(child));

    const pin = document.createElement('span');
    pin.className = 'scenic-location-pin';
    pin.setAttribute('aria-hidden', 'true');

    const leader = document.createElement('span');
    leader.className = 'scenic-leader';

    card.style.setProperty('--callout-x', `${dx}px`);
    card.style.setProperty('--callout-y', `${dy}px`);

    const cardWidth = root.classList.contains('is-compact') ? 132 : 174;
    const targetX = dx < 0 ? dx + cardWidth : dx;
    const targetY = dy + 22;
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
