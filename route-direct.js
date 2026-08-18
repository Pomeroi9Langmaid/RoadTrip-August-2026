(() => {
  if (window.__ROADTRIP_DIRECT_ROUTE__) return;
  window.__ROADTRIP_DIRECT_ROUTE__ = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (url.includes('router.project-osrm.org/route/v1/driving') && window.ACTUAL_ROUTE?.coordinates?.length) {
      const distance = Number(window.ACTUAL_ROUTE.estimatedTotalKm || 1550) * 1000;
      return new Response(JSON.stringify({
        code: 'Ok',
        routes: [{
          distance,
          geometry: { type: 'LineString', coordinates: window.ACTUAL_ROUTE.coordinates }
        }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(input, init);
  };
})();