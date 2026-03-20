/* ============================================
   app.js — Entry point & event wiring
   Glues all modules together
   ============================================ */

(function () {
  const TW = window.TW;
  const state = TW.state;

  function init() {
    // Cache DOM references
    TW.ui.cacheEls();
    var els = TW.ui.els();

    // Try to restore returning player
    var isReturning = TW.storage.loadGame();

    // Build breed selection cards
    TW.ui.buildBreedCards();

    // ---- Wire up event bus listeners ----

    // GPS updates → move player, add trail
    TW.on('gps:update', function (loc) {
      state.userLocation = loc;
      TW.map.updatePlayerMarker([loc.lng, loc.lat]);
      if (state.isMarking && !state.demoMode) {
        TW.game.addTrailPoint(loc.lng, loc.lat);
      }
    });

    TW.on('gps:status', function (d) {
      TW.ui.setGPSStatus(d.status, d.text);
    });

    // Map ready → generate rivals, restore territories, fetch geo-points
    TW.on('map:ready', function (center) {
      TW.ui.hideLoading();
      TW.territory.generateRivals(center);

      // Restore saved territories if returning
      if (state.territories.length > 0) {
        TW.map.updateTerritories();
        TW.ui.updateHUD();
      }

      // Fetch OSM bonus zones (non-blocking)
      TW.api.fetchGeoPoints(center[1], center[0]).then(function (points) {
        state.geoPoints = points;
        if (points.length > 0) TW.map.addGeoPointMarkers();
      });

      window._mapReady = true;
    });

    // Territory tapped → show popup
    TW.on('territory:tapped', function (d) {
      TW.ui.showTerritoryPopup(d.point, d.name + ' — ' + d.area + ' m²', d.color);
    });

    // Demo waypoint → move marker + add trail
    TW.on('demo:waypoint', function (loc) {
      state.userLocation = loc;
      TW.map.updatePlayerMarker([loc.lng, loc.lat]);
      TW.game.addTrailPoint(loc.lng, loc.lat);
    });

    // ---- Wire up DOM event listeners ----

    // Title → Breed
    els.btnPlay.addEventListener('click', function () {
      TW.ui.showScreen('breed');
    });

    // Breed → Location permission
    els.btnStart.addEventListener('click', function () {
      if (!state.selectedBreed) return;
      if (!state.breedChosenAt || !TW.ui.isBreedLocked()) {
        state.breedChosenAt = Date.now();
      }
      TW.storage.saveGame();
      TW.ui.showScreen('location');
    });

    // Grant Location
    els.btnGrantLoc.addEventListener('click', function () {
      TW.ui.setLocationButtonWaiting();
      TW.gps.requestPermission()
        .then(function (center) {
          state.defaultCenter = center;
          state.locationGranted = true;
          TW.game.launch(center);
        })
        .catch(function (err) {
          console.warn('Geolocation error:', err.code, err.message);
          TW.ui.setLocationButtonRetry();
          if (err.code === 1) {
            TW.ui.showToast('Location denied. Check Settings > Safari > Location, or use Demo Mode below.', 'warning');
          } else {
            TW.ui.showToast('Could not get location. Try again or use Demo Mode.', 'warning');
          }
        });
    });

    // Skip location → demo mode
    els.btnSkipLoc.addEventListener('click', function () {
      state.skipLocation = true;
      TW.game.launch(null);
    });

    // Marking toggle
    els.btnMark.addEventListener('click', function () {
      if (state.isMarking) {
        TW.game.stopMarking();
      } else {
        TW.game.startMarking();
      }
    });

    // Close loop
    els.btnCloseLoop.addEventListener('click', function () {
      TW.game.closeLoop();
    });

    // Demo toggle
    els.demoToggle.addEventListener('click', function () {
      TW.game.toggleDemoMode();
    });

    // Back to menu
    els.btnBack.addEventListener('click', function () {
      TW.game.backToMenu();
    });

    // Scoreboard
    els.btnScoreboard.addEventListener('click', function () { TW.ui.openScoreboard(); });
    els.btnCloseScore.addEventListener('click', function () { TW.ui.closeScoreboard(); });
    els.scoreboard.addEventListener('click', function (e) {
      if (e.target === els.scoreboard) TW.ui.closeScoreboard();
    });

    // Profile
    els.btnProfile.addEventListener('click', function () { TW.ui.openProfile(); });
    els.btnProfileBack.addEventListener('click', function () { TW.ui.closeProfile(); });

    // ---- Returning player flow ----
    if (isReturning) {
      TW.ui.showScreen('location');
      state._isReturning = true;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
