// Shared "who's playing" identity — used by the hub and every game.
// Reads/writes one localStorage key so a name picked on the hub carries
// into every game automatically (same origin, different paths).
(function () {
  const STORAGE_KEY = "aig_player";

  function getPlayer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setPlayer(player) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  }

  function clearPlayer() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.AIGPlayer = { getPlayer, setPlayer, clearPlayer };
})();
