/* ============================================
   TURF WARS — Main Application
   ============================================ */

// ============================================
// 1. STATE MANAGEMENT
// ============================================

const BREEDS = [
  { id: 'husky',    name: 'Husky',            color: '#4FC3F7', icon: 'breed-husky' },
  { id: 'bulldog',  name: 'Bulldog',          color: '#E53935', icon: 'breed-bulldog' },
  { id: 'golden',   name: 'Golden Retriever', color: '#FFB300', icon: 'breed-golden' },
  { id: 'shepherd', name: 'German Shepherd',  color: '#43A047', icon: 'breed-shepherd' },
  { id: 'dalmatian',name: 'Dalmatian',        color: '#7E57C2', icon: 'breed-dalmatian' },
  { id: 'shiba',    name: 'Shiba Inu',        color: '#FF7043', icon: 'breed-shiba' },
];

const state = {
  screen: 'title',           // title | breed | game
  selectedBreed: null,       // breed object
  map: null,                 // MapLibre instance
  userLocation: null,        // { lng, lat }
  watchId: null,             // geolocation watch ID

  // Marking state
  isMarking: false,
  trailCoords: [],           // [[lng, lat], ...]
  markStartPoint: null,      // [lng, lat]

  // Territories
  territories: [],           // { id, breedId, color, polygon: [[lng,lat],...], area }
  territoryCounter: 0,

  // Demo mode
  demoMode: false,
  demoMarker: null,
  locationGranted: false,
  skipLocation: false,

  // Default center (NYC Times Square) as fallback
  defaultCenter: [-73.9857, 40.7484],
};

// ============================================
// 2. DOM REFERENCES
// ============================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  loading:       $('#loading-overlay'),
  titleScreen:   $('#title-screen'),
  breedScreen:   $('#breed-screen'),
  locationScreen:$('#location-screen'),
  gameScreen:    $('#game-screen'),
  btnGrantLoc:   $('#btn-grant-location'),
  btnSkipLoc:    $('#btn-skip-location'),
  breedGrid:     $('#breed-grid'),
  btnPlay:       $('#btn-play'),
  btnStart:      $('#btn-start'),
  btnMark:       $('#btn-mark'),
  btnCloseLoop:  $('#btn-close-loop'),
  demoToggle:    $('#demo-toggle'),
  gpsStatus:     $('#gps-status'),
  gpsText:       $('#gps-text'),
  hudBreedIcon:  $('#hud-breed-icon'),
  hudBreedName:  $('#hud-breed-name'),
  hudTerritories:$('#hud-territories'),
  hudArea:       $('#hud-area'),
  toastContainer:$('#toast-container'),
  territoryPopup:$('#territory-popup'),
  popupText:     $('#popup-text'),
  btnBack:       $('#btn-back'),
  scoreboard:    $('#scoreboard'),
  scoreboardList:$('#scoreboard-list'),
  btnScoreboard: $('#btn-scoreboard'),
  btnCloseScore: $('#btn-close-scoreboard'),
  map:           $('#map'),
};

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

// Haversine distance in meters
function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shoelace formula for polygon area in m² (from lng/lat coords)
function polygonAreaM2(coords) {
  // Convert to local meters from centroid
  if (coords.length < 3) return 0;
  const cLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const cLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const toRad = (d) => d * Math.PI / 180;
  const cosLat = Math.cos(toRad(cLat));
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * cosLat;

  const points = coords.map(c => [
    (c[0] - cLng) * mPerDegLng,
    (c[1] - cLat) * mPerDegLat
  ]);

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area / 2);
}

// Point-in-polygon (ray casting)
function pointInPolygon(point, polygon) {
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
}

// Generate a unique ID
function uid() {
  return 't_' + (++state.territoryCounter);
}

// ============================================
// 4. SCREEN MANAGEMENT
// ============================================

