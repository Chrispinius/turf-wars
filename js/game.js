/* ============================================
   game.js — Game flow orchestration
   Connects modules: marking, loop closing,
   demo mode, launch, back-to-menu
   ============================================ */

(function () {
  const TW = window.TW;
  const state = TW.state;
  const geo = TW.geo;
  const ui = TW.ui;

  TW.game = {
    // ---- Marking flow ----
    startMarking: function () {
      if (!state.userLocation && !state.demoMode) return;
      state.isMarking = true;
      state.trailCoords = [];
      state.markStartPoint = null;

      ui.setMarkingUI(true);

      if (!state.demoMode && state.userLocation) {
        this.addTrailPoint(state.userLocation.lng, state.userLocation.lat);
      }
      ui.showToast('Marking started! Walk to draw your territory.', 'info');
    },

    stopMarking: function () {
      state.isMarking = false;
      state.trailCoords = [];
      state.markStartPoint = null;

      ui.setMarkingUI(false);
      TW.map.updateTrail([]);
      TW.map.clearStartPoint();
    },

    addTrailPoint: function (lng, lat) {
      if (state.trailCoords.length > 0) {
        var last = state.trailCoords[state.trailCoords.length - 1];
        if (geo.haversine(last[0], last[1], lng, lat) < TW.TRAIL_MIN_DISTANCE) return;
      }

      state.trailCoords.push([lng, lat]);

      if (state.trailCoords.length === 1) {
        state.markStartPoint = [lng, lat];
        TW.map.showStartPoint(lng, lat);
      }

      TW.map.updateTrail(state.trailCoords);

      // Check if close to start for close-loop button
      if (state.trailCoords.length >= TW.MIN_TRAIL_POINTS && state.markStartPoint) {
        var dist = geo.haversine(lng, lat, state.markStartPoint[0], state.markStartPoint[1]);
        ui.showCloseLoopButton(dist < TW.CLOSE_LOOP_DISTANCE);
      }
    },

    closeLoop: function () {
      var result = TW.territory.processLoop(state.trailCoords);
      if (!result) {
        ui.showToast('Territory too small! Walk a bigger loop.', 'info');
        return;
      }

      state.territories = result.newTerritories;
      state.treats += result.treatsEarned + result.bonusTreats;

      TW.map.updateTerritories();
      ui.updateHUD();
      TW.storage.saveGame();

      // Toasts
      if (result.isGeoBonus) {
        ui.showToast('Bonus Zone! 2x treats! 🦴', 'claimed');
      }
      if (result.stolenCount > 0) {
        ui.showToast('Territory Stolen! +' + result.treatsEarned + ' 🦴 + ' + result.bonusTreats + ' bonus', 'stolen');
      } else {
        ui.showToast('Territory Claimed! ' + Math.round(result.area) + 'm² — +' + result.treatsEarned + ' 🦴', 'claimed');
      }

      this.stopMarking();
    },

    // ---- Demo mode ----
    toggleDemoMode: function () {
      state.demoMode = !state.demoMode;
      ui.setDemoActive(state.demoMode);

      if (state.demoMode) {
        ui.setGPSStatus('active', 'Demo Mode');
        ui.showToast('Demo Mode ON — tap the map to place waypoints', 'info');
        if (!state.userLocation) {
          var center = state.map.getCenter();
          state.userLocation = { lng: center.lng, lat: center.lat };
          TW.map.updatePlayerMarker([center.lng, center.lat]);
          state.map.flyTo({ center: [center.lng, center.lat], zoom: 15 });
        }
      } else {
        ui.showToast('Demo Mode OFF — using GPS', 'info');
        if (state.isMarking) this.stopMarking();
      }
    },

    // ---- Launch / resume ----
    launch: function (center) {
      ui.showScreen('game');
      ui.setupHUD();
      ui.showLoading();

      // Welcome back toast for returning players
      if (state._isReturning) {
        setTimeout(function () {
          ui.showToast('Welcome back, ' + state.selectedBreed.name + '!', 'info');
        }, 1200);
        state._isReturning = false;
      }

      if (center) {
        TW.map.init(center);
        TW.gps.startTracking();
      } else {
        TW.map.init(state.defaultCenter);
        ui.setGPSStatus('error', 'No GPS — Demo Mode');
        state.demoMode = true;
        ui.setDemoActive(true);
      }
    },

    // ---- Back to menu ----
    backToMenu: function () {
      TW.gps.stopTracking();
      if (state.isMarking) this.stopMarking();
      TW.map.destroy();
      TW.resetVolatileState();
      ui.setDemoActive(false);
      ui.resetLocationButton();
      ui.buildBreedCards();
      ui.showScreen('breed');
    },
  };
})();
