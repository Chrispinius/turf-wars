/* ============================================
   gps.js — Geolocation tracking
   ============================================ */

(function () {
  const TW = window.TW;
  const state = TW.state;

  TW.gps = {
    // Start continuous GPS tracking
    startTracking: function () {
      if (!navigator.geolocation) {
        TW.emit('gps:status', { status: 'error', text: 'GPS unavailable' });
        TW.emit('gps:update', { lng: state.defaultCenter[0], lat: state.defaultCenter[1] });
        return;
      }

      TW.emit('gps:status', { status: 'searching', text: 'Finding GPS...' });

      state.watchId = navigator.geolocation.watchPosition(
        function (pos) {
          var lng = pos.coords.longitude;
          var lat = pos.coords.latitude;
          TW.emit('gps:status', { status: 'active', text: 'GPS Active' });
          TW.emit('gps:update', { lng: lng, lat: lat });
        },
        function (err) {
          console.warn('GPS error:', err.message);
          TW.emit('gps:status', { status: 'error', text: 'GPS Error' });
          if (!state.userLocation) {
            TW.emit('gps:update', { lng: state.defaultCenter[0], lat: state.defaultCenter[1] });
          }
        },
        TW.GPS_OPTIONS
      );
    },

    // Stop GPS tracking
    stopTracking: function () {
      if (state.watchId !== null) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
      }
    },

    // Request one-time location (for the permission prompt)
    requestPermission: function () {
      return new Promise(function (resolve, reject) {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            resolve([pos.coords.longitude, pos.coords.latitude]);
          },
          function (err) {
            reject(err);
          },
          TW.GPS_PROMPT_OPTIONS
        );
      });
    },
  };
})();
