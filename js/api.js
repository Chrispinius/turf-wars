/* ============================================
   api.js — External API calls (Overpass, etc.)
   Isolated so failures here don't break the game
   ============================================ */

(function () {
  const TW = window.TW;

  TW.api = {
    // Fetch nearby points-of-interest from Overpass API
    // Returns array of { lng, lat, type } or empty array on failure
    fetchGeoPoints: function (lat, lng) {
      const radius = TW.GEO_SEARCH_RADIUS;
      const query = `[out:json][timeout:10];
(
  node["leisure"="dog_park"](around:${radius},${lat},${lng});
  node["emergency"="fire_hydrant"](around:${radius},${lat},${lng});
  node["amenity"="fountain"](around:${radius},${lat},${lng});
  node["amenity"="bench"](around:${radius},${lat},${lng});
  node["leisure"="playground"](around:${radius},${lat},${lng});
);
out body;`;

      return fetch(TW.OVERPASS_URL, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.elements || !data.elements.length) return [];
          return data.elements.map(function (el) {
            return {
              lng: el.lon,
              lat: el.lat,
              type: el.tags?.leisure || el.tags?.amenity || el.tags?.emergency || 'unknown',
            };
          });
        })
        .catch(function (err) {
          console.warn('Overpass API error (silently skipped):', err.message);
          return [];
        });
    },
  };
})();
