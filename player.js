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

  // Derives a "play as this child's parent" identity from a student roster
  // entry — no separate players.js entries needed. Kept deterministic
  // (same childId always produces the same parent id) so cross-device
  // progress for the SAME parent-of-that-child always lands in the same
  // place. `childId` is carried explicitly (not just parsed back out of
  // the id string) so callers never have to guess the convention.
  function deriveParentPlayer(child) {
    return {
      id: `${child.id}-parent`,
      name: `${child.name}'s Parent`,
      role: "parent",
      childId: child.id
    };
  }

  window.AIGPlayer = { getPlayer, setPlayer, clearPlayer, deriveParentPlayer };
})();
