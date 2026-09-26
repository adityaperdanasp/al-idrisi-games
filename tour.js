/* =================================================================
   Welcome tour (PM round 13, item 11) -- a short 5-step tour by Bo for
   players who have never seen it (remembered per player in localStorage).
   Skippable at any step. Replay: Settings -> "Show the welcome tour again"
   (which opens the hub with ?tour=1). Hub-only script.
   ================================================================= */
(function () {
  const STEPS = [
    ["👋", "Hi, I'm Bo!", "Welcome to BrainBox. I'll show you around in 5 quick steps — you can skip any time."],
    ["🪙", "Coins & gems", "Every right answer earns coins, and every 15 earn a gem. Spend them on hats, pets, furniture and fun stuff."],
    ["🎮", "Lots to play", "Tap the game cards, open the 🎮 Game Room, or the 🗺️ World Map to see every place. Can't find something? Use 🔍 Search."],
    ["🏠", "Bo's World", "Adopt a pet, decorate my house and read my letters. Your answers help me grow!"],
    ["🌈", "Make it yours", "Change themes in 🎨 Customize, and use ⚙️ Settings for bigger text or calmer motion. Need help? Tap 🆘 Help. Have fun!"]
  ];
  function start() {
    const p = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!p || p.role === "parent") return;
    const key = "aig_tour_" + p.id, forced = /[?&]tour=1/.test(location.search);
    try { if (!forced && localStorage.getItem(key)) return; } catch (e) { return; }
    let i = 0;
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;z-index:100001;background:rgba(40,20,70,.88);display:flex;align-items:center;justify-content:center;padding:22px;font-family:'Nunito',sans-serif";
    const done = () => { try { localStorage.setItem(key, "1"); } catch (e) {} o.remove(); if (forced) history.replaceState(null, "", location.pathname); };
    const draw = () => {
      const s = STEPS[i];
      o.innerHTML = `<div style="background:#fffaf2;border-radius:24px;padding:24px 20px 18px;max-width:340px;width:100%;text-align:center;color:#3d2e22;box-shadow:0 14px 40px rgba(0,0,0,.4)">
        <div style="font-size:3.4rem;line-height:1.1">${s[0]}</div><h2 style="font-family:'Baloo 2',sans-serif;margin:6px 0 4px;color:#8c2f6b">${s[1]}</h2>
        <p style="font-weight:700;font-size:.92rem;line-height:1.5;margin:0 0 16px">${s[2]}</p>
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:14px">${STEPS.map((_, k) => `<span style="width:8px;height:8px;border-radius:50%;background:${k === i ? "#8c2f6b" : "#e2d5ee"}"></span>`).join("")}</div>
        <button id="aig-tour-next" style="width:100%;border:0;border-radius:14px;padding:12px;background:#8c2f6b;color:#fff;font-family:'Baloo 2',sans-serif;font-weight:800;font-size:1rem;cursor:pointer">${i === STEPS.length - 1 ? "Let's play! 🎉" : "Next →"}</button>
        ${i < STEPS.length - 1 ? '<button id="aig-tour-skip" style="margin-top:8px;border:0;background:none;color:#8a7a6a;font-weight:800;cursor:pointer">Skip tour</button>' : ""}</div>`;
      o.querySelector("#aig-tour-next").onclick = () => { if (i >= STEPS.length - 1) done(); else { i++; draw(); } };
      const sk = o.querySelector("#aig-tour-skip"); if (sk) sk.onclick = done;
    };
    draw(); document.body.appendChild(o);
  }
  // Wait for the intro splash (about 2s) so the two don't stack.
  setTimeout(start, 2600);
})();
