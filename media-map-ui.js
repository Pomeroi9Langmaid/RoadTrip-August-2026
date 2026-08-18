(() => {
  const trip = window.TRIP_DATA;
  const map = window.ROADTRIP_MAP;
  if (!trip || !map || !window.maplibregl) return;

  const exactMarkers = new Map();
  let layingOut = false;
  let queued = false;

  function cameraSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h4l2-2h4l2 2h4v11H4z"/><circle cx="12" cy="13.5" r="3.2"/></svg>';
  }

  function activeDay() {
    return document.querySelector('.day-tab.is-active')?.dataset.day || 'all';
  }

  function finiteGps(item) {
    return Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng));
  }

  // Pick one actually recorded camera/phone coordinate for the group. We use the
  // recorded point closest to the group's centre rather than inventing a centroid.
  function representativeGps(stop) {
    const points = (stop.media || []).filter(finiteGps);
    if (!points.length) {
      return { lat:Number(stop.lat), lng:Number(stop.lng), confidence:'confirmed-stop' };
    }
    if (points.length === 1) {
      return { lat:Number(points[0].lat), lng:Number(points[0].lng), confidence:'recorded-gps' };
    }
    const meanLat = points.reduce((sum,p)=>sum+Number(p.lat),0) / points.length;
    const cos = Math.cos(meanLat * Math.PI / 180);
    let best = null;
    points.forEach(candidate => {
      const clat = Number(candidate.lat), clng = Number(candidate.lng);
      let score = 0;
      points.forEach(other => {
        const dy = Number(other.lat) - clat;
        const dx = (Number(other.lng) - clng) * cos;
        score += dx*dx + dy*dy;
      });
      if (!best || score < best.score) best = {lat:clat,lng:clng,score};
    });
    return { lat:best.lat, lng:best.lng, confidence:'recorded-gps' };
  }

  // Important: once an original camera pill is promoted to a hidden source marker,
  // we must still be able to find it on every later sync. The previous selector
  // excluded .media-marker-source, causing the replacement GPS marker to disappear.
  function sourceMarkerFor(stop) {
    return [...document.querySelectorAll('.media-marker')]
      .find(el => el.dataset.mediaStopId === stop.id || String(el.title || '').endsWith(`from ${stop.title}`));
  }

  function makeExactMarker(stop) {
    const gps = representativeGps(stop);
    const root = document.createElement('div');
    root.className = 'media-location-anchor';
    root.dataset.stopId = stop.id;
    root.dataset.day = stop.day;
    root.dataset.locationConfidence = gps.confidence;

    const pin = document.createElement('span');
    pin.className = 'media-location-pin';
    pin.title = gps.confidence === 'recorded-gps' ? 'Recorded photo/video GPS location' : 'Confirmed trip location';

    const leader = document.createElement('span');
    leader.className = 'media-location-leader';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'media-location-label';
    label.innerHTML = `${cameraSvg()}<span class="media-location-count">0</span>`;
    label.addEventListener('click', event => {
      event.stopPropagation();
      const currentSource = sourceMarkerFor(stop);
      if (currentSource) currentSource.click();
    });

    root.append(pin, leader, label);
    const marker = new maplibregl.Marker({element:root,anchor:'center',offset:[0,0]})
      .setLngLat([gps.lng,gps.lat])
      .addTo(map);

    const record = {marker,root,label,stopId:stop.id,gps};
    exactMarkers.set(stop.id, record);
    return record;
  }

  function syncMarkers() {
    (trip.stops || []).forEach(stop => {
      const source = sourceMarkerFor(stop);
      let record = exactMarkers.get(stop.id);

      if (!source) {
        if (record) record.root.classList.add('marker-hidden');
        return;
      }

      source.dataset.mediaStopId = stop.id;
      source.classList.add('media-marker-source');
      source.setAttribute('aria-hidden','true');
      if (!record) record = makeExactMarker(stop);

      const count = source.querySelector('span')?.textContent?.trim() || String((stop.media || []).length);
      record.label.querySelector('.media-location-count').textContent = count;
      record.label.title = source.title || `Open media from ${stop.title}`;

      const day = activeDay();
      const visible = day === 'all' || Number(day) === Number(stop.day);
      record.root.classList.toggle('marker-hidden', !visible);
    });
  }

  function rectWithMargin(rect, margin=7) {
    return {left:rect.left-margin,top:rect.top-margin,right:rect.right+margin,bottom:rect.bottom+margin,width:rect.width+margin*2,height:rect.height+margin*2};
  }

  function overlapArea(a,b) {
    const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
    const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    return w*h;
  }

  function isNamedMapFeature(feature) {
    if (feature?.layer?.type !== 'symbol') return false;
    const props=feature.properties||{};
    return Object.keys(props).some(key=>/^name($|[:_])/i.test(key)&&props[key]);
  }

  function mapPenalty(rect) {
    if (!map.queryRenderedFeatures) return 0;
    const mr=map.getContainer().getBoundingClientRect();
    const x1=Math.max(0,rect.left-mr.left), y1=Math.max(0,rect.top-mr.top);
    const x2=Math.min(mr.width,rect.right-mr.left), y2=Math.min(mr.height,rect.bottom-mr.top);
    if(x2<=x1||y2<=y1) return 0;
    try {
      const features=map.queryRenderedFeatures([[x1,y1],[x2,y2]])||[];
      let penalty=0;
      features.forEach(feature=>{
        const id=String(feature?.layer?.id||'').toLowerCase();
        if(isNamedMapFeature(feature)) penalty+=1000000;
        if(id==='trip-route-line'||id==='trip-route-arrows') penalty+=16000;
      });
      return penalty;
    } catch { return 0; }
  }

  function fixedObstacles() {
    const selectors=[
      '.stay-marker__badge',
      '.scenic-location-pin',
      '.scenic-callout-card',
      '.maplibregl-ctrl-top-left',
      '.map-tools',
      '.route-chip',
      '.itinerary-panel.is-open',
      '.gallery-drawer.is-open'
    ];
    return [...document.querySelectorAll(selectors.join(','))]
      .map(el=>el.getBoundingClientRect())
      .filter(r=>r.width>1&&r.height>1)
      .map(r=>rectWithMargin(r,6));
  }

  function candidates(stopId) {
    const preferred={
      'haverud':[22,-44],
      'duse-udde':[34,22],
      'glava':[32,22],
      'torsby':[34,20],
      'hallagarden':[34,20],
      'stockholm':[34,-48],
      'vadstena':[34,20],
      'granna':[34,20]
    }[stopId]||[24,-44];
    const [px,py]=preferred;
    return [
      [px,py],[24,-44],[24,18],[-86,-44],[-86,18],[58,-68],[58,34],[-118,-68],[-118,34],[-32,-70],[-32,34],[92,-22],[-138,-22]
    ].filter((v,i,a)=>a.findIndex(o=>o[0]===v[0]&&o[1]===v[1])===i);
  }

  function drawLeader(record,dx,dy) {
    const label=record.label, leader=record.root.querySelector('.media-location-leader');
    if(!label||!leader) return;
    const w=label.offsetWidth||52, h=label.offsetHeight||31;
    const cx=dx+w/2, cy=dy+h/2;
    let ex,ey;
    if(Math.abs(cx)>=Math.abs(cy)){
      ex=cx>0?dx:dx+w;
      ey=Math.max(dy+6,Math.min(dy+h-6,0));
    }else{
      ey=cy>0?dy:dy+h;
      ex=Math.max(dx+6,Math.min(dx+w-6,0));
    }
    leader.style.width=`${Math.hypot(ex,ey)}px`;
    leader.style.transform=`rotate(${Math.atan2(ey,ex)*180/Math.PI}deg)`;
  }

  function layoutMarkers() {
    if(layingOut) return;
    layingOut=true;
    try{
      const mapRect=map.getContainer().getBoundingClientRect();
      const obstacles=fixedObstacles();
      const placed=[];
      [...exactMarkers.values()]
        .filter(record=>!record.root.classList.contains('marker-hidden'))
        .forEach(record=>{
          const rr=record.root.getBoundingClientRect();
          const anchor={x:rr.left,y:rr.top};
          const w=record.label.offsetWidth||52, h=record.label.offsetHeight||31;
          let best=null;
          candidates(record.stopId).forEach(([dx,dy],index)=>{
            const rect={left:anchor.x+dx,top:anchor.y+dy,right:anchor.x+dx+w,bottom:anchor.y+dy+h,width:w,height:h};
            let score=index*80+Math.hypot(dx,dy);
            if(rect.left<mapRect.left+10||rect.top<mapRect.top+10||rect.right>mapRect.right-10||rect.bottom>mapRect.bottom-10) score+=5000000;
            score+=mapPenalty(rectWithMargin(rect,5));
            obstacles.forEach(o=>{score+=overlapArea(rectWithMargin(rect,5),o)*600;});
            placed.forEach(o=>{score+=overlapArea(rectWithMargin(rect,7),o)*1000;});
            if(!best||score<best.score) best={dx,dy,rect,score};
          });
          if(!best) return;
          record.label.style.setProperty('--media-x',`${best.dx}px`);
          record.label.style.setProperty('--media-y',`${best.dy}px`);
          placed.push(rectWithMargin(best.rect,7));
          requestAnimationFrame(()=>drawLeader(record,best.dx,best.dy));
        });
    } finally { layingOut=false; }
  }

  function apply() {
    syncMarkers();
    requestAnimationFrame(layoutMarkers);
  }

  function queueApply() {
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  }

  map.on('moveend',queueApply);
  map.on('zoomend',queueApply);
  map.on('idle',queueApply);
  window.addEventListener('resize',queueApply,{passive:true});
  new MutationObserver(queueApply).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  apply();
})();