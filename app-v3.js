(() => {
  const trip = window.TRIP_DATA;
  const highlights = window.SCENIC_HIGHLIGHTS || [];
  const accommodationLinks = window.ACCOMMODATION_LINKS || {};
  const stayOrder = window.STAY_ORDER || [];
  const routeAnchors = window.ROUTE_ANCHORS || [];
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const storageKey = 'andrew-lisa-roadtrip-edits-v3';
  const defaultEdits = {covers:{},orders:{},hidden:{},assignments:{},stopOverrides:{}};
  let edits = loadEdits();
  let currentDay = 'all';
  let editMode = false;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let currentGalleryStopId = null;
  const mediaById = new Map();
  const originalStopForMedia = new Map();
  const stopById = new Map(trip.stops.map(s => [s.id, s]));
  const highlightById = new Map(highlights.map(h => [h.id, h]));
  let mainMarkers = [];
  let mediaMarkers = [];
  let scenicMarkers = [];

  trip.stops.forEach(stop => stop.media.forEach(m => {
    mediaById.set(m.id, m);
    originalStopForMedia.set(m.id, stop.id);
  }));
  trip.unlocatedMedia.forEach(m => {
    mediaById.set(m.id, m);
    originalStopForMedia.set(m.id, 'unlocated');
  });

  Object.entries(edits.assignments || {}).forEach(([id,target]) => {
    const canonical = originalStopForMedia.get(id);
    if(canonical && canonical !== 'unlocated' && target === 'unlocated') delete edits.assignments[id];
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
    const preferred=edits.covers[stop.id] || stop.cover;
    return items.find(m=>m.id===preferred) || items[0];
  }
  function getStopPosition(stop){ const s=stopState(stop); return [s.lng,s.lat]; }
  function mediaCountText(items){
    const p=items.filter(m=>m.type==='photo').length;
    const v=items.filter(m=>m.type==='video').length;
    return [p?`${p} photo${p===1?'':'s'}`:'',v?`${v} video${v===1?'':'s'}`:''].filter(Boolean).join(' · ') || 'No media';
  }
  function dateForDay(day){
    const d=new Date(trip.startDate+'T12:00:00'); d.setDate(d.getDate()+day-1);
    return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric'}).format(d);
  }
  function iconSvg(type){
    const icons={
      home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M10 21v-6h4v6"/>',
      bed:'<path d="M3 19V8"/><path d="M3 14h18v5H3"/><path d="M7 14v-4h5a3 3 0 0 1 3 3v1"/><path d="M21 19v2M3 19v2"/>',
      camera:'<path d="M4 8h4l2-2h4l2 2h4v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[type]||icons.camera}</svg>`;
  }
  function scenicArtSvg(type){
    const water = type==='aqueduct'||type==='river'||type==='valley'||type==='town';
    const mountain = type==='mountain'||type==='viewpoint'||type==='valley'||type==='favourite';
    const forest = type==='forest'||type==='favourite'||type==='mountain';
    const building = type==='heritage'||type==='city'||type==='town';
    return `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="80" height="60" fill="#d9eef4"/>
      <circle cx="62" cy="13" r="7" fill="#ffffff" opacity=".8"/>
      ${mountain?'<path d="M0 43 19 20 34 39 51 15 80 44V60H0Z" fill="#8cb39d"/><path d="m44 23 7-8 9 13-5-4-4 4-4-4Z" fill="#eaf4f1"/>':''}
      ${forest?'<g fill="#3f735e"><path d="m8 45 7-18 7 18Z"/><path d="m21 46 6-15 6 15Z"/><path d="m64 45 7-19 7 19Z"/></g>':''}
      ${water?'<path d="M0 45c14-5 23 4 36 0s25-4 44 1v14H0Z" fill="#71b8cc"/><path d="M8 50c11-3 18 2 27 0s19-3 35 0" fill="none" stroke="#d8f1f6" stroke-width="2"/>':''}
      ${building?'<g fill="#b95b42"><rect x="27" y="30" width="26" height="19" rx="2"/><path d="m24 31 16-13 16 13Z"/><rect x="37" y="37" width="7" height="12" fill="#eff7f5"/></g>':''}
      ${type==='aqueduct'?'<g stroke="#6a4a3b" stroke-width="3" fill="none"><path d="M8 30h64"/><path d="M14 30v17m13-17v17m13-17v17m13-17v17m13-17v17"/></g>':''}
      ${type==='favourite'?'<path d="m64 8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9Z" fill="#2f755f"/>':''}
    </svg>`;
  }

  const map = new maplibregl.Map({
    container:'map',
    style:'https://tiles.openfreemap.org/styles/bright',
    center:[13.9,59.25],
    zoom:5.35,
    minZoom:4,
    maxZoom:17,
    attributionControl:true
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');

  map.on('load', async () => {
    tuneBaseMap();
    createAllMarkers();
    renderDayTabs();
    renderItinerary();
    renderAdminTray();
    await drawRoadRoute();
    fitRoute();
  });
  map.on('zoom', updateScenicDensity);

  function tuneBaseMap(){
    const style=map.getStyle();
    (style.layers||[]).forEach(layer=>{
      const id=String(layer.id||'').toLowerCase();
      try{
        if(layer.type==='background') map.setPaintProperty(layer.id,'background-color','#f3f7f5');
        if(layer.type==='fill' && /water|ocean|lake/.test(id)) map.setPaintProperty(layer.id,'fill-color','#bfe3ee');
        if(layer.type==='fill' && /park|wood|forest|grass|landcover|nature/.test(id)) map.setPaintProperty(layer.id,'fill-color','#d7e8d7');
      }catch{}
    });
  }

  function resolveAnchor(anchor){
    if(anchor.stopId){ const stop=stopById.get(anchor.stopId); if(!stop) return null; const s=stopState(stop); return {lng:s.lng,lat:s.lat,day:anchor.day,label:anchor.label}; }
    if(anchor.highlightId){ const h=highlightById.get(anchor.highlightId); if(!h) return null; return {lng:h.lng,lat:h.lat,day:anchor.day,label:anchor.label}; }
    return null;
  }
  function routePoints(){ return routeAnchors.map(resolveAnchor).filter(Boolean); }
  function firstLabelLayer(){ return (map.getStyle().layers||[]).find(l=>l.type==='symbol' && l.layout && l.layout['text-field'])?.id; }
  function clearRouteLayers(){
    ['trip-route-arrows','trip-route-line','trip-route-halo'].forEach(id=>{ if(map.getLayer(id)) map.removeLayer(id); });
    if(map.getSource('trip-route')) map.removeSource('trip-route');
  }
  async function drawRoadRoute(){
    const pts=routePoints();
    if(pts.length<2) return;
    $('#routeText').textContent='Building route…';
    let geometry={type:'LineString',coordinates:pts.map(p=>[p.lng,p.lat])};
    let distanceKm=null;
    try{
      const coords=pts.map(p=>`${p.lng},${p.lat}`).join(';');
      const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
      const j=await r.json();
      if(j.code==='Ok'&&j.routes?.[0]){ geometry=j.routes[0].geometry; distanceKm=j.routes[0].distance/1000; }
    }catch{}
    clearRouteLayers();
    map.addSource('trip-route',{type:'geojson',data:{type:'Feature',properties:{},geometry}});
    const before=firstLabelLayer();
    map.addLayer({id:'trip-route-halo',type:'line',source:'trip-route',paint:{'line-color':'#ffffff','line-width':10,'line-opacity':.92,'line-blur':.3},layout:{'line-cap':'round','line-join':'round'}},before);
    map.addLayer({id:'trip-route-line',type:'line',source:'trip-route',paint:{'line-color':'#9f3e2d','line-width':5.5,'line-opacity':.98},layout:{'line-cap':'round','line-join':'round'}},before);
    map.addLayer({id:'trip-route-arrows',type:'symbol',source:'trip-route',layout:{'symbol-placement':'line','symbol-spacing':115,'text-field':'➤','text-size':14,'text-rotation-alignment':'map','text-keep-upright':false,'text-allow-overlap':true},paint:{'text-color':'#783124','text-halo-color':'#ffffff','text-halo-width':1.5}},before);
    $('#routeText').textContent=distanceKm?`Clockwise road trip · approx. ${Math.round(distanceKm).toLocaleString('en-GB')} km`:'Clockwise road trip · route reconstructed';
  }

  function clearMarkers(){
    [...mainMarkers,...mediaMarkers,...scenicMarkers].forEach(m=>m.marker.remove());
    mainMarkers=[]; mediaMarkers=[]; scenicMarkers=[];
  }
  function createAllMarkers(){ clearMarkers(); createPrimaryMarkers(); createMediaMarkers(); createScenicMarkers(); filterMarkers(); updateScenicDensity(); }
  function createPrimaryMarkers(){
    const stayIndex=new Map(stayOrder.map((id,i)=>[id,i+1]));
    trip.stops.filter(s=>s.kind==='home'||stayIndex.has(s.id)).forEach(stop=>{
      const state=stopState(stop), cover=coverFor(stop), n=stayIndex.get(stop.id);
      const el=document.createElement('div');
      el.className=`trip-marker ${stop.kind==='home'?'trip-marker--home':''}`;
      el.innerHTML=cover?`<img src="${cover.src}" alt="">`:(stop.kind==='home'?iconSvg('home'):iconSvg('bed'));
      if(n) el.insertAdjacentHTML('beforeend',`<span class="trip-marker__number">${n}</span>`);
      el.title=n?`Stay ${n}: ${state.title}`:state.title;
      el.addEventListener('click',e=>{ e.stopPropagation(); showPlacePopup([state.lng,state.lat], primaryPopup(stop,n)); });
      const marker=new maplibregl.Marker({element:el,anchor:'center',draggable:editMode}).setLngLat([state.lng,state.lat]).addTo(map);
      if(editMode){
        marker.on('dragend',()=>{
          const p=marker.getLngLat(); edits.stopOverrides[stop.id]={...(edits.stopOverrides[stop.id]||{}),lng:+p.lng.toFixed(6),lat:+p.lat.toFixed(6)}; saveEdits(); drawRoadRoute(); createAllMarkers(); renderItinerary();
        });
      }
      mainMarkers.push({marker,el,day:stop.day,stopId:stop.id});
    });
  }
  function primaryPopup(stop,n){
    const s=stopState(stop), site=accommodationLinks[stop.id];
    return `<div class="place-popup"><h3>${escapeHtml(n?`Stay ${n} · ${s.title}`:s.title)}</h3><p>${escapeHtml(s.subtitle||'')}</p>${s.address?`<p>${escapeHtml(s.address)}</p>`:''}${site?`<a href="${site}" target="_blank" rel="noopener">Official website ↗</a>`:''}</div>`;
  }
  function createMediaMarkers(){
    trip.stops.forEach(stop=>{
      const items=getMedia(stop.id); if(!items.length) return;
      const s=stopState(stop), el=document.createElement('button');
      el.type='button'; el.className='media-marker'; el.innerHTML=`${iconSvg('camera')}<span>${items.length}</span>`;
      el.title=`Open ${mediaCountText(items)} from ${s.title}`;
      el.addEventListener('click',e=>{ e.stopPropagation(); openGallery(stop.id); });
      const marker=new maplibregl.Marker({element:el,anchor:'left',offset:[22,14]}).setLngLat([s.lng,s.lat]).addTo(map);
      mediaMarkers.push({marker,el,day:stop.day,stopId:stop.id});
    });
  }
  function createScenicMarkers(){
    highlights.forEach(h=>{
      const linked=h.stopId?stopById.get(h.stopId):null;
      const cover=linked?coverFor(linked):null;
      const el=document.createElement('div');
      el.className=`scenic-marker ${h.featured?'':'is-compact'} ${h.type==='favourite'?'scenic-marker--favourite':''}`;
      el.innerHTML=`<span class="scenic-marker__art">${cover?`<img src="${cover.src}" alt="">`:scenicArtSvg(h.type)}</span><span><strong>${escapeHtml(h.title)}</strong><small>${escapeHtml(h.subtitle||'')}</small></span>`;
      el.title=h.title;
      el.addEventListener('click',e=>{ e.stopPropagation(); showPlacePopup([h.lng,h.lat], scenicPopup(h)); });
      const marker=new maplibregl.Marker({element:el,anchor:'left',offset:[8,0]}).setLngLat([h.lng,h.lat]).addTo(map);
      scenicMarkers.push({marker,el,day:h.day,highlight:h});
    });
  }
  function scenicPopup(h){
    return `<div class="place-popup"><h3>${escapeHtml(h.title)}</h3><p>${escapeHtml(h.subtitle||'')}</p>${h.website?`<a href="${h.website}" target="_blank" rel="noopener">Official website ↗</a>`:''}</div>`;
  }
  function showPlacePopup(coords,html){ new maplibregl.Popup({offset:18,closeButton:true,closeOnClick:true}).setLngLat(coords).setHTML(html).addTo(map); }
  function updateScenicDensity(){
    const z=map.getZoom();
    scenicMarkers.forEach(({el,highlight})=>{
      if(highlight.featured) el.classList.toggle('marker-hidden',z<5.3);
      else el.classList.toggle('marker-hidden',z<6.5);
      if(currentDay!=='all' && highlight.day!==currentDay) el.classList.add('marker-hidden');
    });
  }
  function filterMarkers(){
    const visibleDay=d=>currentDay==='all'||d===currentDay;
    mainMarkers.forEach(m=>m.el.classList.toggle('marker-hidden',!visibleDay(m.day)));
    mediaMarkers.forEach(m=>m.el.classList.toggle('marker-hidden',!visibleDay(m.day)));
    scenicMarkers.forEach(m=>m.el.classList.toggle('marker-hidden',!visibleDay(m.day)));
    updateScenicDensity();
  }

  function renderDayTabs(){
    $('#dayTabs').innerHTML=`<button class="day-tab ${currentDay==='all'?'is-active':''}" data-day="all">All days</button>`+[1,2,3,4,5,6,7].map(day=>`<button class="day-tab ${currentDay===day?'is-active':''}" data-day="${day}">Day ${day}<small>${dateForDay(day)}</small></button>`).join('');
    $$('.day-tab').forEach(b=>b.onclick=()=>{
      currentDay=b.dataset.day==='all'?'all':+b.dataset.day; renderDayTabs(); filterMarkers(); currentDay==='all'?fitRoute():fitDay(currentDay);
    });
  }
  function fitRoute(){
    const pts=routePoints(); if(!pts.length) return;
    const bounds=pts.reduce((b,p)=>b.extend([p.lng,p.lat]),new maplibregl.LngLatBounds([pts[0].lng,pts[0].lat],[pts[0].lng,pts[0].lat]));
    map.fitBounds(bounds,{padding:{top:60,bottom:60,left:80,right:80},duration:700,maxZoom:7});
  }
  function fitDay(day){
    const pts=routePoints().filter(p=>p.day===day); if(!pts.length) return;
    const bounds=pts.reduce((b,p)=>b.extend([p.lng,p.lat]),new maplibregl.LngLatBounds([pts[0].lng,pts[0].lat],[pts[0].lng,pts[0].lat]));
    map.fitBounds(bounds,{padding:90,duration:650,maxZoom:9});
  }

  function renderItinerary(){
    const panel=$('#itineraryContent');
    const stays=stayOrder.map((id,i)=>({stop:stopById.get(id),n:i+1})).filter(x=>x.stop);
    const stayHtml=stays.map(({stop,n})=>{
      const s=stopState(stop),cover=coverFor(stop),site=accommodationLinks[stop.id];
      return `<article class="stay-row" data-fly-stop="${stop.id}"><div class="stay-visual">${cover?`<img src="${cover.src}" alt="">`:iconSvg('bed')}<span class="stay-no">${n}</span></div><div><h3>Stay ${n} · ${escapeHtml(s.title)}</h3><p>${escapeHtml(s.subtitle||'')}${getMedia(stop.id).length?` · ${mediaCountText(getMedia(stop.id))}`:''}</p></div>${site?`<a class="website-button" href="${site}" target="_blank" rel="noopener">Website ↗</a>`:''}</article>`;
    }).join('');
    const highlightHtml=highlights.filter(h=>h.id!=='kungalv').map(h=>{
      const linked=h.stopId?stopById.get(h.stopId):null,cover=linked?coverFor(linked):null;
      return `<article class="highlight-row" data-fly-highlight="${h.id}"><div class="highlight-mini">${cover?`<img src="${cover.src}" alt="">`:scenicArtSvg(h.type)}</div><div><h3>${escapeHtml(h.title)}</h3><p>${escapeHtml(h.subtitle||'')}</p></div></article>`;
    }).join('');
    panel.innerHTML=`<section class="panel-section"><div class="panel-section__title"><span>Overnight stays</span><span>1–6</span></div>${stayHtml}</section><section class="panel-section"><div class="panel-section__title"><span>Scenic highlights</span><span>${highlights.length-1}</span></div>${highlightHtml}</section>`;
    $$('[data-fly-stop]',panel).forEach(row=>row.addEventListener('click',e=>{ if(e.target.closest('a')) return; const stop=stopById.get(row.dataset.flyStop),s=stopState(stop); map.flyTo({center:[s.lng,s.lat],zoom:10,duration:700}); }));
    $$('[data-fly-highlight]',panel).forEach(row=>row.onclick=()=>{ const h=highlightById.get(row.dataset.flyHighlight); map.flyTo({center:[h.lng,h.lat],zoom:10,duration:700}); });
  }

  function mediaElement(m,hero=false){
    if(m.type==='video') return `<video src="${m.src}" ${hero?'controls playsinline':'muted playsinline'} poster="${m.thumb}"></video>`;
    return `<img src="${m.src}" alt="${escapeHtml(m.caption||m.filename)}" loading="${hero?'eager':'lazy'}">`;
  }
  function openGallery(stopId){
    const stop=stopById.get(stopId); if(!stop) return;
    currentGalleryStopId=stopId;
    const s=stopState(stop),items=getMedia(stopId,editMode),cover=coverFor(stop);
    $('#galleryTitle').textContent=s.title;
    $('#galleryMeta').textContent=`${mediaCountText(getMedia(stopId))}${s.subtitle?' · '+s.subtitle:''}`;
    $('#galleryHero').innerHTML=cover?mediaElement(cover,true):'';
    renderGalleryGrid(stopId,items);
    $('#galleryDrawer').classList.add('is-open'); $('#galleryDrawer').setAttribute('aria-hidden','false');
  }
  function closeGallery(){ $('#galleryDrawer').classList.remove('is-open'); $('#galleryDrawer').setAttribute('aria-hidden','true'); }
  function renderGalleryGrid(stopId,items){
    const stop=stopById.get(stopId),cover=coverFor(stop);
    $('#galleryGrid').innerHTML=items.map(m=>`<div class="media-tile ${cover?.id===m.id?'is-cover':''} ${edits.hidden[m.id]?'hidden-media':''}" data-media="${m.id}">${mediaElement(m,false)}${m.type==='video'?'<span class="media-badge">▶ video</span>':cover?.id===m.id?'<span class="media-badge">★ cover</span>':''}${editMode?editTools(m,stopId):''}</div>`).join('');
    $$('.media-tile',$('#galleryGrid')).forEach(tile=>tile.onclick=e=>{ if(e.target.closest('.media-tools')) return; openLightbox(stopId,tile.dataset.media); });
    if(editMode) bindEditControls(stopId);
  }
  function editTools(m,stopId){
    const options=[`<option value="${stopId}">Move to…</option>`,...trip.stops.filter(s=>s.id!==stopId).map(s=>`<option value="${s.id}">${escapeHtml(stopState(s).title)}</option>`),'<option value="unlocated">Unassigned</option>'].join('');
    return `<div class="media-tools"><button data-left="${m.id}">←</button><button data-right="${m.id}">→</button><button data-cover="${m.id}">★ cover</button><button data-hide="${m.id}">${edits.hidden[m.id]?'restore':'hide'}</button><select data-move="${m.id}">${options}</select></div>`;
  }
  function bindEditControls(stopId){
    $$('[data-cover]',$('#galleryGrid')).forEach(b=>b.onclick=()=>{ edits.covers[stopId]=b.dataset.cover; saveEdits(); afterMediaEdit(stopId); });
    $$('[data-hide]',$('#galleryGrid')).forEach(b=>b.onclick=()=>{ edits.hidden[b.dataset.hide]=!edits.hidden[b.dataset.hide]; saveEdits(); afterMediaEdit(stopId); });
    $$('[data-left]',$('#galleryGrid')).forEach(b=>b.onclick=()=>moveOne(stopId,b.dataset.left,-1));
    $$('[data-right]',$('#galleryGrid')).forEach(b=>b.onclick=()=>moveOne(stopId,b.dataset.right,1));
    $$('[data-move]',$('#galleryGrid')).forEach(s=>s.onchange=()=>{ edits.assignments[s.dataset.move]=s.value; saveEdits(); afterMediaEdit(stopId); });
  }
  function moveOne(stopId,id,delta){
    const ids=getMedia(stopId,true).map(m=>m.id),i=ids.indexOf(id),j=Math.max(0,Math.min(ids.length-1,i+delta)); if(i===j)return;
    ids.splice(j,0,ids.splice(i,1)[0]); edits.orders[stopId]=ids; saveEdits(); afterMediaEdit(stopId);
  }
  function afterMediaEdit(stopId){ createAllMarkers(); renderItinerary(); renderAdminTray(); openGallery(stopId); }

  function renderAdminTray(){
    const tray=$('#adminTray'),items=getMedia('unlocated',true);
    tray.hidden=!editMode;
    $('#unassignedCount').textContent=`${items.length} unresolved`;
    $('#unassignedGrid').innerHTML=items.map(m=>`<div class="media-tile" data-media="${m.id}">${mediaElement(m,false)}${editMode?`<div class="media-tools"><select data-admin-move="${m.id}"><option>Assign to…</option>${trip.stops.map(s=>`<option value="${s.id}">${escapeHtml(stopState(s).title)}</option>`).join('')}</select></div>`:''}</div>`).join('');
    $$('[data-admin-move]',tray).forEach(s=>s.onchange=()=>{ if(!s.value)return; edits.assignments[s.dataset.adminMove]=s.value; saveEdits(); createAllMarkers(); renderItinerary(); renderAdminTray(); });
  }

  function openLightbox(stopId,id){ lightboxItems=getMedia(stopId).filter(m=>!edits.hidden[m.id]); lightboxIndex=Math.max(0,lightboxItems.findIndex(m=>m.id===id)); showLightbox(); }
  function showLightbox(){
    const m=lightboxItems[lightboxIndex]; if(!m)return;
    $('#lightboxStage').innerHTML=m.type==='video'?`<video src="${m.src}" controls autoplay playsinline poster="${m.thumb}"></video>`:`<img src="${m.src}" alt="">`;
    $('#lightboxCaption').textContent=m.filename;
    $('#lightbox').classList.add('is-open');
  }
  function closeLightbox(){ $('#lightbox').classList.remove('is-open'); $('#lightboxStage').innerHTML=''; }

  $('#itineraryToggle').onclick=()=>$('#itineraryPanel').classList.toggle('is-open');
  $('#closeItinerary').onclick=()=>$('#itineraryPanel').classList.remove('is-open');
  $('#fitRoute').onclick=fitRoute;
  $('#fullscreenToggle').onclick=async()=>{ if(!document.fullscreenElement) await $('#mapShell').requestFullscreen(); else await document.exitFullscreen(); setTimeout(()=>map.resize(),100); };
  document.addEventListener('fullscreenchange',()=>setTimeout(()=>map.resize(),100));
  $('#editToggle').onclick=()=>{
    editMode=!editMode; document.body.classList.toggle('editing',editMode); $('#editToggle').classList.toggle('is-active',editMode); $('#editToggle').textContent=editMode?'Finish edit':'Edit'; createAllMarkers(); renderItinerary(); renderAdminTray(); if(currentGalleryStopId&&$('#galleryDrawer').classList.contains('is-open')) openGallery(currentGalleryStopId);
  };
  $('#closeGallery').onclick=closeGallery;
  $('#closeLightbox').onclick=closeLightbox;
  $('#prevMedia').onclick=()=>{lightboxIndex=(lightboxIndex-1+lightboxItems.length)%lightboxItems.length;showLightbox();};
  $('#nextMedia').onclick=()=>{lightboxIndex=(lightboxIndex+1)%lightboxItems.length;showLightbox();};
  $('#exportEdits').onclick=()=>{ const blob=new Blob([JSON.stringify(edits,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='roadtrip-edits.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); };
  $('#resetEdits').onclick=()=>{ if(confirm('Reset browser edits?')){ localStorage.removeItem(storageKey); location.reload(); } };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeGallery();closeLightbox();$('#itineraryPanel').classList.remove('is-open');} if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowRight')$('#nextMedia').click(); if($('#lightbox').classList.contains('is-open')&&e.key==='ArrowLeft')$('#prevMedia').click(); });
})();
