/* =================================================================
   Profile Showcase Wall — a "brag page" pulling together stats/badges
   that already exist elsewhere (title, level, streak, wallet, collection,
   pet, equipped frame) into one shareable, screenshot-friendly view.
   Zero new Firebase writes -- purely reads of data other features already
   maintain.
   ================================================================= */

// Same hash-based avatar color as the hub (index.html's scColorFor) --
// duplicated rather than shared since it's a few lines and the hub has no
// exported module to pull it from.
const SC_STUDENT_PALETTE = ["#F6C1C1", "#C1E1C1", "#C1D4F6", "#F6E3B4", "#D9C1F6", "#F6C1E0", "#C1F0E8"];
function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SC_STUDENT_PALETTE[hash % SC_STUDENT_PALETTE.length];
}

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("pf-page").innerHTML =
    '<div class="pf-topbar"><a href="../" class="pf-back">←</a><div class="pf-title">🌟 My Profile</div></div>' +
    '<p class="pf-empty-note">Please sign in from the hub first.</p>';
} else {
  loadProfile();
}

async function loadProfile() {
  document.getElementById("pf-name").textContent = player.name;

  const avatar = document.getElementById("pf-avatar");
  avatar.style.background = colorForId(player.id);
  avatar.textContent = player.name[0].toUpperCase();

  if (!window.AIGLeaderboard) return;

  const [title, level, streak, wallet, collection, cosmetics, nickname, pet] = await Promise.all([
    AIGLeaderboard.getTitle(),
    AIGLeaderboard.getPlayerLevel(),
    AIGLeaderboard.getStreak(),
    AIGLeaderboard.getWallet(),
    AIGLeaderboard.getCollection(),
    AIGLeaderboard.getCosmetics(),
    AIGLeaderboard.getNickname(),
    AIGLeaderboard.getPetStatus()
  ]);

  if (nickname && nickname.status === "approved") {
    const el = document.getElementById("pf-nickname");
    el.textContent = `"${nickname.text}"`;
    el.hidden = false;
  }

  if (title) {
    const el = document.getElementById("pf-title-badge");
    el.textContent = `${title.emoji} ${title.name}`;
    el.hidden = false;
  }

  if (cosmetics && cosmetics.equippedFrame && cosmetics.equippedFrame !== "none") {
    avatar.classList.add("frame-" + cosmetics.equippedFrame);
  }

  document.getElementById("pf-stat-level").textContent = level ? level.level : "1";
  document.getElementById("pf-stat-streak").textContent = streak.count || 0;
  document.getElementById("pf-stat-coins").textContent = wallet.coins || 0;
  document.getElementById("pf-stat-gems").textContent = wallet.gems || 0;

  const grid = document.getElementById("pf-collection-grid");
  const owned = collection.owned || {};
  const ownedCount = collection.pool.filter(c => owned[c.id]).length;
  grid.innerHTML = collection.pool.map(c => `
    <div class="pf-card-mini${owned[c.id] ? "" : " locked"}">${owned[c.id] ? c.emoji : "❔"}</div>
  `).join("");
  document.getElementById("pf-collection-count").textContent = `${ownedCount}/${collection.pool.length} collected`;

  if (pet) {
    document.getElementById("pf-pet-emoji").textContent = pet.stage.emoji;
    document.getElementById("pf-pet-name").textContent = pet.stage.name;
    document.getElementById("pf-pet-sub").textContent = `Fed ${pet.feedCount} time${pet.feedCount === 1 ? "" : "s"}`;
  }
}
