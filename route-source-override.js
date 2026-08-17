(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.startsWith('https://router.project-osrm.org/route/v1/driving/') && window.ACTUAL_ROUTE?.coordinates?.length) {
      const route = window.ACTUAL_ROUTE;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [{
            geometry: { type: 'LineString', coordinates: route.coordinates },
            distance: route.estimatedTotalKm * 1000,
            duration: 0
          }]
        })
      });
    }
    return originalFetch(input, init);
  };
})();
