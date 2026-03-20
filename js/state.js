/* ============================================
   state.js — Reactive state with simple event bus
   ============================================ */

(function () {
  const TW = window.TW;

  // Simple event bus for decoupled communication
  const listeners = {};

  TW.on = function (event, fn) {
    (listeners[event] || (listeners[event] = [])).push(fn);
  };

  TW.off = function (event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  };

  TW.emit = function (event, data) {
    (listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[TW event:${event}]`, e); }
    });
  };

  // Game state — single source of truth
  TW.state = {
    screen: 'title',
    selectedBreed: null,
    map: null,
    userLocation: null,
    watchId: null,

    // Marking
    isMarking: false,
    trailCoords: [],
    markStartPoint: null,

    // Territories
    territories: [],
    territoryCounter: 0,

    // Demo mode
    demoMode: false,
    locationGranted: false,
    skipLocation: false,

    // Center
    defaultCenter: [...TW.DEFAULT_CENTER],

    // Treats
    treats: 0,

    // Breed lock
    breedChosenAt: null,

    // OSM Geo-Points
    geoPoints: [],
    geoPointMarkers: [],

    // Player marker refs
    playerMarkerEl: null,
    playerMapMarker: null,

    // Returning player flag
    _isReturning: false,
  };

  // Helper to generate unique territory IDs
  TW.uid = function () {
    return 't_' + (++TW.state.territoryCounter);
  };

  // Reset volatile game state (keeps breed, treats, breedChosenAt)
  TW.resetVolatileState = function () {
    const s = TW.state;
    s.userLocation = null;
    s.trailCoords = [];
    s.markStartPoint = null;
    s.isMarking = false;
    s.territories = [];
    s.territoryCounter = 0;
    s.demoMode = false;
    s.locationGranted = false;
    s.skipLocation = false;
    s.geoPoints = [];
    s.geoPointMarkers = [];
    s.playerMarkerEl = null;
    s.playerMapMarker = null;
  };
})();
