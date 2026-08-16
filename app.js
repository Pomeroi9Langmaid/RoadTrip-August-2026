(() => {
  const trip = window.TRIP_DATA;
  const scenicHighlights = window.SCENIC_HIGHLIGHTS || [];
  const accommodationLinks = window.ACCOMMODATION_LINKS || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const storageKey = 'andrew-lisa-roadtrip-edits-v2';
  const defaultEdits = {covers:{},orders:{},hidden:{},assignments:{},stopOverrides:{}};
  let edits = loadEdits();
  let editMode = false;
  let currentDay = 'all';
  let currentStopId = null;
  let scenicVisible = true;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let routeLayers = [];
  let walkLayers = [];
  const markerById = new Map();
  const scenicMarkerById = new Map();
  const originalStopForMedia = new Map();
  const mediaById = new Map();

  trip.stops.forEach(stop => stop.media.forEach(m => {
    originalStopForMedia.set(m.id, stop.id);
    mediaById.set(m.id, m);
  }));
  trip.unlocatedMedia.forEach(m => {
    originalStopForMedia.set(m.id, 'unlocated');
    mediaById.set(m.id, m);
  });

  // Canonical data corrections should win over stale browser edits that still say "unlocated".
  Object.entries(edits.assignments || {}).forEach(([id,target]) => {
    const base = originalStopForMedia.get(id);
    if (base && base !== 'unlocated' && target === 'unlocated') delete edits.assignments[id];
  });
  saveEdits();

  function loadEdits(){
    try { return {...defaultEdits, ...JSON.parse(localStorage.getItem(storageKey) || '{}')}; }
    catch { return JSON.parse(JSON.stringify(defaultEdits)); }
  }
  function saveEdits(){ localStorage.setItem(storageKey, JSON.stringify(edits)); }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function stopState(stop){ return {...stop,...(edits.stopOverrides[stop.id]||{})}; }
  function mediaStop(id){ return edits.assignments[id] ?? originalStopForMedia.get(id); }
  function getMedia(stopId, includeHidden=false){
    let items=[...mediaById.values()].filter(m=>mediaStop(m.id)===stopId);
    const order=edits.orders[stopId]||[];
    const pos=new Map(order.map((id,i)=>[id,i]));
    items.sort((a,b)=>(pos.has(a.id)?pos.get(a.id):9999)-(pos.has(b.id)?pos.get(b.id):9999) || String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));
    return includeHidden ? items : items.filter(m=>!edits.hidden[m.id]);
  }
  function coverFor(stop){
    const items=getMedia(stop.id);
    if(!items.length) return null;
    const desired=edits.covers[stop.id] || stop.cover;
    return items.find(m=>m.id===desired) || items[0];
  }
  function fmtTripDate(d){ return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00')); }
  function fmtDate(iso){ if(!iso) return 'date not recorded'; return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)); }
  function mapsUrlCoords(lat,lng){ return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }
  function mapsUrl(stop){ const s=stopState(stop); return mapsUrlCoords(s.lat,s.lng); }
  function mediaCountText(items){
    const p=items.filter(m=>m.type==='photo').length, v=items.filter(m=>m.type==='video').length;
    return [p?`${p} photo${p===1?'':'s'}`:'',v?`${v} video${v===1?'':'s'}`:''].filter(Boolean).join(' · ') || 'No media yet';
  }
  function iconSvg(type){
    const icons={
      home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M10 21v-6h4v6"/>',
      bed:'<path d="M3 19V8"/><path d="M3 14h18v5H3"/><path d="M7 14v-4h5a3 3 0 0 1 3 3v1"/><path d="M21 19v2M3 19v2"/>',
      camera:'<path d="M4 8h4l2-2h4l2 2h4v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>',
      walk:'<path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m10 7 3 2 2 4 3 1"/><path d="m13 9-3 5-4 2"/><path d="m10 14-1 7M14 13l3 7"/>',
      aqueduct:'<path d="M2 18c3-2 5-2 8 0s5 2 8 0 3-2 4-2"/><path d="M4 14V8h16v6"/><path d="M7 14V8m5 6V8m5 6V8"/><path d="M3 8h18"/>',
      forest:'<path d="m8 3-5 8h3l-4 7h12l-4-7h3z"/><path d="M8 18v3"/><path d="m17 5-3.5 6H16l-3 5h8l-3-5h2.5z"/><path d="M17 16v5"/>',
      heritage:'<path d="M3 21h18"/><path d="M5 18h14"/><path d="M6 18V9h12v9"/><path d="M4 9h16L12 3z"/><path d="M9 12v6m6-6v6"/>',
      town:'<path d="M4 21V9l5-3v15"/><path d="M9 21V5l6 3v13"/><path d="M15 21v-9l5-2v11"/><path d="M6 12h1m-1 3h1m5-5h1m-1 4h1m4 1h1"/>',
      valley:'<path d="M2 17 7 8l5 7 4-9 6 11"/><path d="M2 20c5-2 8-2 12 0 3 1 5 1 8 0"/>',
      viewpoint:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      mountain:'<path d="m2 20 7-12 3 5 3-8 7 15z"/><path d="m7 11 2-3 2 3m2-2 2-4 3 5"/>',
      river:'<path d="M4 3c7 4 9 7 4 10s-3 5 3 8"/><path d="M11 3c7 4 9 7 4 10s-3 5 3 8"/>',
      city:'<path d="M3 21h18"/><path d="M6 21V7h5v14M14 21V3h5v18"/><path d="M8 10h1m-1 3h1m-1 3h1m8-10h-1m1 4h-1m1 4h-1"/>',
      favourite:'<path d="m12 2 3 6 7 .9-5 4.8 1.3 7-6.3-3.3-6.3 3.3L7 13.7 2 8.9 9 8z"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[type]||icons.viewpoint}</svg>`;
  }
  function stopIconType(stop){ return stop.kind==='home'?'home':stop.kind==='overnight'?'bed':stop.kind==='walk'?'walk':'camera'; }

  function renderStats(distanceKm){
    const values=[['7','days'],['6','nights'],[distanceKm?Math.round(distanceKm).toLocaleString('en-GB'):'—','km'],[trip.stats.media,'media']];
    $('#stats').innerHTML=values.map(([v,l])=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }
  renderStats(null);

  const map=L.map('map',{zoomControl:true,scrollWheelZoom:true,preferCanvas:true}).setView([59.25,14],6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  function tripMarkerIcon(stop){
    const media=getMedia(stop.id); const count=media.length;
    return L.divIcon({className:'',iconSize:[40,40],iconAnchor:[20,38],popupAnchor:[0,-35],html:`<div class="trip-marker trip-marker--${stop.kind}">${iconSvg(stopIconType(stop))}${count?`<span class="trip-marker__count">${count}</span><span class="trip-marker__media">▣</span>`:''}</div>`});
  }
  function popupHtml(stop){
    const s=stopState(stop),media=getMedia(stop.id),cover=coverFor(stop),site=accommodationLinks[stop.id];
    return `<div class="popup-card">${cover?`<img src="${cover.src}" alt="">`:''}<h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.subtitle||'')}</p><p>${mediaCountText(media)}</p><div class="popup-actions">${media.length?`<button data-open-gallery="${stop.id}">Photos & videos</button>`:''}${site?`<a href="${site}" target="_blank" rel="noopener">Website ↗</a>`:''}<a href="${mapsUrl(stop)}" target="_blank" rel="noopener">Google Maps ↗</a></div></div>`;
  }
  function createTripMarkers(){
    trip.stops.forEach(stop=>{
      const s=stopState(stop);
      const marker=L.marker([s.lat,s.lng],{icon:tripMarkerIcon(stop),draggable:true,riseOnHover:true}).addTo(map).bindPopup(()=>popupHtml(stop));
      marker.dragging.disable();
      marker.on('click',()=>{currentStopId=stop.id;renderStops();});
      marker.on('dragend',()=>{
        const p=marker.getLatLng();
        edits.stopOverrides[stop.id]={...(edits.stopOverrides[stop.id]||{}),lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6)};
        saveEdits(); renderStops(); drawRoadRoute();
      });
      markerById.set(stop.id,marker);
    });
    map.on('popupopen',e=>{
      const btn=e.popup.getElement()?.querySelector('[data-open-gallery]');
      if(btn) btn.onclick=()=>openGallery(btn.dataset.openGallery);
    });
  }
  createTripMarkers();

  function scenicCardHtml(h){
    const type=h.type||'viewpoint';
    if(h.featured){
      return `<div class="scenic-card ${type==='favourite'?'scenic-card--favourite':''}" data-scenic-id="${h.id}"><span class="scenic-card__art">${iconSvg(type)}</span><span><strong>${escapeHtml(h.title)}</strong><small>${escapeHtml(h.subtitle||'')}</small></span></div>`;
    }
    return `<div class="scenic-badge" data-scenic-id="${h.id}"><span>${iconSvg(type)}</span><b>${escapeHtml(h.title)}</b></div>`;
  }
  function scenicPopupHtml(h){
    const actions=[];
    const linkedStop=h.stopId&&trip.stops.find(s=>s.id===h.stopId);
    if(linkedStop&&getMedia(linkedStop.id).length) actions.push(`<button data-open-gallery="${linkedStop.id}">Photos & videos</button>`);
    if(h.website) actions.push(`<a href="${h.website}" target="_blank" rel="noopener">Website ↗</a>`);
    actions.push(`<a href="${mapsUrlCoords(h.lat,h.lng)}" target="_blank" rel="noopener">Google Maps ↗</a>`);
    return `<div class="popup-card"><h3>${escapeHtml(h.title)}</h3><p>${escapeHtml(h.subtitle||'')}</p><div class="popup-actions">${actions.join('')}</div></div>`;
  }
  function createScenicMarkers(){
    scenicHighlights.forEach(h=>{
      const marker=L.marker([h.lat,h.lng],{interactive:true,zIndexOffset:h.featured?500:250,icon:L.divIcon({className:'',html:scenicCardHtml(h),iconSize:[1,1],iconAnchor:[0,16]})}).addTo(map).bindPopup(()=>scenicPopupHtml(h),{offset:[70,0]});
      marker.on('click',()=>{ if(h.stopId){ currentStopId=h.stopId; renderStops(); } });
      scenicMarkerById.set(h.id,marker);
    });
  }
  createScenicMarkers();

  function routeStops(){ return trip.stops.filter(s=>s.routeWaypoint).map(stopState); }
  function clearRoute(){ routeLayers.forEach(l=>map.removeLayer(l)); routeLayers=[]; }
  async function drawRoadRoute(){
    clearRoute();
    const pts=routeStops(); const coords=pts.map(s=>`${s.lng},${s.lat}`).join(';');
    $('#routeStatus').textContent='Reconstructing the road route…';
    try{
      const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
      if(!r.ok) throw new Error(String(r.status));
      const j=await r.json(); if(j.code!=='Ok'||!j.routes?.[0]) throw new Error(j.code||'no route');
      const route=j.routes[0];
      const halo=L.geoJSON(route.geometry,{style:{color:'#fff3d9',weight:10,opacity:.9}}).addTo(map).bringToBack();
      const line=L.geoJSON(route.geometry,{style:{color:'#c9692f',weight:5,opacity:.96}}).addTo(map).bringToBack();
      routeLayers=[halo,line];
      renderStats(route.distance/1000);
      $('#routeStatus').textContent=`Approx. road route · ${Math.round(route.distance/1000).toLocaleString('en-GB')} km`;
    }catch(err){
      const halo=L.polyline(pts.map(s=>[s.lat,s.lng]),{color:'#fff3d9',weight:9,opacity:.9}).addTo(map).bringToBack();
      const line=L.polyline(pts.map(s=>[s.lat,s.lng]),{color:'#c9692f',weight:4,opacity:.85,dashArray:'8 7'}).addTo(map).bringToBack();
      routeLayers=[halo,line]; $('#routeStatus').textContent='Ordered trip anchors · road router unavailable';
    }
    drawWalkRoutes();
  }
  function drawWalkRoutes(){
    walkLayers.forEach(l=>map.removeLayer(l)); walkLayers=[];
    (trip.walkRoutes||[]).forEach(w=>{
      const halo=L.polyline(w.points,{color:'#fff8e9',weight:7,opacity:.85}).addTo(map);
      const line=L.polyline(w.points,{color:'#765378',weight:3,dashArray:'4 7',opacity:.95}).addTo(map);
      walkLayers.push(halo,line);
    });
  }
  drawRoadRoute();

  function fitRoute(){
    const visible=[...markerById.values()].filter(m=>map.hasLayer(m));
    const group=L.featureGroup(visible.length?visible:[...markerById.values()]);
    map.fitBounds(group.getBounds().pad(.09));
  }
  function fitDay(day){
    const relevant=trip.stops.filter(s=>s.day===day || (s.kind==='overnight'&&s.day===day-1)).map(s=>markerById.get(s.id)).filter(Boolean);
    if(relevant.length) map.fitBounds(L.featureGroup(relevant).getBounds().pad(.45));
  }
  setTimeout(fitRoute,250);

  function renderDayTabs(){
    const days=[...new Set(trip.stops.map(s=>s.day))].sort((a,b)=>a-b);
    $('#dayTabs').innerHTML=`<button class="day-tab ${currentDay==='all'?'is-active':''}" data-day="all">All</button>`+days.map(d=>{
      const stop=trip.stops.find(s=>s.day===d); return `<button class="day-tab ${currentDay===d?'is-active':''}" data-day="${d}">Day ${d}<span>${fmtTripDate(stop.date)}</span></button>`;
    }).join('');
    $$('.day-tab').forEach(b=>b.onclick=()=>{
      currentDay=b.dataset.day==='all'?'all':+b.dataset.day;
      renderDayTabs(); renderStops(); filterMapLayers(); currentDay==='all'?fitRoute():fitDay(currentDay);
    });
  }
  function filterMapLayers(){
    trip.stops.forEach(s=>{
      const m=markerById.get(s.id); const show=currentDay==='all'||s.day===currentDay||(s.kind==='overnight'&&s.day===currentDay-1);
      if(show&&!map.hasLayer(m))m.addTo(map); else if(!show&&map.hasLayer(m))map.removeLayer(m);
    });
    scenicHighlights.forEach(h=>{
      const m=scenicMarkerById.get(h.id); const show=scenicVisible&&(currentDay==='all'||h.day===currentDay);
      if(show&&!map.hasLayer(m))m.addTo(map); else if(!show&&map.hasLayer(m))map.removeLayer(m);
    });
  }

  function stopCardHtml(stop){
    const s=stopState(stop),media=getMedia(stop.id),cover=coverFor(stop),site=accommodationLinks[stop.id];
    const thumb=cover?`<img class="stop-thumb" src="${cover.src}" alt="">`:`<div class="stop-icon">${iconSvg(stopIconType(stop))}</div>`;
    const links=`<div class="stop-links">${site?`<a href="${site}" target="_blank" rel="noopener" onclick="event.stopPropagation()">website ↗</a>`:''}<a href="${mapsUrl(stop)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">map ↗</a>${editMode?`<a href="#" data-rename="${stop.id}" onclick="event.stopPropagation();return false">rename</a>`:''}</div>`;
    return `<article class="stop-card ${currentStopId===stop.id?'is-active':''}" data-stop="${stop.id}">${thumb}<div><h3>${escapeHtml(s.title)}</h3><p>Day ${stop.day} · ${escapeHtml(s.subtitle||fmtTripDate(stop.date))}</p>${links}</div>${media.length?`<span class="count-pill">▣ ${media.length}</span>`:''}</article>`;
  }
  function renderStops(){
    const stops=trip.stops.filter(s=>currentDay==='all'||s.day===currentDay);
    $('#stopList').innerHTML=stops.map(stopCardHtml).join('');
    $$('.stop-card').forEach(card=>card.onclick=e=>{
      if(e.target.closest('a')) return;
      const id=card.dataset.stop,stop=trip.stops.find(s=>s.id===id),marker=markerById.get(id);
      currentStopId=id;renderStops();
      map.flyTo(marker.getLatLng(),Math.max(map.getZoom(),9),{duration:.7}); marker.openPopup();
      if(getMedia(id).length) openGallery(id);
    });
    $$('[data-rename]').forEach(a=>a.onclick=e=>{e.preventDefault();e.stopPropagation();renameStop(a.dataset.rename);});
  }
  function renameStop(id){
    const stop=trip.stops.find(s=>s.id===id),value=prompt('Place name',stopState(stop).title);
    if(value&&value.trim()){
      edits.stopOverrides[id]={...(edits.stopOverrides[id]||{}),title:value.trim()};saveEdits();renderStops();markerById.get(id)?.setPopupContent(()=>popupHtml(stop));
    }
  }
  renderDayTabs();renderStops();

  function mediaElement(m,hero=false){
    if(m.type==='video') return `<video src="${m.src}" ${hero?'controls playsinline':'muted playsinline'} poster="${m.thumb}"></video>`;
    return `<img src="${m.src}" alt="${escapeHtml(m.caption||m.filename)}" loading="${hero?'eager':'lazy'}">`;
  }
  function openGallery(id){
    const stop=trip.stops.find(s=>s.id===id); if(!stop)return;
    currentStopId=id;renderStops();
    const s=stopState(stop),items=getMedia(id,editMode),cover=coverFor(stop),site=accommodationLinks[id];
    $('#galleryKicker').textContent=`DAY ${stop.day} · ${fmtTripDate(stop.date).toUpperCase()}`;
    $('#galleryTitle').textContent=s.title;
    $('#galleryMeta').textContent=[s.subtitle,s.address,mediaCountText(getMedia(id))].filter(Boolean).join(' · ');
    $('#galleryMapsLink').href=mapsUrl(stop);
    const siteLink=$('#galleryWebsiteLink'); siteLink.hidden=!site; if(site)siteLink.href=site;
    $('#galleryHero').innerHTML=cover?mediaElement(cover,true):'<div class="stop-icon" style="width:100%;height:100%">No media yet</div>';
    renderGalleryGrid(id,items);
    $('#galleryDrawer').classList.add('is-open'); $('#galleryDrawer').setAttribute('aria-hidden','false');
    $('#journeyPanel').classList.add('is-hidden');
  }
  function closeGallery(){ $('#galleryDrawer').classList.remove('is-open');$('#galleryDrawer').setAttribute('aria-hidden','true'); }
  function mediaTools(m,stopId){
    const options=[`<option value="${stopId}">Move to…</option>`,...trip.stops.filter(s=>s.id!==stopId).map(s=>`<option value="${s.id}">${escapeHtml(stopState(s).title)}</option>`),'<option value="unlocated">Unassigned</option>'].join('');
    return `<div class="media-tools"><button class="drag-handle" title="Drag to reorder">↕</button><button data-cover="${m.id}">★ cover</button><button data-hide="${m.id}">${edits.hidden[m.id]?'restore':'hide'}</button><select data-move="${m.id}">${options}</select></div>`;
  }
  function renderGalleryGrid(stopId,items){
    const stop=trip.stops.find(s=>s.id===stopId),cover=stop?coverFor(stop):null;
    $('#galleryGrid').innerHTML=items.map(m=>`<div class="media-tile ${cover?.id===m.id?'is-cover':''} ${edits.hidden[m.id]?'hidden-media':''}" draggable="${editMode}" data-media="${m.id}">${mediaElement(m,false)}${m.type==='video'?`<span class="media-badge">▶ ${m.duration?Math.round(m.duration)+'s':'video'}</span>`:cover?.id===m.id?'<span class="media-badge">★ cover</span>':''}${editMode?mediaTools(m,stopId):''}</div>`).join('');
    $$('.media-tile',$('#galleryGrid')).forEach(tile=>{
      tile.onclick=e=>{if(e.target.closest('.media-tools'))return;openLightbox(stopId,tile.dataset.media);};
      if(editMode){
        tile.ondragstart=e=>e.dataTransfer.setData('text/plain',tile.dataset.media);
        tile.ondragover=e=>e.preventDefault();
        tile.ondrop=e=>{e.preventDefault();reorder(stopId,e.dataTransfer.getData('text/plain'),tile.dataset.media);};
      }
    });
    $$('[data-cover]',$('#galleryGrid')).forEach(b=>b.onclick=()=>{edits.covers[stopId]=b.dataset.cover;saveEdits();openGallery(stopId);renderStops();refreshMarker(stopId);});
    $$('[data-hide]',$('#galleryGrid')).forEach(b=>b.onclick=()=>{edits.hidden[b.dataset.hide]=!edits.hidden[b.dataset.hide];saveEdits();openGallery(stopId);renderStops();refreshMarker(stopId);});
    $$('[data-move]',$('#galleryGrid')).forEach(s=>s.onchange=()=>moveMedia(s.dataset.move,s.value,stopId));
  }
  function reorder(stopId,fromId,toId){
    const ids=getMedia(stopId,true).map(m=>m.id),a=ids.indexOf(fromId),b=ids.indexOf(toId); if(a<0||b<0)return;
    ids.splice(b,0,ids.splice(a,1)[0]);edits.orders[stopId]=ids;saveEdits();openGallery(stopId);renderStops();
  }
  function moveMedia(id,target,fromStop){
    edits.assignments[id]=target;saveEdits();renderStops();renderUnassigned();refreshMarker(fromStop);if(target!=='unlocated')refreshMarker(target);
    if(fromStop!=='unlocated')openGallery(fromStop);
  }
  function refreshMarker(id){
    const stop=trip.stops.find(s=>s.id===id),marker=markerById.get(id); if(!stop||!marker)return;
    marker.setIcon(tripMarkerIcon(stop));marker.setPopupContent(()=>popupHtml(stop));
  }

  function renderUnassigned(){
    const items=getMedia('unlocated',true),tray=$('#adminTray');
    tray.hidden=!editMode; $('#unassignedCount').textContent=`${items.length} unresolved`;
    $('#unassignedGrid').innerHTML=items.map(m=>`<div class="media-tile" data-media="${m.id}">${mediaElement(m,false)}${editMode?mediaTools(m,'unlocated'):''}</div>`).join('');
    if(editMode){
      $$('[data-move]',$('#unassignedGrid')).forEach(s=>s.onchange=()=>moveMedia(s.dataset.move,s.value,'unlocated'));
      $$('.media-tile',$('#unassignedGrid')).forEach(t=>t.onclick=e=>{if(e.target.closest('.media-tools'))return;openLightbox('unlocated',t.dataset.media);});
    }
  }
  renderUnassigned();

  function openLightbox(stopId,id){
    lightboxItems=getMedia(stopId).filter(m=>!edits.hidden[m.id]);lightboxIndex=Math.max(0,lightboxItems.findIndex(m=>m.id===id));showLightbox();
  }
  function showLightbox(){
    const m=lightboxItems[lightboxIndex]; if(!m)return;
    $('#lightboxStage').innerHTML=m.type==='video'?`<video src="${m.src}" controls autoplay playsinline poster="${m.thumb}"></video>`:`<img src="${m.src}" alt="">`;
    $('#lightboxCaption').textContent=`${m.filename} · ${fmtDate(m.capturedAt)}`;
    $('#lightbox').classList.add('is-open');$('#lightbox').setAttribute('aria-hidden','false');
  }
  function closeLightbox(){ $('#lightboxStage').innerHTML='';$('#lightbox').classList.remove('is-open');$('#lightbox').setAttribute('aria-hidden','true'); }
  $('#prevMedia').onclick=()=>{lightboxIndex=(lightboxIndex-1+lightboxItems.length)%lightboxItems.length;showLightbox();};
  $('#nextMedia').onclick=()=>{lightboxIndex=(lightboxIndex+1)%lightboxItems.length;showLightbox();};
  $('#closeLightbox').onclick=closeLightbox;
  $('#closeGallery').onclick=closeGallery;

  $('#fitRoute').onclick=fitRoute;
  $('#panelToggle').onclick=()=>$('#journeyPanel').classList.toggle('is-hidden');
  $('#closePanel').onclick=()=>$('#journeyPanel').classList.add('is-hidden');
  $('#highlightToggle').onclick=()=>{
    scenicVisible=!scenicVisible;$('#highlightToggle').setAttribute('aria-pressed',String(scenicVisible));$('#highlightToggle').textContent=scenicVisible?'✦ Scenic layer':'○ Scenic layer';filterMapLayers();
  };
  $('#legendToggle').onclick=()=>$('#mapLegend').classList.toggle('is-collapsed');
  $('#fullscreenToggle').onclick=async()=>{
    try{ if(!document.fullscreenElement) await $('#mapStage').requestFullscreen(); else await document.exitFullscreen(); }catch{}
  };
  document.addEventListener('fullscreenchange',()=>setTimeout(()=>{map.invalidateSize();currentDay==='all'?fitRoute():fitDay(currentDay);},120));

  $('#editToggle').onclick=()=>{
    editMode=!editMode;document.body.classList.toggle('editing',editMode);$('#editToggle').setAttribute('aria-pressed',String(editMode));$('#editToggle').textContent=editMode?'Finish editing':'Edit';
    markerById.forEach(m=>editMode?m.dragging.enable():m.dragging.disable());renderStops();renderUnassigned();
    if(currentStopId&&$('#galleryDrawer').classList.contains('is-open'))openGallery(currentStopId);
  };
  $('#exportEdits').onclick=()=>{
    const blob=new Blob([JSON.stringify(edits,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='roadtrip-edits.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  };
  $('#resetEdits').onclick=()=>{ if(confirm('Reset browser edits and return to the published trip data?')){localStorage.removeItem(storageKey);location.reload();} };

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeLightbox();closeGallery();}
    if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowRight')$('#nextMedia').click();
    if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowLeft')$('#prevMedia').click();
  });
})();
