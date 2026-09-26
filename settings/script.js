/* =================================================================
   Settings (PM round 13, items 14 + 18 + 11): comfort & accessibility,
   effects/sound, data backup/transfer, tour replay. Choices are applied
   instantly through AIGSkin.setA11y (stored in localStorage) and saved to
   players/{id}/settings so they follow the player to a new device.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("⚙️"));
else init();

function init() {
  const S = window.AIGSkin;
  const cur = () => S.a11y || {};
  const save = async patch => { S.setA11y(patch); try { await AIGLeaderboard.saveSettings(Object.assign({}, cur())); } catch (e) {} paint(); };
  const sw = (key, title, sub) => `<div class="st-row"><div><b>${title}</b><small>${sub}</small></div><button class="st-sw ${cur()[key] ? "on" : ""}" data-k="${key}" type="button" role="switch" aria-checked="${!!cur()[key]}" aria-label="${title}"></button></div>`;
  function paint() {
    const fs = cur().fs || 1;
    $("st-a11y").innerHTML = `<div class="st-row"><div><b>Text size</b><small>Makes everything bigger and easier to read</small></div><div class="st-seg">${[[1, "A"], [1.15, "A+"], [1.3, "A++"]].map(([v, l]) => `<button type="button" data-fs="${v}" class="${fs === v ? "on" : ""}">${l}</button>`).join("")}</div></div>
      ${sw("hc", "High contrast", "Stronger colours and outlines")}
      ${sw("dys", "Easy-read font", "A clear font that is easier for dyslexic readers")}
      ${sw("rm", "Calm motion", "Turns off most animations and wobbles")}
      ${sw("ra", "Read questions aloud", "Bo reads each question out loud (English voice)")}`;
    $("st-fx").innerHTML = `${sw("juiceOff", "Mute answer sounds", "No beeps or buzzes when you answer")}${sw("fxOff", "Turn off sparkle effects", "No bursts, trails or floating decorations")}`;
    document.querySelectorAll(".st-sw").forEach(b => b.onclick = () => save({ [b.dataset.k]: !cur()[b.dataset.k] }));
    document.querySelectorAll("[data-fs]").forEach(b => b.onclick = () => save({ fs: +b.dataset.fs }));
    const lim = S.limitMinutes ? S.limitMinutes() : 0;
    $("st-time").textContent = lim ? `Play limit set by a parent: ${lim} min a day · used today on this device: ${S.playUsedMinutes()} min.` : "";
  }
  $("st-export").onclick = async () => {
    const d = await AIGLeaderboard.exportMyData();
    if (!d) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `brainbox-${d.id}-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("st-msg").textContent = "✅ Saved to your downloads.";
  };
  $("st-tour").onclick = () => { try { localStorage.removeItem("aig_tour_" + player.id); } catch (e) {} location.href = "../?tour=1"; };
  paint();
}
