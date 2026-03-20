/* ============================================
   config.js — Constants & breed definitions
   ============================================ */

const TW = window.TW || {};
window.TW = TW;

TW.BREEDS = Object.freeze([
  { id: 'husky',    name: 'Husky',            color: '#4FC3F7', icon: 'breed-husky' },
  { id: 'bulldog',  name: 'Bulldog',          color: '#E53935', icon: 'breed-bulldog' },
  { id: 'golden',   name: 'Golden Retriever', color: '#FFB300', icon: 'breed-golden' },
  { id: 'shepherd', name: 'German Shepherd',  color: '#43A047', icon: 'breed-shepherd' },
  { id: 'dalmatian',name: 'Dalmatian',        color: '#7E57C2', icon: 'breed-dalmatian' },
  { id: 'shiba',    name: 'Shiba Inu',        color: '#FF7043', icon: 'breed-shiba' },
]);

TW.DEFAULT_CENTER = [-73.9857, 40.7484]; // NYC Times Square fallback

TW.COOKIE_MAX_AGE = 31536000; // 1 year in seconds
TW.BREED_LOCK_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

TW.MIN_TERRITORY_AREA = 10;     // m² — smaller loops are rejected
TW.TRAIL_MIN_DISTANCE = 2;      // meters — ignore closer GPS points
TW.CLOSE_LOOP_DISTANCE = 30;    // meters — distance to start to offer loop close
TW.MIN_TRAIL_POINTS = 4;        // minimum points before allowing close loop
TW.OVERLAP_THRESHOLD = 0.3;     // 30% overlap to count as stolen
TW.STEAL_BONUS_MIN_AREA = 10;   // m² — minimum area for steal bonus
TW.STEAL_BONUS_TREATS = 5;      // bonus treats for stealing territory

TW.OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
TW.GEO_SEARCH_RADIUS = 500;     // meters radius for POI search

TW.GPS_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 10000,
});

TW.GPS_PROMPT_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
});
