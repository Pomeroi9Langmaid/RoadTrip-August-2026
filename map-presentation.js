(() => {
  const ROUTE_LABEL = 'Clockwise road trip · ≈1,550 km';
  let borderAppliedForStyle = null;

  function lockRouteLabel() {
    const el = document.getElementById('routeText');
    if (el && el.textContent !== ROUTE_LABEL) el.textContent = ROUTE_LABEL;
  }

  function borderScore(layer) {
    if (layer?.type !== 'line') return -999;
    const id = String(layer.id || '').toLowerCase();
    const sourceLayer = String(layer['source-layer'] || '').toLowerCase();
    const filter = JSON.stringify(layer.filter || []).toLowerCase();
    if (!/boundary|admin|border/.test(`${id} ${sourceLayer}`)) return -999;

    let score = 0;
    if (/country/.test(id)) score += 120;
    if (/boundary[_-]?2|admin[_-]?2|admin-2/.test(id)) score += 110;
    if (/boundary/.test(sourceLayer)) score += 45;
    if (/admin_level/.test(filter) && /(^|[^0-9])2([^0-9]|$)/.test(filter)) score += 90;
    if (/disputed/.test(id)) score -= 15;
    if (/boundary[_-]?[34]|admin[_-]?[34]/.test(id)) score -= 100;
    return score;
  }

  function emphasizeCountryBorders() {
    const map = window.ROADTRIP_MAP;
    if (!map?.getStyle?.() || !map.isStyleLoaded?.()) return;

    const style = map.getStyle();
    const styleKey = `${style?.sprite || ''}|${style?.glyphs || ''}|${(style?.layers || []).length}`;
    if (borderAppliedForStyle === styleKey) return;

    const candidates = (style.layers || [])
      .map(layer => ({ layer, score: borderScore(layer) }))
      .filter(item => item.score >= 80)
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) return;

    candidates.forEach(({ layer }) => {
      try {
        map.setPaintProperty(layer.id, 'line-color', '#536b73');
        map.setPaintProperty(layer.id, 'line-opacity', 0.95);
        map.setPaintProperty(layer.id, 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          4, 1.5,
          5.5, 1.9,
          7, 2.35,
          9, 2.8,
          12, 3.2
        ]);
        if (layer.paint && Object.prototype.hasOwnProperty.call(layer.paint, 'line-dasharray')) {
          map.setPaintProperty(layer.id, 'line-dasharray', [3, 1.5]);
        }
      } catch {}
    });

    borderAppliedForStyle = styleKey;
  }

  function hookMap() {
    const map = window.ROADTRIP_MAP;
    if (!map || map.__roadtripPresentationHooked) return;
    map.__roadtripPresentationHooked = true;
    map.on('load', emphasizeCountryBorders);
    map.on('styledata', emphasizeCountryBorders);
    map.on('idle', emphasizeCountryBorders);
    if (map.isStyleLoaded?.()) emphasizeCountryBorders();
  }

  lockRouteLabel();
  const routeText = document.getElementById('routeText');
  if (routeText) {
    new MutationObserver(lockRouteLabel).observe(routeText, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('roadtrip-map-ready', () => {
    hookMap();
    lockRouteLabel();
  });
  hookMap();
})();
