/* ============================================
   geo.js — Geometry & math utilities
   Pure functions — no side effects, no state
   ============================================ */

(function () {
  const TW = window.TW;

  TW.geo = {
    // Haversine distance in meters between two lng/lat points
    haversine: function (lng1, lat1, lng2, lat2) {
      const R = 6371000;
      const toRad = d => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // Shoelace formula — polygon area in m² from lng/lat coords
    polygonAreaM2: function (coords) {
      if (coords.length < 3) return 0;
      const cLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const cLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const toRad = d => d * Math.PI / 180;
      const cosLat = Math.cos(toRad(cLat));
      const mPerDegLat = 111320;
      const mPerDegLng = 111320 * cosLat;

      const points = coords.map(c => [
        (c[0] - cLng) * mPerDegLng,
        (c[1] - cLat) * mPerDegLat,
      ]);

      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
      }
      return Math.abs(area / 2);
    },

    // Ray-casting point-in-polygon test
    pointInPolygon: function (point, polygon) {
      const [x, y] = point;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    },

    // Check if any geo-point falls inside a polygon
    polygonContainsAnyGeoPoint: function (polygon, geoPoints) {
      for (const gp of geoPoints) {
        if (this.pointInPolygon([gp.lng, gp.lat], polygon)) {
          return true;
        }
      }
      return false;
    },

    // Convert meters offset to approximate lng/lat delta
    metersToLngLat: function (centerLat) {
      const toRad = d => d * Math.PI / 180;
      const cosLat = Math.cos(toRad(centerLat));
      return {
        mPerDegLat: 111320,
        mPerDegLng: 111320 * cosLat,
      };
    },
  };
})();
