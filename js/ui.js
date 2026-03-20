/* ============================================
   ui.js — DOM references, screens, toasts, HUD,
           scoreboard, profile, breed cards
   ============================================ */

(function () {
  const TW = window.TW;
  const BREEDS = TW.BREEDS;
  const state = TW.state;

  var $ = function (sel) { return document.querySelector(sel); };

  // ---- DOM references (cached once) ----
  var els = null;

  function cacheEls() {
    els = {
      loading:         $('#loading-overlay'),
      titleScreen:     $('#title-screen'),
      breedScreen:     $('#breed-screen'),
      locationScreen:  $('#location-screen'),
      gameScreen:      $('#game-screen'),
      profileScreen:   $('#profile-screen'),
      btnGrantLoc:     $('#btn-grant-location'),
      btnSkipLoc:      $('#btn-skip-location'),
      breedGrid:       $('#breed-grid'),
      btnPlay:         $('#btn-play'),
      btnStart:        $('#btn-start'),
      btnMark:         $('#btn-mark'),
      btnCloseLoop:    $('#btn-close-loop'),
      demoToggle:      $('#demo-toggle'),
      gpsStatus:       $('#gps-status'),
      gpsText:         $('#gps-text'),
      hudBreedIcon:    $('#hud-breed-icon'),
      hudBreedName:    $('#hud-breed-name'),
      hudTerritories:  $('#hud-territories'),
      hudArea:         $('#hud-area'),
      hudTreats:       $('#hud-treats'),
      toastContainer:  $('#toast-container'),
      territoryPopup:  $('#territory-popup'),
      popupText:       $('#popup-text'),
      btnBack:         $('#btn-back'),
      scoreboard:      $('#scoreboard'),
      scoreboardList:  $('#scoreboard-list'),
      btnScoreboard:   $('#btn-scoreboard'),
      btnCloseScore:   $('#btn-close-scoreboard'),
      btnProfile:      $('#btn-profile'),
      profileAvatar:   $('#profile-avatar'),
      profileBreedName:$('#profile-breed-name'),
      profileBreedColor:$('#profile-breed-color'),
      profileStats:    $('#profile-stats'),
      btnProfileBack:  $('#btn-profile-back'),
      breedLockMsg:    $('#breed-lock-msg'),
    };
  }

  // ---- Screen management ----
  function showScreen(name) {
    state.screen = name;
    var screens = {
      title: els.titleScreen,
      breed: els.breedScreen,
      location: els.locationScreen,
      game: els.gameScreen,
      profile: els.profileScreen,
    };
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('hidden', key !== name);
      screens[key].classList.toggle('visible', key === name);
    });
  }

  // ---- Toast notifications ----
  function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'toastOut 300ms ease forwards';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  // ---- Territory info popup ----
  function showTerritoryPopup(point, text, color) {
    els.popupText.textContent = text;
    els.territoryPopup.style.left = point.x + 'px';
    els.territoryPopup.style.top = (point.y - 50) + 'px';
    els.territoryPopup.style.borderColor = color;
    els.territoryPopup.querySelector('svg').style.color = color;
    els.territoryPopup.classList.add('visible');
    setTimeout(function () { els.territoryPopup.classList.remove('visible'); }, 2000);
  }

  // ---- GPS status pill ----
  function setGPSStatus(status, text) {
    els.gpsStatus.className = 'gps-status ' + status;
    els.gpsText.textContent = text;
  }

  // ---- HUD updates ----
  function setupHUD() {
    var b = state.selectedBreed;
    if (!b) return;
    els.hudBreedIcon.innerHTML = '<use href="#' + b.icon + '"/>';
    els.hudBreedIcon.style.color = b.color;
    els.hudBreedName.textContent = b.name;
    els.hudBreedName.style.color = b.color;
    updateHUD();
  }

  function updateHUD() {
    if (!state.selectedBreed) return;
    var my = state.territories.filter(function (t) { return t.breedId === state.selectedBreed.id; });
    var totalArea = my.reduce(function (sum, t) { return sum + t.area; }, 0);

    els.hudTerritories.textContent = my.length;
    els.hudArea.textContent = totalArea < 1000
      ? Math.round(totalArea)
      : (totalArea / 1000).toFixed(1) + 'k';
    els.hudTreats.textContent = state.treats >= 1000
      ? (state.treats / 1000).toFixed(1) + 'k'
      : state.treats;
  }

  // ---- Marking button state ----
  function setMarkingUI(isMarking) {
    if (isMarking) {
      els.btnMark.classList.add('marking');
      els.btnMark.innerHTML = '<svg width="20" height="20"><use href="#icon-paw"/></svg> Stop Marking';
    } else {
      els.btnMark.classList.remove('marking');
      els.btnMark.innerHTML = '<svg width="20" height="20"><use href="#icon-paw"/></svg> Start Marking';
    }
    els.btnCloseLoop.classList.remove('visible');
  }

  function showCloseLoopButton(show) {
    els.btnCloseLoop.classList.toggle('visible', show);
  }

  // ---- Loading overlay ----
  function showLoading() { els.loading.classList.remove('hidden'); }
  function hideLoading() { els.loading.classList.add('hidden'); }

  // ---- Demo toggle visual ----
  function setDemoActive(active) {
    els.demoToggle.classList.toggle('active', active);
  }

  // ---- Location button reset ----
  function setLocationButtonWaiting() {
    els.btnGrantLoc.disabled = true;
    els.btnGrantLoc.textContent = 'Waiting for permission...';
  }

  function resetLocationButton() {
    els.btnGrantLoc.disabled = false;
    els.btnGrantLoc.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Share My Location';
  }

  function setLocationButtonRetry() {
    els.btnGrantLoc.disabled = false;
    els.btnGrantLoc.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Try Again';
  }

  // ---- Breed cards ----
  function buildBreedCards() {
    var locked = isBreedLocked();
    var currentId = state.selectedBreed ? state.selectedBreed.id : null;

    els.breedGrid.innerHTML = BREEDS.map(function (b) {
      var extra = '';
      var lockHtml = '';
      if (locked && currentId) {
        if (b.id === currentId) {
          extra = 'current-locked selected';
          lockHtml = '<svg class="breed-lock-icon" viewBox="0 0 24 24"><use href="#icon-lock"/></svg>';
        } else {
          extra = 'locked';
        }
      }
      return '<div class="breed-card ' + extra + '" data-breed="' + b.id + '" data-testid="breed-card-' + b.id + '">' +
        lockHtml +
        '<svg class="breed-icon" style="color:' + b.color + '"><use href="#' + b.icon + '"/></svg>' +
        '<div class="breed-name"><div class="breed-swatch" style="background:' + b.color + '"></div>' +
        b.name + '</div></div>';
    }).join('');

    // Lock message
    if (locked) {
      var daysLeft = getDaysUntilBreedChange();
      els.breedLockMsg.innerHTML = '<svg width="14" height="14" style="color:#FFB300"><use href="#icon-lock"/></svg> You can change breed in ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '');
      els.breedLockMsg.classList.remove('hidden');
      state.selectedBreed = BREEDS.find(function (b) { return b.id === currentId; });
      els.btnStart.disabled = false;
    } else {
      els.breedLockMsg.classList.add('hidden');
    }

    // Card click handlers
    els.breedGrid.querySelectorAll('.breed-card').forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.classList.contains('locked')) return;
        els.breedGrid.querySelectorAll('.breed-card').forEach(function (c) {
          c.classList.remove('selected', 'current-locked');
        });
        card.classList.add('selected');
        state.selectedBreed = BREEDS.find(function (b) { return b.id === card.dataset.breed; });
        els.btnStart.disabled = false;
      });
    });
  }

  function isBreedLocked() {
    if (!state.breedChosenAt) return false;
    return (Date.now() - state.breedChosenAt) < TW.BREED_LOCK_MS;
  }

  function getDaysUntilBreedChange() {
    if (!state.breedChosenAt) return 0;
    var remaining = TW.BREED_LOCK_MS - (Date.now() - state.breedChosenAt);
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }

  // ---- Scoreboard ----
  function openScoreboard() {
    updateScoreboardData();
    els.scoreboard.classList.remove('hidden');
  }

  function closeScoreboard() {
    els.scoreboard.classList.add('hidden');
  }

  function updateScoreboardData() {
    var stats = {};
    BREEDS.forEach(function (b) { stats[b.id] = { breed: b, turfs: 0, area: 0, treats: 0 }; });

    state.territories.forEach(function (t) {
      if (stats[t.breedId]) {
        stats[t.breedId].turfs++;
        stats[t.breedId].area += t.area || 0;
      }
    });

    if (state.selectedBreed && stats[state.selectedBreed.id]) {
      stats[state.selectedBreed.id].treats = state.treats;
    }

    var sorted = Object.values(stats).sort(function (a, b) { return b.area - a.area; });

    els.scoreboardList.innerHTML = sorted.map(function (entry, i) {
      var b = entry.breed;
      var isCurrent = state.selectedBreed && b.id === state.selectedBreed.id;
      var areaStr = entry.area >= 1000
        ? (entry.area / 1000).toFixed(1) + '<span class="scoreboard-area-unit">km²</span>'
        : Math.round(entry.area) + '<span class="scoreboard-area-unit">m²</span>';
      var treatsStr = entry.treats > 0
        ? '<span class="scoreboard-treats"><svg width="10" height="10" style="color:#FFB300"><use href="#icon-bone"/></svg>' + entry.treats + '</span>'
        : '';
      return '<div class="scoreboard-row ' + (isCurrent ? 'current' : '') + '">' +
        '<span class="scoreboard-rank">' + (i + 1) + '</span>' +
        '<svg class="scoreboard-breed-icon" style="color:' + b.color + '"><use href="#' + b.icon + '"/></svg>' +
        '<span class="scoreboard-breed-name">' + b.name + '</span>' +
        treatsStr +
        '<span class="scoreboard-turfs">' + entry.turfs + ' turf' + (entry.turfs !== 1 ? 's' : '') + '</span>' +
        '<span class="scoreboard-area">' + areaStr + '</span></div>';
    }).join('');
  }

  // ---- Profile ----
  function openProfile() {
    if (!state.selectedBreed) return;
    var b = state.selectedBreed;

    els.profileAvatar.innerHTML = '<svg style="color:' + b.color + '"><use href="#' + b.icon + '"/></svg>';
    els.profileBreedName.textContent = b.name;
    els.profileBreedName.style.color = b.color;
    els.profileBreedColor.style.background = b.color;

    var my = state.territories.filter(function (t) { return t.breedId === b.id; });
    var totalArea = my.reduce(function (sum, t) { return sum + t.area; }, 0);
    var chosenDate = state.breedChosenAt ? new Date(state.breedChosenAt).toLocaleDateString() : 'Just now';
    var daysLeft = getDaysUntilBreedChange();
    var daysStr = daysLeft > 0 ? daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') : 'Available now';

    els.profileStats.innerHTML =
      '<div class="profile-stat-row"><span class="profile-stat-label"><svg width="14" height="14" style="color:#FFB300"><use href="#icon-bone"/></svg> Total Treats</span><span class="profile-stat-value">' + state.treats + '</span></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-label">Total Territory</span><span class="profile-stat-value">' + Math.round(totalArea) + ' m²</span></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-label">Number of Turfs</span><span class="profile-stat-value">' + my.length + '</span></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-label">Breed Chosen</span><span class="profile-stat-value">' + chosenDate + '</span></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-label">Breed Change</span><span class="profile-stat-value">' + daysStr + '</span></div>';

    showScreen('profile');
  }

  function closeProfile() {
    showScreen('game');
  }

  // ---- Public API ----
  TW.ui = {
    cacheEls:              cacheEls,
    els:                   function () { return els; },
    showScreen:            showScreen,
    showToast:             showToast,
    showTerritoryPopup:    showTerritoryPopup,
    setGPSStatus:          setGPSStatus,
    setupHUD:              setupHUD,
    updateHUD:             updateHUD,
    setMarkingUI:          setMarkingUI,
    showCloseLoopButton:   showCloseLoopButton,
    showLoading:           showLoading,
    hideLoading:           hideLoading,
    setDemoActive:         setDemoActive,
    setLocationButtonWaiting: setLocationButtonWaiting,
    resetLocationButton:   resetLocationButton,
    setLocationButtonRetry: setLocationButtonRetry,
    buildBreedCards:       buildBreedCards,
    isBreedLocked:         isBreedLocked,
    getDaysUntilBreedChange: getDaysUntilBreedChange,
    openScoreboard:        openScoreboard,
    closeScoreboard:       closeScoreboard,
    openProfile:           openProfile,
    closeProfile:          closeProfile,
  };
})();