function showScreen(name) {
  state.screen = name;
  const screens = { title: els.titleScreen, breed: els.breedScreen, location: els.locationScreen, game: els.gameScreen };
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
    el.classList.toggle('visible', key === name);
  });
}

// ============================================
// 5. BREED SELECTION
// ============================================

function buildBreedCards() {
  els.breedGrid.innerHTML = BREEDS.map(b => `
    <div class="breed-card" data-breed="${b.id}" data-testid="breed-card-${b.id}">
      <svg class="breed-icon" style="color:${b.color}"><use href="#${b.icon}"/></svg>
      <div class="breed-name">
        <div class="breed-swatch" style="background:${b.color}"></div>
        ${b.name}
      </div>
    </div>
  `).join('');

  els.breedGrid.querySelectorAll('.breed-card').forEach(card => {
    card.addEventListener('click', () => {
      els.breedGrid.querySelectorAll('.breed-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const breedId = card.dataset.breed;
      state.selectedBreed = BREEDS.find(b => b.id === breedId);
      els.btnStart.disabled = false;
    });
  });
}

// ============================================
// 6. MAP SETUP
// ============================================

function initMap(center) {
  state.map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: center,
    zoom: 14,
    attributionControl: false,
    pitchWithRotate: false,
    dragRotate: false,
  });

  state.map.on('load', () => {
    // Add trail source
    state.map.addSource('trail', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
    });
    state.map.addLayer({
      id: 'trail-line',
      type: 'line',
      source: 'trail',
      paint: {
        'line-color': state.selectedBreed.color,
        'line-width': 4,
        'line-dasharray': [2, 2],
        'line-opacity': 0.9,
      }
    });

    // Add territory source
    state.map.addSource('territories', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    state.map.addLayer({
      id: 'territory-fill',
      type: 'fill',
      source: 'territories',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.3,
      }
    });
    state.map.addLayer({
      id: 'territory-border',
      type: 'line',
      source: 'territories',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.5,
        'line-opacity': 0.8,
      }
    });

    // Add start point marker source
    state.map.addSource('start-point', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    state.map.addLayer({
      id: 'start-point-circle',
      type: 'circle',
      source: 'start-point',
      paint: {
        'circle-radius': 8,
        'circle-color': state.selectedBreed.color,
        'circle-opacity': 0.6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      }
    });

    // Territory click handler
    state.map.on('click', 'territory-fill', (e) => {
      if (e.features && e.features.length) {
        const feat = e.features[0];
        const breedId = feat.properties.breedId;
        const breed = BREEDS.find(b => b.id === breedId);
        const area = Math.round(feat.properties.area);
        if (breed) {
          showTerritoryPopup(e.point, `${breed.name} — ${area} m²`, breed.color);
        }
      }
    });

    // Demo mode map click
    state.map.on('click', (e) => {
      if (!state.demoMode) return;
      // Don't handle territory clicks in demo mode marking
      if (state.isMarking) {
        addDemoWaypoint(e.lngLat.lng, e.lngLat.lat);
      }
    });

    // Hide loading
    els.loading.classList.add('hidden');

    // Generate rival territories
    generateRivalTerritories(center);

    window._mapReady = true;
  });
}

// ============================================
// 7. PLAYER MARKER
// ============================================

let playerMarkerEl = null;
let playerMapMarker = null;

