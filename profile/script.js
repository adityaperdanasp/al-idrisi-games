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

  const [title, level, streak, wallet, collection, cosmetics, nickname, pet, featured, pedestals] = await Promise.all([
    AIGLeaderboard.getTitle(),
    AIGLeaderboard.getPlayerLevel(),
    AIGLeaderboard.getStreak(),
    AIGLeaderboard.getWallet(),
    AIGLeaderboard.getCollection(),
    AIGLeaderboard.getCosmetics(),
    AIGLeaderboard.getNickname(),
    AIGLeaderboard.getPetStatus(),
    AIGLeaderboard.getFeaturedAchievement(),
    AIGLeaderboard.getTrophyPedestals()
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

  loadRoom();

  if (featured && pedestals) {
    document.getElementById("pf-trophy-section").hidden = false;
    trophyState.owned = featured.owned;
    trophyState.featuredId = featured.featured ? featured.featured.id : null;
    trophyState.pedestals = pedestals.pedestals;
    trophyState.equippedPedestal = pedestals.equipped;
    renderTrophyPedestal();
    renderPedestalRow();
  }
}

// ---------------------------------------------------------------------
// TROPHY CASE -- pick an owned achievement to feature (free, just a
// preference) inside a purchasable pedestal frame. Local state kept here
// so the picker/shop can re-render after a buy/equip/pick without an
// extra round-trip back to loadProfile()'s big Promise.all.
// ---------------------------------------------------------------------
const trophyState = { owned: [], featuredId: null, pedestals: [], equippedPedestal: "default" };

function renderTrophyPedestal() {
  const pedestalEl = document.getElementById("pf-trophy-pedestal");
  pedestalEl.className = "pf-trophy-pedestal" +
    (trophyState.equippedPedestal && trophyState.equippedPedestal !== "default" ? " pedestal-" + trophyState.equippedPedestal : "");

  const featured = trophyState.owned.find(a => a.id === trophyState.featuredId) || null;
  const emojiEl = document.getElementById("pf-trophy-emoji");
  const nameEl = document.getElementById("pf-trophy-name");
  const descEl = document.getElementById("pf-trophy-desc");
  if (featured) {
    emojiEl.textContent = featured.emoji;
    nameEl.textContent = featured.name;
    descEl.textContent = featured.desc;
  } else {
    emojiEl.textContent = "🏆";
    nameEl.textContent = "No trophy yet";
    descEl.textContent = trophyState.owned.length ? "Tap below to pick your best achievement!" : "Earn an achievement to feature it here!";
  }
}

function renderTrophyPicker() {
  const wrap = document.getElementById("pf-trophy-picker");
  if (!trophyState.owned.length) {
    wrap.innerHTML = '<p class="pf-trophy-empty">No achievements earned yet — keep playing!</p>';
    return;
  }
  wrap.innerHTML = trophyState.owned.map(a => `
    <button class="pf-trophy-pick-item${a.id === trophyState.featuredId ? " active" : ""}" type="button" data-id="${a.id}">
      <span class="pf-trophy-pick-emoji">${a.emoji}</span>
      <span class="pf-trophy-pick-name">${a.name}</span>
    </button>
  `).join("");
  wrap.querySelectorAll(".pf-trophy-pick-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      const res = await AIGLeaderboard.setFeaturedAchievement(btn.dataset.id);
      if (res.ok) {
        trophyState.featuredId = btn.dataset.id;
        renderTrophyPedestal();
        renderTrophyPicker();
        document.getElementById("pf-trophy-picker").hidden = true;
      }
    });
  });
}

