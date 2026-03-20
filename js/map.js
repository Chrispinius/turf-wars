/* ============================================
   map.js — MapLibre setup, layers, markers, trail
   ============================================ */

(function () {
  const TW = window.TW;
  const state = TW.state;
  const geo = TW.geo;

  TW.map = {
    // Initialize the MapLibre instance and layers
    init: function (center) {
      state.map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: center,
        zoom: 14,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });

      state.map.on('load', function () {
        TW.map._addLayers();
        TW.map._addClickHandlers();
        TW.emit('map:ready', center);
      });
    },

    // Destroy the map instance and clean up
    destroy: function () {
      // Remove geo-point markers
      state.geoPointMarkers.forEach(function (m) { m.remove(); });
      state.geoPointMarkers = [];

      if (state.map) {
        state.map.remove();
        state.map = null;
      }
      state.playerMarkerEl = null;
      state.playerMapMarker = null;
    },

    // Update the trail line on the map
    updateTrail: function (coords) {
      if (!state.map || !state.map.getSource('trail')) return;
      state.map.getSource('trail').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
      });
    },

    // Show the start-point marker
    showStartPoint: function (lng, lat) {
      if (!state.map || !state.map.getSource('start-point')) return;
      state.map.getSource('start-point').setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }],
      });
    },

    // Clear the start-point marker
    clearStartPoint: function () {
      if (!state.map || !state.map.getSource('start-point')) return;
      state.map.getSource('start-point').setData({
        type: 'FeatureCollection',
        features: [],
      });
    },

    // Update territory polygons on the map
    updateTerritories: function () {
      if (!state.map || !state.map.getSource('territories')) return;
      const features = state.territories.map(function (t) {
        return {
          type: 'Feature',
          properties: { id: t.id, breedId: t.breedId, color: t.color, area: t.area },
          geometry: { type: 'Polygon', coordinates: [t.polygon] },
        };
      });
      state.map.getSource('territories').setData({
        type: 'FeatureCollection',
        features: features,
      });
    },

    // Create or update the player paw marker
    updatePlayerMarker: function (lngLat) {
      if (state.playerMapMarker) {
        state.playerMapMarker.setLngLat(lngLat);
        return;
      }

      state.playerMarkerEl = document.createElement('div');
      state.playerMarkerEl.innerHTML =
        '<svg width="32" height="32" viewBox="0 0 64 64" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">' +
        '<use href="#icon-paw" fill="' + state.selectedBreed.color + '"/></svg>';
      state.playerMarkerEl.style.cursor = 'pointer';

      state.playerMapMarker = new maplibregl.Marker({ element: state.playerMarkerEl, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(state.map);
    },

    // Add pulsing bone markers for geo-points
    addGeoPointMarkers: function () {
      if (!state.map) return;
      // Remove old
      state.geoPointMarkers.forEach(function (m) { m.remove(); });
      state.geoPointMarkers = [];

      state.geoPoints.forEach(function (gp) {
        var el = document.createElement('div');
        el.className = 'geo-point-marker';
        el.innerHTML = '<div class="geo-point-pulse"></div>' +
          '<svg class="geo-point-icon" viewBox="0 0 24 24"><use href="#icon-bone"/></svg>';

        var marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([gp.lng, gp.lat])
          .addTo(state.map);
        state.geoPointMarkers.push(marker);
      });
    },

    // ---- Private helpers ----

    _addLayers: function () {
      var breedColor = state.selectedBreed.color;

      // Trail line
      state.map.addSource('trail', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });
      state.map.addLayer({
        id: 'trail-line', type: 'line', source: 'trail',
        paint: { 'line-color': breedColor, 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
      });

      // Territories
      state.map.addSource('territories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      state.map.addLayer({
        id: 'territory-fill', type: 'fill', source: 'territories',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 },
      });
      state.map.addLayer({
        id: 'territory-border', type: 'line', source: 'territories',
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': 0.8 },
      });

      // Start-point circle
      state.map.addSource('start-point', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      state.map.addLayer({
        id: 'start-point-circle', type: 'circle', source: 'start-point',
        paint: {
          'circle-radius': 8, 'circle-color': breedColor,
          'circle-opacity': 0.6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff',
        },
      });
    },

    _addClickHandlers: function () {
      // Territory info popup
      state.map.on('click', 'territory-fill', function (e) {
        if (e.features && e.features.length) {
          var feat = e.features[0];
          var breed = TW.BREEDS.find(function (b) { return b.id === feat.properties.breedId; });
          var area = Math.round(feat.properties.area);
          if (breed) {
            TW.emit('territory:tapped', { point: e.point, name: breed.name, area: area, color: breed.color });
          }
        }
      });

      // Demo mode click-to-place waypoint
      state.map.on('click', function (e) {
        if (!state.demoMode || !state.isMarking) return;
        TW.emit('demo:waypoint', { lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    },
  };
})();
