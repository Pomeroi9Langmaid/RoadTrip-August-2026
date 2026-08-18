(() => {
  const highlights = new Map((window.SCENIC_HIGHLIGHTS || []).map(h => [h.id, h]));
  let applying = false;

  function selectedDay() {
    return document.querySelector('.day-tab.is-active')?.dataset.day || 'all';
  }

  function applyVisibility() {
    if (applying) return;
    applying = true;
    try {
      const day = selectedDay();
      document.querySelectorAll('.scenic-anchor[data-highlight-id]').forEach(root => {
        const highlight = highlights.get(root.dataset.highlightId);
        if (!highlight) return;
        const shouldShow = day === 'all' || Number(highlight.day) === Number(day);
        if (root.classList.contains('marker-hidden') === shouldShow) {
          root.classList.toggle('marker-hidden', !shouldShow);
        }
      });
    } finally {
      applying = false;
    }
  }

  let queued = false;
  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyVisibility();
    });
  }

  new MutationObserver(queueApply).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  function hookMap() {
    const map = window.ROADTRIP_MAP;
    if (!map || map.__scenicVisibilityHooked) return;
    map.__scenicVisibilityHooked = true;
    map.on('zoom', applyVisibility);
    map.on('moveend', queueApply);
  }

  window.addEventListener('roadtrip-map-ready', () => { hookMap(); queueApply(); });
  hookMap();
  queueApply();
})();