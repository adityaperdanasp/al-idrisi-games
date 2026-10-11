/* =================================================================
   Audit round 2 -- Math Race quick start.
   - Remembers the Difficulty, Answer style, Solo opponent, Cup and Mode buttons you picked last time
     (Questions and Solo rival were already remembered by race-plus.js).
   - A big "⚡ Quick race" button on the first screen jumps straight into a solo race with those
     settings, skipping the setup screen.
   ================================================================= */
(function () {
  const SEGS = ["difficulty-seg", "answer-seg", "opp-seg", "cup-seg", "rmode-seg"];
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function restore() {
    SEGS.forEach(id => {
      const seg = document.getElementById(id); if (!seg) return;
      const saved = get("mr_seg_" + id); if (saved === null) return;
      const btn = [...seg.querySelectorAll(".seg-btn")].find(b => b.textContent.trim() === saved && !b.hidden);
      if (btn && !btn.classList.contains("active")) btn.click();
    });
  }
  function remember() {
    SEGS.forEach(id => {
      const seg = document.getElementById(id); if (!seg) return;
      seg.addEventListener("click", e => { const b = e.target.closest(".seg-btn"); if (b) set("mr_seg_" + id, b.textContent.trim()); });
    });
  }
  function addQuick() {
    const go = document.getElementById("btn-lets-race"); if (!go || document.getElementById("btn-quick-race")) return;
    const q = document.createElement("button");
    q.id = "btn-quick-race"; q.type = "button"; q.className = "ghost-btn";
    q.textContent = "⚡ Quick race (solo, last settings)";
    q.style.cssText = "display:block;margin:10px auto 0;font-weight:800";
    go.after(q);
    q.onclick = () => { go.click(); setTimeout(() => { restore(); const solo = document.getElementById("btn-solo"); if (solo) solo.click(); }, 350); };
  }
  function boot() { remember(); addQuick(); setTimeout(restore, 600); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
