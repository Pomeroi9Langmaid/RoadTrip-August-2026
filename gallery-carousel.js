(() => {
  const drawer = document.getElementById('galleryDrawer');
  const hero = document.getElementById('galleryHero');
  const grid = document.getElementById('galleryGrid');
  if (!drawer || !hero || !grid) return;

  let selectedId = null;
  let enhancing = false;
  let queued = false;
  let renderToken = 0;
  const originalClicks = new WeakMap();

  function visibleTiles() {
    return [...grid.querySelectorAll('.media-tile')].filter(tile => !tile.classList.contains('hidden-media'));
  }

  function mediaNode(tile) {
    return tile?.querySelector('img,video') || null;
  }

  function sameMedia(a, b) {
    if (!a || !b) return false;
    const asrc = a.currentSrc || a.src || '';
    const bsrc = b.currentSrc || b.src || '';
    return asrc && bsrc && asrc === bsrc;
  }

  function currentIndex() {
    const tiles = visibleTiles();
    const i = tiles.findIndex(tile => tile.dataset.media === selectedId);
    return { tiles, index: i >= 0 ? i : 0 };
  }

  function expandIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>';
  }

  function stopOldVideo() {
    const oldVideo = hero.querySelector('video');
    if (!oldVideo) return;
    try {
      oldVideo.pause();
      oldVideo.removeAttribute('src');
      oldVideo.load();
    } catch {}
  }

  function scrollFilmstripTo(tile) {
    if (!tile) return;
    const target = tile.offsetLeft - Math.max(0, (grid.clientWidth - tile.offsetWidth) / 2);
    grid.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
  }

  function renderHero(tile, { scroll = true } = {}) {
    if (!tile) return;
    const source = mediaNode(tile);
    if (!source) return;

    const token = ++renderToken;
    selectedId = tile.dataset.media;
    visibleTiles().forEach(t => t.classList.toggle('is-carousel-selected', t === tile));

    stopOldVideo();

    const stage = document.createElement('div');
    stage.className = 'gallery-carousel-stage is-entering';

    if (source.tagName === 'VIDEO') {
      const video = document.createElement('video');
      video.src = source.currentSrc || source.src;
      video.poster = source.poster || '';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      stage.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = source.currentSrc || source.src;
      img.alt = source.alt || '';
      img.decoding = 'async';
      stage.appendChild(img);
    }

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'gallery-carousel-nav gallery-carousel-prev';
    prev.setAttribute('aria-label', 'Previous photo or video');
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'gallery-carousel-nav gallery-carousel-next';
    next.setAttribute('aria-label', 'Next photo or video');
    next.textContent = '›';

    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'gallery-carousel-expand';
    expand.innerHTML = `${expandIcon()}<span>Full screen</span>`;
    expand.setAttribute('aria-label', 'Open selected media full screen');

    const { tiles, index } = currentIndex();
    const counter = document.createElement('span');
    counter.className = 'gallery-carousel-counter';
    counter.textContent = `${index + 1} of ${tiles.length}`;

    prev.onclick = event => {
      event.stopPropagation();
      step(-1);
    };
    next.onclick = event => {
      event.stopPropagation();
      step(1);
    };
    expand.onclick = event => {
      event.stopPropagation();
      openFullScreen(tile);
    };

    hero.replaceChildren(stage, prev, next, expand, counter);
    requestAnimationFrame(() => {
      if (token === renderToken) stage.classList.remove('is-entering');
    });

    if (scroll) scrollFilmstripTo(tile);
  }

  function step(delta) {
    const { tiles, index } = currentIndex();
    if (!tiles.length) return;
    const nextIndex = (index + delta + tiles.length) % tiles.length;
    renderHero(tiles[nextIndex]);
  }

  function openFullScreen(tile) {
    const original = originalClicks.get(tile);
    if (typeof original === 'function') {
      original.call(tile, { target: tile });
      return;
    }

    const freshTile = visibleTiles().find(t => t.dataset.media === tile.dataset.media);
    const freshOriginal = freshTile && originalClicks.get(freshTile);
    if (typeof freshOriginal === 'function') freshOriginal.call(freshTile, { target: freshTile });
  }

  function interceptTile(tile) {
    if (!tile || tile.dataset.carouselBound === '1') return;
    const original = tile.onclick;
    if (typeof original === 'function') originalClicks.set(tile, original);
    tile.dataset.carouselBound = '1';
    tile.onclick = event => {
      if (event.target.closest('.media-tools')) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      renderHero(tile);
    };
  }

  function chooseInitialTile(tiles) {
    if (!tiles.length) return null;
    if (selectedId) {
      const existing = tiles.find(tile => tile.dataset.media === selectedId);
      if (existing) return existing;
    }

    const existingHero = hero.querySelector('img,video');
    if (existingHero) {
      const match = tiles.find(tile => sameMedia(mediaNode(tile), existingHero));
      if (match) return match;
    }

    return tiles.find(tile => tile.classList.contains('is-cover')) || tiles[0];
  }

  function syncDrawerState() {
    document.body.classList.toggle('gallery-drawer-open', drawer.classList.contains('is-open'));
  }

  function enhance() {
    syncDrawerState();
    if (enhancing || !drawer.classList.contains('is-open')) return;
    enhancing = true;
    try {
      const tiles = [...grid.querySelectorAll('.media-tile')];
      tiles.forEach(interceptTile);
      const visible = visibleTiles();
      if (!visible.length) return;
      const selected = chooseInitialTile(visible);
      if (!hero.querySelector('.gallery-carousel-stage') || selected?.dataset.media !== selectedId) {
        renderHero(selected, { scroll: false });
      } else {
        visible.forEach(t => t.classList.toggle('is-carousel-selected', t.dataset.media === selectedId));
      }
    } finally {
      enhancing = false;
    }
  }

  function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhance();
    });
  }

  const observer = new MutationObserver(records => {
    const relevant = records.some(record =>
      record.type === 'childList' ||
      (record.target === drawer && record.type === 'attributes' && record.attributeName === 'class')
    );
    if (relevant) queueEnhance();
  });
  observer.observe(drawer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  drawer.addEventListener('keydown', event => {
    if (!drawer.classList.contains('is-open')) return;
    if (document.getElementById('lightbox')?.classList.contains('is-open')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  });

  grid.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      grid.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, { passive: false });

  queueEnhance();
})();