(() => {
  const EDITS_KEY = 'andrew-lisa-roadtrip-edits-v3';
  const DELETE_KEY = 'andrew-lisa-roadtrip-delete-queue-v1';
  const DIRTY_KEY = 'andrew-lisa-roadtrip-publish-state-v1';
  const trip = window.TRIP_DATA || {stops:[], unlocatedMedia:[]};
  const mediaById = new Map();

  (trip.stops || []).forEach(stop => (stop.media || []).forEach(m => mediaById.set(m.id, {...m, stopId: stop.id})));
  (trip.unlocatedMedia || []).forEach(m => mediaById.set(m.id, {...m, stopId: 'unlocated'}));

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
    catch { return fallback; }
  };
  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const deleteQueue = () => readJson(DELETE_KEY, {});
  const publishState = () => readJson(DIRTY_KEY, {dirty:false,lastExportedAt:null});

  function markDirty(reason) {
    const state = publishState();
    writeJson(DIRTY_KEY, {dirty:true, updatedAt:new Date().toISOString(), lastExportedAt:state.lastExportedAt || null, reason});
    updateStatus();
  }

  function markExported() {
    writeJson(DIRTY_KEY, {dirty:false, updatedAt:new Date().toISOString(), lastExportedAt:new Date().toISOString()});
    updateStatus('Exported — ready to publish');
  }

  function getQueueRecord(id) {
    return deleteQueue()[id] || null;
  }

  function queueDelete(id) {
    const q = deleteQueue();
    const m = mediaById.get(id) || {};
    q[id] = {
      id,
      filename: m.filename || id,
      src: m.src || null,
      thumb: m.thumb || null,
      originalStopId: m.stopId || null,
      queuedAt: new Date().toISOString()
    };
    writeJson(DELETE_KEY, q);
    markDirty('delete queued');
  }

  function unqueueDelete(id) {
    const q = deleteQueue();
    delete q[id];
    writeJson(DELETE_KEY, q);
    markDirty('delete restored');
  }

  function ensureManagerBar() {
    const drawer = document.querySelector('#galleryDrawer');
    if (!drawer) return null;
    let bar = drawer.querySelector('.media-manager-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'media-manager-bar';
      bar.innerHTML = `
        <div class="media-manager-status"><strong>Media Manager</strong><span id="mediaManagerStatus">No unpublished edits</span></div>
        <div class="media-manager-actions">
          <button type="button" id="mediaManagerExport">Export for publishing</button>
        </div>`;
      const head = drawer.querySelector('.gallery-head');
      head?.insertAdjacentElement('afterend', bar);
      bar.querySelector('#mediaManagerExport')?.addEventListener('click', exportManifest);
    }
    bar.hidden = !document.body.classList.contains('editing');
    return bar;
  }

  function updateStatus(override) {
    const bar = ensureManagerBar();
    const status = bar?.querySelector('#mediaManagerStatus');
    if (!status) return;
    let next;
    if (override) next = override;
    else {
      const state = publishState();
      const queued = Object.keys(deleteQueue()).length;
      if (state.dirty) next = `Changes saved on this device${queued ? ` · ${queued} deletion${queued===1?'':'s'} queued` : ''}`;
      else if (state.lastExportedAt) next = `Exported ${new Date(state.lastExportedAt).toLocaleString()}`;
      else next = 'No unpublished edits';
    }
    if (status.textContent !== next) status.textContent = next;
  }

  function exportManifest() {
    const edits = readJson(EDITS_KEY, {});
    const q = deleteQueue();
    const payload = {
      format: 'roadtrip-media-edits-v1',
      exportedAt: new Date().toISOString(),
      source: location.href,
      edits,
      permanentDeleteQueue: Object.values(q),
      note: 'Browser edits are not public until this manifest is applied to the canonical GitHub trip data.'
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `roadtrip-media-edits-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    markExported();
  }

  function reorderWithExistingControls(sourceId, desiredIndex) {
    let attempts = 0;
    const step = () => {
      const grid = document.querySelector('#galleryGrid');
      if (!grid || !document.body.classList.contains('editing')) return;
      const tiles = [...grid.querySelectorAll('.media-tile[data-media]')];
      const currentIndex = tiles.findIndex(t => t.dataset.media === sourceId);
      if (currentIndex < 0 || currentIndex === desiredIndex || attempts++ > 80) {
        markDirty('gallery order changed');
        sync();
        return;
      }
      const tile = tiles[currentIndex];
      const button = currentIndex < desiredIndex
        ? tile.querySelector(`[data-right="${CSS.escape(sourceId)}"]`)
        : tile.querySelector(`[data-left="${CSS.escape(sourceId)}"]`);
      if (!button) return;
      button.click();
      setTimeout(step, 55);
    };
    step();
  }

  function onDeleteClick(tile) {
    const id = tile.dataset.media;
    if (!id) return;
    const queued = getQueueRecord(id);
    if (queued) {
      unqueueDelete(id);
      const restore = tile.querySelector('[data-hide]');
      if (tile.classList.contains('hidden-media') && restore) restore.click();
      setTimeout(sync, 80);
      return;
    }

    const m = mediaById.get(id);
    const ok = confirm(`Delete ${m?.filename || 'this item'} from the trip?\n\nIt will be hidden immediately and queued for permanent removal from GitHub when the exported edits are published. You can undo this before publishing.`);
    if (!ok) return;

    const hide = tile.querySelector('[data-hide]');
    if (hide && !tile.classList.contains('hidden-media')) hide.click();
    setTimeout(() => { queueDelete(id); sync(); }, 90);
  }

  function enhanceTile(tile) {
    if (!document.body.classList.contains('editing')) {
      tile.draggable = false;
      tile.classList.remove('media-manager-tile');
      return;
    }

    tile.classList.add('media-manager-tile');
    tile.draggable = true;
    tile.querySelectorAll('img,video').forEach(el => el.draggable = false);

    const tools = tile.querySelector('.media-tools');
    if (!tools) return;
    tools.classList.add('media-manager-tools');

    let handle = tools.querySelector('.media-drag-handle');
    if (!handle) {
      handle = document.createElement('span');
      handle.className = 'media-drag-handle';
      handle.textContent = '☰ drag';
      handle.title = 'Drag to reorder this gallery';
      tools.prepend(handle);
    }

    const cover = tools.querySelector('[data-cover]');
    if (cover) { cover.textContent = '★ Cover'; cover.title = 'Use as the cover image for this location'; }
    const hide = tools.querySelector('[data-hide]');
    if (hide) { hide.textContent = tile.classList.contains('hidden-media') ? 'Restore' : 'Hide'; hide.title = 'Hide from the public trip without deleting the file'; }
    const select = tools.querySelector('[data-move]');
    if (select) select.title = 'Move this photo/video to another map location';

    let del = tools.querySelector('.media-delete-button');
    if (!del) {
      del = document.createElement('button');
      del.type = 'button';
      del.className = 'media-delete-button';
      del.addEventListener('click', e => { e.stopPropagation(); onDeleteClick(tile); });
      tools.append(del);
    }
    const queued = !!getQueueRecord(tile.dataset.media);
    tile.classList.toggle('media-delete-queued', queued);
    del.textContent = queued ? 'Undo delete' : 'Delete';
    del.title = queued ? 'Remove this item from the permanent deletion queue' : 'Hide now and queue for permanent removal when published';

    if (!tile.dataset.managerBound) {
      tile.dataset.managerBound = '1';
      tile.addEventListener('dragstart', e => {
        if (!document.body.classList.contains('editing')) return e.preventDefault();
        tile.classList.add('media-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.dataset.media || '');
      });
      tile.addEventListener('dragend', () => {
        document.querySelectorAll('.media-drop-target,.media-dragging').forEach(el => el.classList.remove('media-drop-target','media-dragging'));
      });
      tile.addEventListener('dragover', e => {
        if (!document.body.classList.contains('editing')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.media-drop-target').forEach(el => el.classList.remove('media-drop-target'));
        tile.classList.add('media-drop-target');
      });
      tile.addEventListener('drop', e => {
        if (!document.body.classList.contains('editing')) return;
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain');
        const grid = tile.closest('#galleryGrid');
        const tiles = [...grid.querySelectorAll('.media-tile[data-media]')];
        const desiredIndex = tiles.indexOf(tile);
        tile.classList.remove('media-drop-target');
        if (sourceId && desiredIndex >= 0 && sourceId !== tile.dataset.media) reorderWithExistingControls(sourceId, desiredIndex);
      });
    }
  }

  function hookExistingControls() {
    const grid = document.querySelector('#galleryGrid');
    if (!grid || grid.dataset.managerHooked) return;
    grid.dataset.managerHooked = '1';
    grid.addEventListener('click', e => {
      if (!document.body.classList.contains('editing')) return;
      if (e.target.closest('[data-cover],[data-hide],[data-left],[data-right]')) setTimeout(() => markDirty('media edited'), 80);
    }, true);
    grid.addEventListener('change', e => {
      if (!document.body.classList.contains('editing')) return;
      if (e.target.matches('[data-move]')) setTimeout(() => markDirty('media moved'), 80);
    }, true);
  }

  function sync() {
    ensureManagerBar();
    hookExistingControls();
    const grid = document.querySelector('#galleryGrid');
    grid?.classList.toggle('media-manager-grid', document.body.classList.contains('editing'));
    grid?.querySelectorAll('.media-tile[data-media]').forEach(enhanceTile);

    const exportButton = document.querySelector('#exportEdits');
    if (exportButton && !exportButton.dataset.managerExport) {
      exportButton.dataset.managerExport = '1';
      exportButton.textContent = 'Export for publishing';
      exportButton.onclick = exportManifest;
    }
    updateStatus();
  }

  let queued = false;
  const queueSync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  };

  new MutationObserver(queueSync).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  document.addEventListener('change', queueSync, true);
  window.addEventListener('storage', queueSync);
  sync();
})();