function renderPedestalRow() {
  const wrap = document.getElementById("pf-pedestal-row");
  wrap.innerHTML = trophyState.pedestals.map(p => {
    const costLabel = !p.cost ? "" : p.cost.coins ? `🪙${p.cost.coins}` : `💎${p.cost.gems}`;
    return `
      <button class="pf-pedestal-chip${p.id === trophyState.equippedPedestal ? " active" : ""}" type="button" data-id="${p.id}">
        ${p.preview}
        ${!p.owned ? `<span class="pf-pedestal-cost">${costLabel}</span>` : ""}
      </button>
    `;
  }).join("");
  wrap.querySelectorAll(".pf-pedestal-chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const def = trophyState.pedestals.find(p => p.id === id);
      if (!def) return;
      if (!def.owned) {
        const res = await AIGLeaderboard.unlockCosmetic("trophy-pedestal", id, def.cost || {});
        if (!res.ok) {
          if (res.reason === "insufficient-funds") alert("Not enough coins/gems for this pedestal yet!");
          return;
        }
        def.owned = true;
      }
      await AIGLeaderboard.equipCosmetic("trophy-pedestal", id);
      trophyState.equippedPedestal = id;
      renderTrophyPedestal();
      renderPedestalRow();
    });
  });
}

// Guarded -- when there's no signed-in player, the block above replaces
// #pf-page's innerHTML entirely (see top of file), so this button won't
// exist in the DOM at all.
const trophyChangeBtn = document.getElementById("pf-trophy-change-btn");
if (trophyChangeBtn) {
  trophyChangeBtn.addEventListener("click", () => {
    const wrap = document.getElementById("pf-trophy-picker");
    wrap.hidden = !wrap.hidden;
    if (!wrap.hidden) renderTrophyPicker();
  });
}

// ---------------------------------------------------------------------
// MY ROOM (PM round 9, item 6) -- 6 slots furnished with items bought via
// the generic unlockCosmetic("room-item", ...) pair (see leaderboard.js's
// ROOM_ITEMS / getRoom / placeRoomItem). Tap a slot to select it, tap an
// owned item to place it; tap a filled slot (with nothing selected) to clear.
// ---------------------------------------------------------------------
const roomState = { items: [], slots: [], selected: null };
async function loadRoom() {
  const room = await AIGLeaderboard.getRoom();
  if (!room) return;
  roomState.items = room.items;
  roomState.slots = room.slots;
  document.getElementById("pf-room-section").hidden = false;
  renderRoom();
}
function renderRoom() {
  const byId = Object.fromEntries(roomState.items.map(i => [i.id, i]));
  const wrap = document.getElementById("pf-room");
  wrap.innerHTML = roomState.slots.map((id, n) =>
    `<button class="pf-room-slot${id ? " filled" : ""}${roomState.selected === n ? " sel" : ""}" type="button" data-slot="${n}">${id && byId[id] ? byId[id].emoji : "＋"}</button>`).join("");
  wrap.querySelectorAll(".pf-room-slot").forEach(btn => btn.addEventListener("click", async () => {
    const n = Number(btn.dataset.slot);
    if (roomState.slots[n] && roomState.selected === null) {
      await AIGLeaderboard.placeRoomItem(n, null);
      roomState.slots[n] = null;
    } else {
      roomState.selected = roomState.selected === n ? null : n;
    }
    renderRoom();
  }));
  const shop = document.getElementById("pf-room-shop");
  shop.innerHTML = roomState.items.map(i => {
    const cost = !i.owned ? (i.cost.coins ? `🪙${i.cost.coins}` : `💎${i.cost.gems}`) : "";
    return `<button class="pf-room-shop-chip${i.owned ? "" : " locked"}" type="button" data-item="${i.id}" title="${i.name}">${i.emoji}${cost ? `<small>${cost}</small>` : ""}</button>`;
  }).join("");
  shop.querySelectorAll(".pf-room-shop-chip").forEach(btn => btn.addEventListener("click", async () => {
    const item = roomState.items.find(i => i.id === btn.dataset.item);
    if (!item.owned) {
      const res = await AIGLeaderboard.unlockCosmetic("room-item", item.id, item.cost);
      if (!res.ok) { if (res.reason === "insufficient-funds") alert("Not enough coins/gems yet!"); return; }
      item.owned = true;
    }
    // Place into the selected slot, or the first empty one.
    let slot = roomState.selected;
    if (slot === null) slot = roomState.slots.findIndex(s => !s);
    if (slot === -1) { document.getElementById("pf-room-hint").textContent = "Room is full — tap a filled slot to clear it first."; renderRoom(); return; }
    const res = await AIGLeaderboard.placeRoomItem(slot, item.id);
    if (res.ok) { roomState.slots[slot] = item.id; roomState.selected = null; }
    renderRoom();
  }));
}
