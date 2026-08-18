(() => {
  const layout = window.SCENIC_LAYOUT?.cards || {};
  const highlights = window.SCENIC_HIGHLIGHTS || [];
  const byTitle = new Map(highlights.map(h => [h.title, h]));
  const ART_COMMIT = '217d3e1e334bb45f76cde2498e5f59e4fabedc79';
  const RAW_BASE = `https://raw.githubusercontent.com/Pomeroi9Langmaid/RoadTrip-August-2026/${ART_COMMIT}/`;
  const CDN_BASE = `https://cdn.jsdelivr.net/gh/Pomeroi9Langmaid/RoadTrip-August-2026@${ART_COMMIT}/`;
  let mapHooked = false;
  let queued = false;

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

  function currentBase(root) {
    const cfg = layout[root.dataset.highlightId];
    if (!cfg) return null;
    return activeDay() === 'all' ? cfg.overviewOffset : cfg.dayOffset;
  }

  function setFallback(root) {
    const card = root.querySelector('.scenic-callout-card');
    const base = currentBase(root);
    if (!card || !base) return;
    const scale = scaleForViewport();
    const dx = Math.round(base[0] * scale);
    const dy = Math.round(base[1] * scale);
    root.classList.toggle('is-overview-callout', activeDay() === 'all');
    card.style.setProperty('--callout-x', `${dx}px`);
    card.style.setProperty('--callout-y', `${dy}px`);
    drawLeader(root, dx, dy);
  }

  function decorate(root) {
    if (!root || root.dataset.safeCalloutReady === '1') return;
    const title = root.querySelector('strong')?.textContent?.trim();
    if (!title) return;
    const highlight = byTitle.get(title);
    if (!highlight) return;
    if (highlight.id === 'arvika') {
      root.style.display = 'none';
      root.dataset.safeCalloutReady = '1';
      return;
    }
    const cfg = layout[highlight.id];
    if (!cfg) return;

    root.dataset.safeCalloutReady = '1';
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
    card.style.visibility = 'hidden';

    const img = document.createElement('img');
    img.className = 'scenic-watercolor';
    img.alt = title;
    img.decoding = 'async';
    img.loading = 'eager';
    img.draggable = false;

    let retried = false;
    const show = () => {
      card.style.visibility = 'visible';
      setFallback(root);
      queueLayout();
    };
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', () => {
      if (!retried) {
        retried = true;
        img.src = CDN_BASE + cfg.asset;
      } else {
        card.style.visibility = 'hidden';
      }
    });

    card.appendChild(img);
    root.append(pin, leader, card);
    setFallback(root);
    img.src = RAW_BASE + cfg.asset;
  }

  function rectMargin(r, m = 8) {
    return { left:r.left-m, top:r.top-m, right:r.right+m, bottom:r.bottom+m, width:r.width+m*2, height:r.height+m*2 };
  }

  function overlapArea(a,b) {
    const w = Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left));
    const h = Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    return w*h;
  }

  function isNamedFeature(f) {
    if (f?.layer?.type !== 'symbol') return false;
    const p = f.properties || {};
    return Object.keys(p).some(k => /^name($|[:_])/i.test(k) && p[k]);
  }

  function mapFeaturePenalty(rect) {
    const map = window.ROADTRIP_MAP;
    if (!map?.queryRenderedFeatures || !map.getContainer) return 0;
    const mr = map.getContainer().getBoundingClientRect();
    const x1 = Math.max(0, rect.left - mr.left);
    const y1 = Math.max(0, rect.top - mr.top);
    const x2 = Math.min(mr.width, rect.right - mr.left);
    const y2 = Math.min(mr.height, rect.bottom - mr.top);
    if (x2 <= x1 || y2 <= y1) return 0;
    try {
      const fs = map.queryRenderedFeatures([[x1,y1],[x2,y2]]) || [];
      let score = 0;
      fs.forEach(f => {
        const id = String(f?.layer?.id || '').toLowerCase();
        if (isNamedFeature(f)) score += 50000;
        if (id === 'trip-route-line' || id === 'trip-route-arrows') score += 15000;
      });
      return score;
    } catch { return 0; }
  }

  function fixedObstacles() {
    const els = [...document.querySelectorAll('.trip-marker:not(.marker-hidden),.media-marker:not(.marker-hidden),.map-tools,.route-chip,.maplibregl-ctrl-top-left,.itinerary-panel.is-open,.gallery-drawer.is-open')];
    return els.map(el => el.getBoundingClientRect()).filter(r => r.width>1 && r.height>1).map(r => rectMargin(r,8));
  }

  function candidateOffsets(base, scale) {
    const bx = Math.round((base?.[0] || 160) * scale);
    const by = Math.round((base?.[1] || -60) * scale);
    const side = bx < 0 ? -1 : 1;
    const xs = [Math.round(155*scale),Math.round(210*scale),Math.round(270*scale),Math.round(330*scale)];
    const ys = [-175,-125,-75,-20,40,95,145].map(v=>Math.round(v*scale));
    const out = [[bx,by]];
    ys.forEach(y => out.push([side*xs[1],y],[side*xs[2],y],[-side*xs[1],y]));
    out.push([side*xs[3],by],[-side*xs[2],by]);
    const seen = new Set();
    return out.filter(([x,y]) => {
      const k = `${x},${y}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }

  function drawLeader(root, dx, dy) {
    const leader = root.querySelector('.scenic-leader');
    const card = root.querySelector('.scenic-callout-card');
    if (!leader || !card || card.style.visibility === 'hidden' || root.classList.contains('marker-hidden')) return;
    const w = card.offsetWidth || 112;
    const h = card.offsetHeight || 84;
    const sx = -8, sy = 0;
    const cx = dx + w/2, cy = dy + h/2;
    let ex, ey;
    if (Math.abs(cx-sx) >= Math.abs(cy-sy)) {
      ex = cx > sx ? dx : dx+w;
      ey = Math.max(dy+8, Math.min(dy+h-8, sy));
    } else {
      ey = cy > sy ? dy : dy+h;
      ex = Math.max(dx+8, Math.min(dx+w-8, sx));
    }
    const vx = ex-sx, vy = ey-sy;
    leader.style.width = `${Math.hypot(vx,vy)}px`;
    leader.style.transform = `rotate(${Math.atan2(vy,vx)*180/Math.PI}deg)`;
  }

  function layoutAll() {
    const map = window.ROADTRIP_MAP;
    const mapEl = map?.getContainer?.() || document.querySelector('#map');
    if (!mapEl) return;
    const mapRect = mapEl.getBoundingClientRect();
    const roots = [...document.querySelectorAll('.scenic-anchor[data-highlight-id]')]
      .filter(r => !r.classList.contains('marker-hidden') && getComputedStyle(r).display !== 'none');
    const placed = [];
    const obstacles = fixedObstacles();
    const scale = scaleForViewport();
    const overview = activeDay() === 'all';

    roots.forEach(root => {
      root.classList.toggle('is-overview-callout', overview);
      const card = root.querySelector('.scenic-callout-card');
      const img = root.querySelector('.scenic-watercolor');
      const cfg = layout[root.dataset.highlightId];
      if (!card || !cfg || !img?.complete || !img.naturalWidth) {
        setFallback(root);
        return;
      }
      card.style.visibility = 'visible';
      const rr = root.getBoundingClientRect();
      const anchor = {x:rr.left-8,y:rr.top};
      const w = card.offsetWidth || (overview?112:132);
      const h = card.offsetHeight || (overview?84:99);
      const base = overview ? cfg.overviewOffset : cfg.dayOffset;
      let best = null;

      candidateOffsets(base, scale).forEach(([dx,dy], index) => {
        const rect = {left:anchor.x+dx,top:anchor.y+dy,right:anchor.x+dx+w,bottom:anchor.y+dy+h,width:w,height:h};
        let score = index*30;
        const margin = 12;
        if (rect.left < mapRect.left+margin) score += 1000000 + (mapRect.left+margin-rect.left)*5000;
        if (rect.top < mapRect.top+margin) score += 1000000 + (mapRect.top+margin-rect.top)*5000;
        if (rect.right > mapRect.right-margin) score += 1000000 + (rect.right-(mapRect.right-margin))*5000;
        if (rect.bottom > mapRect.bottom-margin) score += 1000000 + (rect.bottom-(mapRect.bottom-margin))*5000;
        placed.forEach(r => score += overlapArea(rectMargin(rect,12),r)*1000);
        obstacles.forEach(r => score += overlapArea(rectMargin(rect,8),r)*600);
        score += mapFeaturePenalty(rect);
        const targetX = Math.round((base?.[0] || dx)*scale);
        const targetY = Math.round((base?.[1] || dy)*scale);
        score += Math.hypot(dx-targetX,dy-targetY)*2;
        if (!best || score < best.score) best = {dx,dy,rect,score};
      });

      if (!best) { setFallback(root); return; }
      card.style.setProperty('--callout-x',`${best.dx}px`);
      card.style.setProperty('--callout-y',`${best.dy}px`);
      placed.push(rectMargin(best.rect,12));
      drawLeader(root,best.dx,best.dy);
    });
  }

  function sync(node=document) {
    if (node.matches?.('.scenic-marker')) decorate(node);
    node.querySelectorAll?.('.scenic-marker').forEach(decorate);
    document.querySelectorAll('.scenic-anchor[data-highlight-id]').forEach(setFallback);
    queueLayout();
  }

  function queueLayout() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      layoutAll();
    });
  }

  function hookMap() {
    const map = window.ROADTRIP_MAP;
    if (!map || mapHooked) return;
    mapHooked = true;
    map.on('moveend', queueLayout);
    map.on('zoomend', queueLayout);
    map.on('idle', queueLayout);
  }

  sync(); hookMap();
  window.addEventListener('roadtrip-map-ready',()=>{hookMap();queueLayout();});
  window.addEventListener('resize',queueLayout,{passive:true});
  document.addEventListener('click',e=>{ if (e.target.closest('.day-tab')) setTimeout(()=>{sync();queueLayout();},50); },true);
  new MutationObserver(records=>{
    let changed=false;
    records.forEach(record=>{
      if (record.type==='childList' && record.addedNodes.length) {
        changed=true;
        record.addedNodes.forEach(node=>{if(node.nodeType===1) sync(node);});
      }
    });
    if(changed) queueLayout();
  }).observe(document.documentElement,{childList:true,subtree:true});
})();