(() => {
  const trip = window.TRIP_DATA;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const storageKey = 'andrew-lisa-roadtrip-edits-v1';
  const defaultEdits = { covers:{}, orders:{}, hidden:{}, assignments:{}, stopOverrides:{} };
  let edits = loadEdits();
  let editMode = false;
  let currentDay = 'all';
  let currentStopId = null;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let routeLayer = null;
  let walkLayers = [];
  const markerById = new Map();

  const originalStopForMedia = new Map();
  const mediaById = new Map();
  trip.stops.forEach(stop => stop.media.forEach(m => { originalStopForMedia.set(m.id, stop.id); mediaById.set(m.id, m); }));
  trip.unlocatedMedia.forEach(m => { originalStopForMedia.set(m.id, 'unlocated'); mediaById.set(m.id, m); });

  function loadEdits(){ try { return {...defaultEdits, ...JSON.parse(localStorage.getItem(storageKey) || '{}')}; } catch { return structuredClone(defaultEdits); } }
  function saveEdits(){ localStorage.setItem(storageKey, JSON.stringify(edits)); }
  function stopState(stop){ const o=edits.stopOverrides[stop.id]||{}; return {...stop,...o}; }
  function mediaStop(id){ return edits.assignments[id] ?? originalStopForMedia.get(id); }
  function getMedia(stopId, includeHidden=false){
    let items=[...mediaById.values()].filter(m => mediaStop(m.id)===stopId);
    const order=edits.orders[stopId]||[];
    const idx=new Map(order.map((id,i)=>[id,i]));
    items.sort((a,b)=>(idx.has(a.id)?idx.get(a.id):9999)-(idx.has(b.id)?idx.get(b.id):9999) || String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));
    if(!includeHidden) items=items.filter(m=>!edits.hidden[m.id]);
    return items;
  }
  function coverFor(stop){
    const items=getMedia(stop.id);
    if(!items.length) return null;
    const desired=edits.covers[stop.id] || stop.cover;
    return items.find(m=>m.id===desired) || items[0];
  }
  function fmtDate(iso){ if(!iso) return 'Date unknown'; const d=new Date(iso); return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d); }
  function fmtTripDate(d){ return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00')); }
  function mapsUrl(s){ const st=stopState(s); return `https://www.google.com/maps/search/?api=1&query=${st.lat},${st.lng}`; }
  function kindIcon(kind){ return kind==='home'?'⌂':kind==='overnight'?'✦':kind==='walk'?'↟':'•'; }
  function mediaCountText(items){ const p=items.filter(m=>m.type==='photo').length, v=items.filter(m=>m.type==='video').length; return [p?`${p} photo${p===1?'':'s'}`:'',v?`${v} video${v===1?'':'s'}`:''].filter(Boolean).join(' · ') || 'No media yet'; }

  function renderStats(distanceKm){
    const s=trip.stats;
    const stats=[['7','days'],['6','nights'],[distanceKm?Math.round(distanceKm).toLocaleString('en-GB'):'—','km'],[s.photos,'images'],[s.videos,'videos'],[s.gpsMedia,'GPS-tagged']];
    $('#stats').innerHTML=stats.map(([a,b])=>`<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('');
  }
  renderStats(null);

  const map=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([59.25,14.0],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);

  function markerIcon(stop){
    const cls=stop.kind==='overnight'?'overnight':stop.kind;
    return L.divIcon({className:'',html:`<div class="marker-pin marker-${cls}"><span>${kindIcon(stop.kind)}</span></div>`,iconSize:[32,32],iconAnchor:[16,31],popupAnchor:[0,-28]});
  }
  function popupHtml(stop){
    const s=stopState(stop), media=getMedia(stop.id), cover=coverFor(stop);
    return `<div class="popup-card">${cover?`<img src="${cover.thumb}" alt="">`:''}<h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.subtitle||'')}</p><p>${mediaCountText(media)}</p><div class="popup-actions">${media.length?`<button data-open-gallery="${stop.id}">Open gallery</button>`:''}<a href="${mapsUrl(stop)}" target="_blank" rel="noopener">Google Maps ↗</a></div></div>`;
  }
  function createMarkers(){
    trip.stops.forEach(stop=>{
      const s=stopState(stop);
      const marker=L.marker([s.lat,s.lng],{icon:markerIcon(s),draggable:true}).addTo(map).bindPopup(()=>popupHtml(stop));
      marker.dragging.disable();
      marker.on('click',()=>{ currentStopId=stop.id; highlightStop(); });
      marker.on('dragend',()=>{ const p=marker.getLatLng(); edits.stopOverrides[stop.id]={...(edits.stopOverrides[stop.id]||{}),lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6)}; saveEdits(); renderStops(); drawRoadRoute(); });
      markerById.set(stop.id,marker);
    });
    map.on('popupopen',e=>{ const btn=e.popup.getElement()?.querySelector('[data-open-gallery]'); if(btn) btn.onclick=()=>openGallery(btn.dataset.openGallery); });
  }
  createMarkers();

  function routeStops(){ return trip.stops.filter(s=>s.routeWaypoint).map(stopState); }
  async function drawRoadRoute(){
    if(routeLayer){ map.removeLayer(routeLayer); routeLayer=null; }
    const pts=routeStops();
    const coords=pts.map(s=>`${s.lng},${s.lat}`).join(';');
    $('#routeStatus').textContent='Reconstructing road route…';
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const r=await fetch(url); if(!r.ok) throw new Error('routing response '+r.status); const j=await r.json(); if(j.code!=='Ok'||!j.routes?.[0]) throw new Error(j.code||'no route');
      const route=j.routes[0];
      routeLayer=L.geoJSON(route.geometry,{style:{color:'#b85f32',weight:5,opacity:.84}}).addTo(map).bringToBack();
      const km=route.distance/1000; renderStats(km); $('#routeStatus').textContent=`Road reconstruction: approximately ${Math.round(km).toLocaleString('en-GB')} km`;
    }catch(err){
      routeLayer=L.polyline(pts.map(s=>[s.lat,s.lng]),{color:'#b85f32',weight:4,opacity:.65,dashArray:'8 9'}).addTo(map).bringToBack();
      $('#routeStatus').textContent='Road router unavailable — showing the ordered trip anchors.'; console.warn(err);
    }
    drawWalkRoutes();
  }
  function drawWalkRoutes(){ walkLayers.forEach(l=>map.removeLayer(l)); walkLayers=[]; trip.walkRoutes.forEach(w=>{ const l=L.polyline(w.points,{color:'#725583',weight:4,dashArray:'4 7',opacity:.9}).addTo(map); walkLayers.push(l); }); }
  drawRoadRoute();

  function fitRoute(){ const layers=[...markerById.values()]; if(routeLayer) layers.push(routeLayer); const group=L.featureGroup(layers); map.fitBounds(group.getBounds().pad(.08)); }
  setTimeout(fitRoute,200);
  $('#fitRoute').onclick=fitRoute;
  $('#jumpToMap').onclick=()=>$('#mapSection').scrollIntoView({behavior:'smooth'});

  function renderDayTabs(){
    const days=[...new Set(trip.stops.map(s=>s.day))];
    $('#dayTabs').innerHTML=[`<button class="day-tab ${currentDay==='all'?'is-active':''}" data-day="all">All days</button>`,...days.map(d=>`<button class="day-tab ${currentDay===d?'is-active':''}" data-day="${d}">Day ${d}</button>`)].join('');
    $$('.day-tab').forEach(b=>b.onclick=()=>{ currentDay=b.dataset.day==='all'?'all':+b.dataset.day; renderDayTabs(); renderStops(); filterMarkers(); if(currentDay!=='all') fitDay(currentDay); else fitRoute(); });
  }
  function fitDay(day){ const relevant=trip.stops.filter(s=>s.day===day || (s.kind==='overnight'&&s.day===day-1)); const group=L.featureGroup(relevant.map(s=>markerById.get(s.id))); if(relevant.length) map.fitBounds(group.getBounds().pad(.35)); }
  function filterMarkers(){ trip.stops.forEach(s=>{ const m=markerById.get(s.id); const show=currentDay==='all'||s.day===currentDay||(s.kind==='overnight'&&s.day===currentDay-1); if(show&&!map.hasLayer(m))m.addTo(map); if(!show&&map.hasLayer(m))map.removeLayer(m); }); }
  function renderStops(){
    const stops=trip.stops.filter(s=>currentDay==='all'||s.day===currentDay);
    $('#stopList').innerHTML=stops.map(stop=>{ const s=stopState(stop), media=getMedia(stop.id), cover=coverFor(stop); return `<article class="stop-card ${currentStopId===stop.id?'is-active':''}" data-stop="${stop.id}">${cover?`<img class="stop-thumb" src="${cover.thumb}" alt="">`:`<div class="stop-icon">${kindIcon(stop.kind)}</div>`}<div><h3>${escapeHtml(s.title)}</h3><p>Day ${stop.day} · ${escapeHtml(s.subtitle||fmtTripDate(stop.date))}</p>${editMode?`<p><button class="inline-edit" data-rename="${stop.id}">rename</button> · drag pin on map</p>`:''}</div>${media.length?`<span class="count-pill">${media.length}</span>`:''}</article>`; }).join('');
    $$('.stop-card').forEach(card=>{ card.onclick=(e)=>{ if(e.target.closest('[data-rename]'))return; const id=card.dataset.stop; currentStopId=id; highlightStop(); const marker=markerById.get(id); map.setView(marker.getLatLng(),Math.max(map.getZoom(),10),{animate:true}); marker.openPopup(); if(getMedia(id).length) openGallery(id); }; });
    $$('[data-rename]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();renameStop(btn.dataset.rename)});
  }
  function highlightStop(){ renderStops(); }
  function renameStop(id){ const stop=trip.stops.find(s=>s.id===id), current=stopState(stop).title; const name=prompt('Place name',current); if(name&&name.trim()){ edits.stopOverrides[id]={...(edits.stopOverrides[id]||{}),title:name.trim()}; saveEdits(); markerById.get(id).setPopupContent(()=>popupHtml(stop)); renderStops(); if(currentStopId===id) openGallery(id); } }
  renderDayTabs(); renderStops();

  function openGallery(id){
    const stop=trip.stops.find(s=>s.id===id); if(!stop)return; currentStopId=id; const s=stopState(stop), items=getMedia(id,editMode);
    $('#galleryKicker').textContent=`DAY ${stop.day} · ${fmtTripDate(stop.date).toUpperCase()}`; $('#galleryTitle').textContent=s.title; $('#galleryMeta').textContent=`${s.subtitle||''}${s.address?' · '+s.address:''} · ${mediaCountText(getMedia(id))}`; $('#galleryMapsLink').href=mapsUrl(stop);
    const cover=coverFor(stop); $('#galleryHero').innerHTML=cover?mediaElement(cover,true):`<div class="empty-state">No media assigned yet.</div>`;
    renderGalleryGrid(id,items); $('#galleryModal').classList.add('is-open'); $('#galleryModal').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  }
  function mediaElement(m,hero=false){ return m.type==='video'?`<video src="${m.src}" ${hero?'controls playsinline':'muted playsinline'} poster="${m.thumb}"></video>`:`<img src="${hero?m.src:m.thumb}" alt="${escapeHtml(m.caption||m.filename)}" loading="${hero?'eager':'lazy'}">`; }
  function renderGalleryGrid(stopId,items){
    const cover=coverFor(trip.stops.find(s=>s.id===stopId));
    $('#galleryGrid').innerHTML=items.map(m=>`<div class="media-tile ${cover?.id===m.id?'is-cover':''} ${edits.hidden[m.id]?'hidden-media':''}" draggable="${editMode}" data-media="${m.id}">${mediaElement(m,false)}${m.type==='video'?`<span class="media-badge">▶ ${m.duration?Math.round(m.duration)+'s':'video'}</span>`:cover?.id===m.id?`<span class="media-badge">★ cover</span>`:''}${editMode?mediaTools(m,stopId):''}</div>`).join('');
    $$('.media-tile',$('#galleryGrid')).forEach(tile=>{
      tile.onclick=e=>{ if(e.target.closest('.media-tools'))return; openLightbox(stopId,tile.dataset.media); };
      if(editMode){ tile.ondragstart=e=>e.dataTransfer.setData('text/plain',tile.dataset.media); tile.ondragover=e=>e.preventDefault(); tile.ondrop=e=>{e.preventDefault(); reorder(stopId,e.dataTransfer.getData('text/plain'),tile.dataset.media);}; }
    });
    $$('[data-cover]').forEach(b=>b.onclick=()=>{edits.covers[stopId]=b.dataset.cover;saveEdits();openGallery(stopId);renderStops();refreshMarkerPopup(stopId)});
    $$('[data-hide]').forEach(b=>b.onclick=()=>{edits.hidden[b.dataset.hide]=!edits.hidden[b.dataset.hide];saveEdits();openGallery(stopId);renderStops();refreshMarkerPopup(stopId)});
    $$('[data-up]').forEach(b=>b.onclick=()=>moveOne(stopId,b.dataset.up,-1)); $$('[data-down]').forEach(b=>b.onclick=()=>moveOne(stopId,b.dataset.down,1));
    $$('[data-move]').forEach(s=>s.onchange=()=>moveMedia(s.dataset.move,s.value,stopId));
  }
  function mediaTools(m,stopId){
    const opts=[`<option value="${stopId}">Move to…</option>`,...trip.stops.filter(s=>s.id!==stopId).map(s=>`<option value="${s.id}">${escapeHtml(stopState(s).title)}</option>`),`<option value="unlocated">Unassigned tray</option>`].join('');
    return `<div class="media-tools"><button class="drag-handle" title="Drag to reorder">↕</button><button data-up="${m.id}">←</button><button data-down="${m.id}">→</button><button data-cover="${m.id}">★ cover</button><button data-hide="${m.id}">${edits.hidden[m.id]?'restore':'hide'}</button><select data-move="${m.id}">${opts}</select></div>`;
  }
  function reorder(stopId,fromId,toId){ const ids=getMedia(stopId,true).map(m=>m.id); const a=ids.indexOf(fromId),b=ids.indexOf(toId); if(a<0||b<0)return; ids.splice(b,0,ids.splice(a,1)[0]); edits.orders[stopId]=ids;saveEdits();openGallery(stopId);renderStops(); }
  function moveOne(stopId,id,delta){ const ids=getMedia(stopId,true).map(m=>m.id),i=ids.indexOf(id),j=Math.max(0,Math.min(ids.length-1,i+delta)); if(i===j)return; ids.splice(j,0,ids.splice(i,1)[0]); edits.orders[stopId]=ids;saveEdits();openGallery(stopId);renderStops(); }
  function moveMedia(id,target,fromStop){ edits.assignments[id]=target; saveEdits(); openGallery(fromStop); renderStops(); renderUnassigned(); refreshMarkerPopup(fromStop); if(target!=='unlocated')refreshMarkerPopup(target); }
  function refreshMarkerPopup(id){ const stop=trip.stops.find(s=>s.id===id); if(stop)markerById.get(id)?.setPopupContent(()=>popupHtml(stop)); }

  function renderUnassigned(){
    const items=getMedia('unlocated',true); $('#unassignedSection').style.display=items.length?'block':'none'; $('#unassignedGrid').innerHTML=items.map(m=>`<div class="media-tile" data-media="${m.id}">${mediaElement(m,false)}${editMode?mediaTools(m,'unlocated'):''}</div>`).join('');
    $$('.media-tile',$('#unassignedGrid')).forEach(t=>t.onclick=e=>{if(e.target.closest('.media-tools'))return;openLightbox('unlocated',t.dataset.media)});
    if(editMode) $$('[data-move]',$('#unassignedGrid')).forEach(s=>s.onchange=()=>moveMedia(s.dataset.move,s.value,'unlocated'));
  }
  renderUnassigned();

  function openLightbox(stopId,id){ lightboxItems=getMedia(stopId).filter(m=>!edits.hidden[m.id]); lightboxIndex=Math.max(0,lightboxItems.findIndex(m=>m.id===id)); showLightbox(); }
  function showLightbox(){ const m=lightboxItems[lightboxIndex]; if(!m)return; $('#lightboxStage').innerHTML=m.type==='video'?`<video src="${m.src}" controls autoplay playsinline poster="${m.thumb}"></video>`:`<img src="${m.src}" alt="">`; $('#lightboxCaption').textContent=`${m.filename}${m.capturedAt?' · '+fmtDate(m.capturedAt):''}`; $('#lightbox').classList.add('is-open'); $('#lightbox').setAttribute('aria-hidden','false'); }
  function closeLightbox(){ $('#lightboxStage').innerHTML=''; $('#lightbox').classList.remove('is-open'); $('#lightbox').setAttribute('aria-hidden','true'); }
  $('#prevMedia').onclick=()=>{lightboxIndex=(lightboxIndex-1+lightboxItems.length)%lightboxItems.length;showLightbox()}; $('#nextMedia').onclick=()=>{lightboxIndex=(lightboxIndex+1)%lightboxItems.length;showLightbox()}; $$('[data-close-lightbox]').forEach(b=>b.onclick=closeLightbox);
  $$('[data-close-modal]').forEach(b=>b.onclick=closeGallery); function closeGallery(){ $('#galleryModal').classList.remove('is-open'); $('#galleryModal').setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLightbox();closeGallery()} if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowRight')$('#nextMedia').click(); if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowLeft')$('#prevMedia').click();});

  $('#editToggle').onclick=()=>{ editMode=!editMode; document.body.classList.toggle('editing',editMode); $('#editToggle').setAttribute('aria-pressed',String(editMode)); $('#editToggle').textContent=editMode?'Finish editing':'Edit mode'; $('#editHint').hidden=!editMode; $$('.edit-only').forEach(el=>el.hidden=!editMode); markerById.forEach(m=>editMode?m.dragging.enable():m.dragging.disable()); renderStops(); renderUnassigned(); if(currentStopId&&$('#galleryModal').classList.contains('is-open'))openGallery(currentStopId); };
  $('#exportEdits').onclick=()=>{ const blob=new Blob([JSON.stringify(edits,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='roadtrip-edits.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); };
  $('#resetEdits').onclick=()=>{if(confirm('Reset all browser edits and return to the reconstructed data?')){localStorage.removeItem(storageKey);edits=structuredClone(defaultEdits);location.reload();}};

  function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
})();
