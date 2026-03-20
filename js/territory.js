/* ============================================
   territory.js — Territory claiming, stealing, treats
   Pure data processing — no DOM, no map calls
   ============================================ */

(function () {
  const TW = window.TW;
  const geo = TW.geo;
  const C = TW; // config constants

  TW.territory = {
    // Process a closed loop: calculate territories, treats, stolen count
    // Returns { newTerritories, treatsEarned, bonusTreats, isGeoBonus, stolenCount, area }
    // or null if the loop is too small
    processLoop: function (trailCoords) {
      if (trailCoords.length < C.MIN_TRAIL_POINTS) return null;

      var polygon = trailCoords.concat([trailCoords[0]]);
      var area = geo.polygonAreaM2(polygon);

      if (area < C.MIN_TERRITORY_AREA) return null;

      var state = TW.state;
      var stolenCount = 0;
      var newTerritories = [];

      // Check overlaps with existing territories
      for (var i = 0; i < state.territories.length; i++) {
        var t = state.territories[i];
        var overlapRatio = this._calculateOverlap(t.polygon, polygon);

        if (overlapRatio > C.OVERLAP_THRESHOLD && t.breedId !== state.selectedBreed.id) {
          stolenCount++;
          // Don't keep the old territory
        } else {
          newTerritories.push(t);
        }
      }

      // Add new territory
      newTerritories.push({
        id: TW.uid(),
        breedId: state.selectedBreed.id,
        color: state.selectedBreed.color,
        polygon: polygon,
        area: area,
      });

      // Calculate treats
      var treatsEarned = Math.round(area);
      var isGeoBonus = geo.polygonContainsAnyGeoPoint(polygon, state.geoPoints);
      if (isGeoBonus) treatsEarned *= 2;

      var bonusTreats = 0;
      if (stolenCount > 0 && area > C.STEAL_BONUS_MIN_AREA) {
        bonusTreats = C.STEAL_BONUS_TREATS;
      }

      return {
        newTerritories: newTerritories,
        treatsEarned: treatsEarned,
        bonusTreats: bonusTreats,
        isGeoBonus: isGeoBonus,
        stolenCount: stolenCount,
        area: area,
      };
    },

    // Generate simulated rival territories around a center point
    generateRivals: function (center, count) {
      var state = TW.state;
      var rivalBreeds = TW.BREEDS.filter(function (b) { return b.id !== state.selectedBreed.id; });
      count = count || 4;

      var toRad = function (d) { return d * Math.PI / 180; };
      var conv = geo.metersToLngLat(center[1]);

      for (var i = 0; i < count; i++) {
        var breed = rivalBreeds[i % rivalBreeds.length];
        var angleDeg = (i / count) * 360;
        var distM = 150 + Math.random() * 300;

        var cLng = center[0] + (distM * Math.cos(toRad(angleDeg))) / conv.mPerDegLng;
        var cLat = center[1] + (distM * Math.sin(toRad(angleDeg))) / conv.mPerDegLat;

        var numPts = 6 + Math.floor(Math.random() * 4);
        var radius = 30 + Math.random() * 60;
        var polygon = [];

        for (var j = 0; j < numPts; j++) {
          var angle = (j / numPts) * 2 * Math.PI;
          var r = radius * (0.7 + Math.random() * 0.6);
          polygon.push([
            cLng + (r * Math.cos(angle)) / conv.mPerDegLng,
            cLat + (r * Math.sin(angle)) / conv.mPerDegLat,
          ]);
        }
        polygon.push(polygon[0]);

        state.territories.push({
          id: TW.uid(),
          breedId: breed.id,
          color: breed.color,
          polygon: polygon,
          area: geo.polygonAreaM2(polygon),
        });
      }
    },

    // Calculate overlap ratio between two polygons
    _calculateOverlap: function (existingPoly, newPoly) {
      var overlapCount = 0;
      for (var i = 0; i < existingPoly.length; i++) {
        if (geo.pointInPolygon(existingPoly[i], newPoly)) overlapCount++;
      }

      var reverseCount = 0;
      for (var i = 0; i < newPoly.length; i++) {
        if (geo.pointInPolygon(newPoly[i], existingPoly)) reverseCount++;
      }

      return Math.max(
        overlapCount / existingPoly.length,
        reverseCount / newPoly.length
      );
    },
  };
})();
