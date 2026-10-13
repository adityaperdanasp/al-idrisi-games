/* tablet.js -- scale the phone-sized UI up on tablets (e.g. Oppo Pad Neo, 11.4").
   Every page is built as a ~480px phone column. On a tablet that leaves a tiny column in a big
   screen. Instead of re-laying-out 60 pages, change the viewport meta `width` so the browser scales
   the whole page natively (vh / fixed positions / media queries all stay consistent, unlike CSS zoom).
     portrait  -> width 440: exactly the phone layout, enlarged (Plane Mode etc. look as designed)
     landscape -> width = screen width / scale, scale ~ height/540 (capped 1.7): bigger, readable column
   Phones (shorter side < 600px) are left untouched. Override: localStorage.aig_tablet = "0" (off). */
(function () {
  try {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    var orig = meta.getAttribute("content") || "width=device-width, initial-scale=1";
    var PORTRAIT_W = 440, LAND_ROWS = 540, MAX_SCALE = 1.7;
    function off() { try { return localStorage.getItem("aig_tablet") === "0"; } catch (e) { return false; } }
    function apply() {
      var sw = screen.width, sh = screen.height;
      var w = null;
      if (!off() && Math.min(sw, sh) >= 600) {
        if (sh > sw) w = PORTRAIT_W;
        else w = Math.round(sw / Math.min(MAX_SCALE, Math.max(1, sh / LAND_ROWS)));
      }
      // initial/min/max-scale pin the scale at 1 and would cancel the narrower width, so drop them when scaling.
      var next = w ? "width=" + w + orig.split(",").filter(function (p) { return !/^\s*(width|initial-scale|minimum-scale|maximum-scale)\s*=/i.test(p); }).map(function (p) { return ", " + p.trim(); }).join("") : orig;
      if (meta.getAttribute("content") !== next) meta.setAttribute("content", next);
    }
    apply();
    var t;
    function later() { clearTimeout(t); t = setTimeout(apply, 150); }
    window.addEventListener("orientationchange", later);
    window.addEventListener("resize", later);
  } catch (e) { /* never block the page */ }
})();
