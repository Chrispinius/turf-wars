/* ============================================
   storage.js — Cookie-based persistence
   No localStorage (blocked in sandboxed iframes)
   ============================================ */

(function () {
  const TW = window.TW;
  const BREEDS = TW.BREEDS;

  TW.storage = {
    save: function (key, value) {
      const encoded = encodeURIComponent(String(value));
      document.cookie = `${key}=${encoded}; path=/; max-age=${TW.COOKIE_MAX_AGE}; SameSite=Lax`;
    },

    read: function (key) {
      const match = document.cookie.split('; ').find(c => c.startsWith(key + '='));
      if (!match) return null;
      return decodeURIComponent(match.split('=').slice(1).join('='));
    },

    // Persist current game state to cookies
    saveGame: function () {
      const s = TW.state;
      if (s.selectedBreed) {
        this.save('tw_breed', s.selectedBreed.id);
      }
      if (s.breedChosenAt) {
        this.save('tw_breedChosenAt', s.breedChosenAt);
      }
      this.save('tw_treats', s.treats);

      const simplified = s.territories.map(t => ({
        breedId: t.breedId,
        polygon: t.polygon,
        area: t.area,
      }));
      this.save('tw_territories', JSON.stringify(simplified));
    },

    // Restore game state from cookies — returns true if returning player
    loadGame: function () {
      const breedId = this.read('tw_breed');
      if (!breedId) return false;

      const breed = BREEDS.find(b => b.id === breedId);
      if (!breed) return false;

      const s = TW.state;
      s.selectedBreed = breed;

      const chosenAt = this.read('tw_breedChosenAt');
      if (chosenAt) s.breedChosenAt = parseInt(chosenAt, 10);

      const treatsStr = this.read('tw_treats');
      if (treatsStr) s.treats = parseInt(treatsStr, 10) || 0;

      const terrStr = this.read('tw_territories');
      if (terrStr) {
        try {
          const arr = JSON.parse(terrStr);
          s.territories = arr.map(t => {
            const b = BREEDS.find(b => b.id === t.breedId);
            return {
              id: TW.uid(),
              breedId: t.breedId,
              color: b ? b.color : '#888',
              polygon: t.polygon,
              area: t.area,
            };
          });
        } catch (e) {
          console.warn('Failed to parse territories cookie', e);
        }
      }

      return true;
    },
  };
})();