function createPlayerMarker(lngLat) {
  if (playerMapMarker) {
    playerMapMarker.setLngLat(lngLat);
    return;
  }

  playerMarkerEl = document.createElement('div');
  playerMarkerEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 64 64" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))"><use href="#icon-paw" fill="${state.selectedBreed.color}"/></svg>`;
  playerMarkerEl.style.cursor = 'pointer';

  playerMapMarker = new maplibregl.Marker({ element: playerMarkerEl, anchor: 'center' })
    .setLngLat(lngLat)
    .addTo(state.map);
}

// ============================================
// 8. GPS TRACKING
// ============================================

function startGPSTracking() {
  if (!navigator.geolocation) {
    setGPSStatus('error', 'GPS unavailable');
    // Fall back to default
    onLocationUpdate(state.defaultCenter[0], state.defaultCenter[1]);
    return;
  }

  setGPSStatus('searching', 'Finding GPS...');

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { longitude: lng, latitude: lat } = pos.coords;
      setGPSStatus('active', 'GPS Active');
      onLocationUpdate(lng, lat);
    },
    (err) => {
      console.warn('GPS error:', err.message);
      setGPSStatus('error', 'GPS Error');
      // Use default location
      if (!state.userLocation) {
        onLocationUpdate(state.defaultCenter[0], state.defaultCenter[1]);
      }
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function setGPSStatus(status, text) {
  els.gpsStatus.className = 'gps-status ' + status;
  els.gpsText.textContent = text;
}

function onLocationUpdate(lng, lat) {
  state.userLocation = { lng, lat };

  createPlayerMarker([lng, lat]);

  if (state.isMarking && !state.demoMode) {
    addTrailPoint(lng, lat);
  }
}

// ============================================
// 9. TRAIL DRAWING
// ============================================

function startMarking() {
  if (!state.userLocation && !state.demoMode) return;

  state.isMarking = true;
  state.trailCoords = [];
  state.markStartPoint = null;

  els.btnMark.classList.add('marking');
  els.btnMark.innerHTML = `<svg width="20" height="20"><use href="#icon-paw"/></svg> Stop Marking`;
  els.btnCloseLoop.classList.remove('visible');

  if (!state.demoMode && state.userLocation) {
    addTrailPoint(state.userLocation.lng, state.userLocation.lat);
  }

  showToast('Marking started! Walk to draw your territory.', 'info');
}

function stopMarking() {
  state.isMarking = false;
  state.trailCoords = [];
  state.markStartPoint = null;

  els.btnMark.classList.remove('marking');
  els.btnMark.innerHTML = `<svg width="20" height="20"><use href="#icon-paw"/></svg> Start Marking`;
  els.btnCloseLoop.classList.remove('visible');

  // Clear trail
  updateTrailOnMap([]);
  clearStartPoint();
}

function addTrailPoint(lng, lat) {
  if (state.trailCoords.length > 0) {
    const last = state.trailCoords[state.trailCoords.length - 1];
    const dist = haversine(last[0], last[1], lng, lat);
    if (dist < 2) return; // ignore very close points
  }

  state.trailCoords.push([lng, lat]);

  if (state.trailCoords.length === 1) {
    state.markStartPoint = [lng, lat];
    showStartPoint(lng, lat);
  }

  updateTrailOnMap(state.trailCoords);

  // Check if close enough to start to offer close loop
  if (state.trailCoords.length >= 4 && state.markStartPoint) {
    const dist = haversine(lng, lat, state.markStartPoint[0], state.markStartPoint[1]);
    if (dist < 30) {
      els.btnCloseLoop.classList.add('visible');
    } else {
      els.btnCloseLoop.classList.remove('visible');
    }
  }
}

function addDemoWaypoint(lng, lat) {
  // In demo mode, also move the player marker
  state.userLocation = { lng, lat };
  createPlayerMarker([lng, lat]);
  addTrailPoint(lng, lat);
}

function updateTrailOnMap(coords) {
  if (!state.map || !state.map.getSource('trail')) return;
  state.map.getSource('trail').setData({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords }
  });
}

function showStartPoint(lng, lat) {
  if (!state.map || !state.map.getSource('start-point')) return;
  state.map.getSource('start-point').setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] }
    }]
  });
}

function clearStartPoint() {
  if (!state.map || !state.map.getSource('start-point')) return;
  state.map.getSource('start-point').setData({
    type: 'FeatureCollection',
    features: []
  });
}

// ============================================
// 10. TERRITORY MANAGEMENT
// ============================================

function closeLoop() {
  if (state.trailCoords.length < 4) return;

  // Close the polygon
  const polygon = [...state.trailCoords, state.trailCoords[0]];
  const area = polygonAreaM2(polygon);

  if (area < 10) {
    showToast('Territory too small! Walk a bigger loop.', 'info');
    return;
  }

  // Check for overlaps with existing territories
  let stolenCount = 0;
  const newTerritories = [];

  for (const t of state.territories) {
    // Check if any points of the existing territory are inside the new polygon
    const tCoords = t.polygon;
    let overlapCount = 0;
    for (const pt of tCoords) {
      if (pointInPolygon(pt, polygon)) {
        overlapCount++;
      }
    }

    // Also check if any new polygon points are inside the existing territory
    let reverseOverlapCount = 0;
    for (const pt of polygon) {
      if (pointInPolygon(pt, tCoords)) {
        reverseOverlapCount++;
      }
    }

    const overlapRatio = Math.max(
      overlapCount / tCoords.length,
      reverseOverlapCount / polygon.length
    );

    if (overlapRatio > 0.3 && t.breedId !== state.selectedBreed.id) {
      // Territory is significantly overlapped — steal it
      stolenCount++;
      // Don't add old territory back
    } else {
      newTerritories.push(t);
    }
  }

  // Add new territory
  const newTerritory = {
    id: uid(),
    breedId: state.selectedBreed.id,
    color: state.selectedBreed.color,
    polygon: polygon,
    area: area,
  };
  newTerritories.push(newTerritory);

  state.territories = newTerritories;
  updateTerritoriesOnMap();
  updateHUD();

  // Show toast
  if (stolenCount > 0) {
    showToast(`Territory Stolen! Claimed ${stolenCount} rival turf${stolenCount > 1 ? 's' : ''}!`, 'stolen');
  } else {
    showToast(`Territory Claimed! ${Math.round(area)} m²`, 'claimed');
  }

  // Reset marking
  stopMarking();
}

function updateTerritoriesOnMap() {
  if (!state.map || !state.map.getSource('territories')) return;

  const features = state.territories.map(t => ({
    type: 'Feature',
    properties: {
      id: t.id,
      breedId: t.breedId,
      color: t.color,
      area: t.area,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [t.polygon],
    }
  }));

  state.map.getSource('territories').setData({
    type: 'FeatureCollection',
    features,
  });
}

// ============================================
// 11. UI UPDATES
// ============================================

function updateHUD() {
  const myTerritories = state.territories.filter(t => t.breedId === state.selectedBreed.id);
  const totalArea = myTerritories.reduce((sum, t) => sum + t.area, 0);

  els.hudTerritories.textContent = myTerritories.length;
  els.hudArea.textContent = totalArea < 1000
    ? Math.round(totalArea)
    : (totalArea / 1000).toFixed(1) + 'k';
}

function setupHUD() {
  const b = state.selectedBreed;
  els.hudBreedIcon.innerHTML = `<use href="#${b.icon}"/>`;
  els.hudBreedIcon.style.color = b.color;
  els.hudBreedName.textContent = b.name;
  els.hudBreedName.style.color = b.color;
  updateHUD();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 300ms ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showTerritoryPopup(point, text, color) {
  els.popupText.textContent = text;
  els.territoryPopup.style.left = point.x + 'px';
  els.territoryPopup.style.top = (point.y - 50) + 'px';
  els.territoryPopup.style.borderColor = color;
  els.territoryPopup.querySelector('svg').style.color = color;
  els.territoryPopup.classList.add('visible');

  setTimeout(() => {
    els.territoryPopup.classList.remove('visible');
  }, 2000);
}

// ============================================
// 12. DEMO MODE
// ============================================

function toggleDemoMode() {
  state.demoMode = !state.demoMode;
  els.demoToggle.classList.toggle('active', state.demoMode);

  if (state.demoMode) {
    setGPSStatus('active', 'Demo Mode');
    showToast('Demo Mode ON — tap the map to place waypoints', 'info');

    // If no location yet, use map center
    if (!state.userLocation) {
      const center = state.map.getCenter();
      state.userLocation = { lng: center.lng, lat: center.lat };
      createPlayerMarker([center.lng, center.lat]);
      state.map.flyTo({ center: [center.lng, center.lat], zoom: 15 });
    }
  } else {
    showToast('Demo Mode OFF — using GPS', 'info');
    if (state.isMarking) stopMarking();
  }
}

// ============================================
// 13. SIMULATED RIVAL TERRITORIES
// ============================================

function generateRivalTerritories(center) {
  const rivalBreeds = BREEDS.filter(b => b.id !== state.selectedBreed.id);
  const numRivals = 4;

  for (let i = 0; i < numRivals; i++) {
    const breed = rivalBreeds[i % rivalBreeds.length];
    const angleToCenterDeg = (i / numRivals) * 360;
    const distM = 150 + Math.random() * 300;

    const toRad = (d) => d * Math.PI / 180;
    const cosLat = Math.cos(toRad(center[1]));
    const mPerDegLng = 111320 * cosLat;
    const mPerDegLat = 111320;

    const cLng = center[0] + (distM * Math.cos(toRad(angleToCenterDeg))) / mPerDegLng;
    const cLat = center[1] + (distM * Math.sin(toRad(angleToCenterDeg))) / mPerDegLat;

    // Generate a random polygon (roughly circular with jitter)
    const numPoints = 6 + Math.floor(Math.random() * 4);
    const radius = 30 + Math.random() * 60; // 30-90m
    const polygon = [];

    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * 2 * Math.PI;
      const r = radius * (0.7 + Math.random() * 0.6);
      const pLng = cLng + (r * Math.cos(angle)) / mPerDegLng;
      const pLat = cLat + (r * Math.sin(angle)) / mPerDegLat;
      polygon.push([pLng, pLat]);
    }
    polygon.push(polygon[0]); // close

    const area = polygonAreaM2(polygon);

    state.territories.push({
      id: uid(),
      breedId: breed.id,
      color: breed.color,
      polygon,
      area,
    });
  }

  updateTerritoriesOnMap();
  updateHUD();
}

// ============================================
// 14. LAUNCH GAME
// ============================================

function launchGame(center) {
  showScreen('game');
  setupHUD();
  els.loading.classList.remove('hidden');

  if (center) {
    // We have GPS — launch with location
    initMap(center);
    startGPSTracking();
  } else {
    // No GPS — use default center and auto-enable demo mode
    initMap(state.defaultCenter);
    setGPSStatus('error', 'No GPS — Demo Mode');
    // Auto-enable demo mode
    state.demoMode = true;
    els.demoToggle.classList.add('active');
  }
}

// ============================================
// 15. EVENT LISTENERS
// ============================================

function init() {
  buildBreedCards();

  // Title → Breed
  els.btnPlay.addEventListener('click', () => {
    showScreen('breed');
  });

  // Breed → Location permission screen
  els.btnStart.addEventListener('click', () => {
    if (!state.selectedBreed) return;
    showScreen('location');
  });

  // Grant Location button — triggers GPS prompt
  els.btnGrantLoc.addEventListener('click', () => {
    if (!navigator.geolocation) {
      launchGame(null);
      return;
    }
    // Disable button to prevent double-tap
    els.btnGrantLoc.disabled = true;
    els.btnGrantLoc.textContent = 'Waiting for permission...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = [pos.coords.longitude, pos.coords.latitude];
        state.defaultCenter = center;
        state.locationGranted = true;
        launchGame(center);
      },
      (err) => {
        console.warn('Geolocation error:', err.code, err.message);
        els.btnGrantLoc.disabled = false;
        els.btnGrantLoc.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Try Again';
        if (err.code === 1) {
          showToast('Location denied. Check Settings > Safari > Location, or use Demo Mode below.', 'warning');
        } else {
          showToast('Could not get location. Try again or use Demo Mode.', 'warning');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  // Skip location — go straight to demo mode
  els.btnSkipLoc.addEventListener('click', () => {
    state.skipLocation = true;
    launchGame(null);
  });

  // Start/Stop Marking
  els.btnMark.addEventListener('click', () => {
    if (state.isMarking) {
      stopMarking();
    } else {
      startMarking();
    }
  });

  // Close Loop
  els.btnCloseLoop.addEventListener('click', () => {
    closeLoop();
  });

  // Demo Mode Toggle
  els.demoToggle.addEventListener('click', () => {
    toggleDemoMode();
  });

  // Back to Menu
  els.btnBack.addEventListener('click', () => {
    goBackToMenu();
  });

  // Scoreboard
  els.btnScoreboard.addEventListener('click', () => {
    openScoreboard();
  });

  els.btnCloseScore.addEventListener('click', () => {
    closeScoreboard();
  });

  // Close scoreboard by tapping backdrop
  els.scoreboard.addEventListener('click', (e) => {
    if (e.target === els.scoreboard) closeScoreboard();
  });

  // Loading overlay starts hidden via HTML class
}

// ============================================
// 15. BACK TO MENU
// ============================================

function goBackToMenu() {
  // Stop GPS tracking
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  // Stop marking if active
  if (state.isMarking) stopMarking();

  // Remove the map instance
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  // Reset game state but keep breed selection
  state.userLocation = null;
  state.trailCoords = [];
  state.markStartPoint = null;
  state.isMarking = false;
  state.territories = [];
  state.territoryCounter = 0;
  state.demoMode = false;
  state.locationGranted = false;
  state.skipLocation = false;

  // Reset demo toggle visual
  els.demoToggle.classList.remove('active');

  // Reset location button
  els.btnGrantLoc.disabled = false;
  els.btnGrantLoc.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Share My Location';

  // Go to breed screen so user can switch breed or re-enter
  showScreen('breed');
}

// ============================================
// 16. SCOREBOARD
// ============================================

function openScoreboard() {
  updateScoreboardData();
  els.scoreboard.classList.remove('hidden');
}

function closeScoreboard() {
  els.scoreboard.classList.add('hidden');
}

function updateScoreboardData() {
  // Aggregate territory data by breed
  const breedStats = {};

  BREEDS.forEach(b => {
    breedStats[b.id] = { breed: b, turfs: 0, area: 0 };
  });

  state.territories.forEach(t => {
    if (breedStats[t.breedId]) {
      breedStats[t.breedId].turfs++;
      breedStats[t.breedId].area += t.area || 0;
    }
  });

  // Sort by area descending
  const sorted = Object.values(breedStats).sort((a, b) => b.area - a.area);

  els.scoreboardList.innerHTML = sorted.map((entry, i) => {
    const b = entry.breed;
    const isCurrent = state.selectedBreed && b.id === state.selectedBreed.id;
    const areaStr = entry.area >= 1000
      ? (entry.area / 1000).toFixed(1) + '<span class="scoreboard-area-unit">km²</span>'
      : Math.round(entry.area) + '<span class="scoreboard-area-unit">m²</span>';

    return `
      <div class="scoreboard-row ${isCurrent ? 'current' : ''}">
        <span class="scoreboard-rank">${i + 1}</span>
        <svg class="scoreboard-breed-icon" style="color:${b.color}"><use href="#${b.icon}"/></svg>
        <span class="scoreboard-breed-name">${b.name}</span>
        <span class="scoreboard-turfs">${entry.turfs} turf${entry.turfs !== 1 ? 's' : ''}</span>
        <span class="scoreboard-area">${areaStr}</span>
      </div>
    `;
  }).join('');
}

// ============================================
// 17. STARTUP
// ============================================

document.addEventListener('DOMContentLoaded', init);
