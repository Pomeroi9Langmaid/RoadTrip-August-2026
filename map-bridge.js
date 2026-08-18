(() => {
  if (!window.maplibregl?.Map || window.__ROADTRIP_MAP_BRIDGE__) return;
  window.__ROADTRIP_MAP_BRIDGE__ = true;
  const OriginalMap = window.maplibregl.Map;
  class RoadTripMap extends OriginalMap {
    constructor(options) {
      super(options);
      window.ROADTRIP_MAP = this;
      window.dispatchEvent(new CustomEvent('roadtrip-map-ready', { detail: this }));
    }
  }
  Object.setPrototypeOf(RoadTripMap, OriginalMap);
  window.maplibregl.Map = RoadTripMap;
})();