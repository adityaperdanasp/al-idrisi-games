/* =================================================================
   AIGRadio (PM round 12, item 10) -- calm background "radio" for study
   time, fully synthesized with Web Audio (no audio files): rain, forest,
   cafe, night crickets and lo-fi plucks. Its own volume, separate from the
   game's sound effects; the choice is remembered in localStorage.
   Audio can only start after a tap, so play() is always called from a
   click handler (the 🎧 button or the Radio tab).
   ================================================================= */
(function () {
  const KEY = "aig_radio";
  const TRACKS = [
    { id: "rain", emoji: "🌧️", name: "Soft Rain" },
    { id: "forest", emoji: "🌲", name: "Quiet Forest" },
    { id: "cafe", emoji: "☕", name: "Cozy Cafe" },
    { id: "night", emoji: "🌙", name: "Night Crickets" },
    { id: "lofi", emoji: "🎹", name: "Lo-fi Plucks" }
  ];
  let ctx = null, master = null, nodes = [], timers = [], current = null, volume = 0.5;
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (typeof s.vol === "number") volume = s.vol; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ id: current, vol: volume })); } catch (e) {} };

  function ensure() {
    if (ctx) return true;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ctx = new C(); master = ctx.createGain(); master.gain.value = volume * 0.5; master.connect(ctx.destination);
    return true;
  }
  function noiseBuffer(seconds, pink) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (pink) { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } else d[i] = w * 0.5;
    }
    return buf;
  }
  function loopNoise(filterType, freq, q, gainVal, pink) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(3, pink); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gainVal;
    src.connect(f).connect(g).connect(master); src.start();
    nodes.push(src, f, g);
    return { g, f };
  }
  function lfo(target, rate, depth) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth;
    o.connect(g).connect(target); o.start(); nodes.push(o, g);
  }
  function tone(freq, when, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(master); o.start(when); o.stop(when + dur + 0.05);
  }
  function every(fn, min, max) {
    const tick = () => { fn(); timers.push(setTimeout(tick, min + Math.random() * (max - min))); };
    timers.push(setTimeout(tick, min * Math.random()));
  }
  function pad(freqs, vol) {
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * (1 + (i % 2 ? 0.003 : -0.003));
      g.gain.value = vol; lfo(g.gain, 0.05 + i * 0.03, vol * 0.5);
      o.connect(g).connect(master); o.start(); nodes.push(o, g);
    });
  }
  const BUILD = {
    rain() { const a = loopNoise("highpass", 1400, 0.5, 0.35, false); lfo(a.g.gain, 0.15, 0.08); loopNoise("lowpass", 600, 0.7, 0.18, true); },
    forest() {
      pad([110, 165, 220], 0.03); loopNoise("bandpass", 900, 0.6, 0.05, true);
      every(() => { const t = ctx.currentTime, f = 2400 + Math.random() * 1400; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.09); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.18);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(master); o.start(t); o.stop(t + 0.25); }, 1800, 5200);
    },
    cafe() {
      loopNoise("lowpass", 700, 0.6, 0.16, true); pad([130.8, 164.8, 196, 246.9], 0.018);
      const chords = [[261.6, 329.6, 392], [220, 277.2, 329.6], [246.9, 311.1, 370], [196, 246.9, 293.7]]; let i = 0;
      every(() => { const c = chords[i++ % chords.length], t = ctx.currentTime; c.forEach((f, k) => tone(f, t + k * 0.12, 2.6, "triangle", 0.025)); }, 3800, 4600);
    },
    night() {
      const a = loopNoise("bandpass", 4200, 8, 0.05, false); lfo(a.g.gain, 9, 0.045); pad([98, 147], 0.02);
    },
    lofi() {
      const scale = [261.6, 293.7, 329.6, 392, 440, 523.3]; pad([65.4, 98], 0.03);
      every(() => { const t = ctx.currentTime; tone(scale[Math.floor(Math.random() * scale.length)], t, 1.4, "triangle", 0.05); if (Math.random() < 0.4) tone(scale[Math.floor(Math.random() * scale.length)] / 2, t + 0.3, 1.6, "sine", 0.04); }, 700, 1600);
      loopNoise("highpass", 6000, 0.5, 0.012, false);
    }
  };
  function clear() {
    timers.forEach(clearTimeout); timers = [];
    nodes.forEach(n => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); nodes = [];
  }
  function play(id) {
    if (!BUILD[id] || !ensure()) return false;
    if (ctx.state === "suspended") ctx.resume();
    clear(); current = id; BUILD[id](); save(); notify();
    return true;
  }
  function stop() { clear(); current = null; save(); notify(); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume * 0.5; save(); }
  const listeners = [];
  function notify() { listeners.forEach(fn => { try { fn(current); } catch (e) {} }); }

  // Small floating 🎧 button + panel for pages that want it.
  function mountButton() {
    if (document.getElementById("aig-radio-btn")) return;
    const st = document.createElement("style");
    st.textContent = `#aig-radio-btn{position:fixed;right:10px;top:10px;z-index:99991;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.85);box-shadow:0 2px 6px rgba(0,0,0,.2);font-size:1.1rem;cursor:pointer}
      #aig-radio-btn.on{background:#c4b5fd}
      #aig-radio-panel{position:fixed;right:10px;top:54px;z-index:99991;width:210px;background:#fff;border-radius:16px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:"Nunito",sans-serif;font-weight:800;font-size:.8rem;color:#3d2e22}
      #aig-radio-panel[hidden]{display:none}
      #aig-radio-panel button.t{display:block;width:100%;text-align:left;border:0;background:#f5f0ff;border-radius:10px;padding:7px 9px;margin-bottom:5px;font:inherit;cursor:pointer;color:inherit}
      #aig-radio-panel button.t.on{background:#c4b5fd}`;
    document.head.appendChild(st);
    const btn = document.createElement("button"); btn.id = "aig-radio-btn"; btn.type = "button"; btn.textContent = "🎧"; btn.title = "Study radio";
    const panel = document.createElement("div"); panel.id = "aig-radio-panel"; panel.hidden = true;
    const paint = () => {
      btn.classList.toggle("on", !!current);
      panel.innerHTML = `<div style="margin-bottom:6px">🎧 Study radio</div>${TRACKS.map(t => `<button class="t ${current === t.id ? "on" : ""}" data-id="${t.id}" type="button">${t.emoji} ${t.name}</button>`).join("")}
        <button class="t" data-id="" type="button">⏹️ Off</button><input id="aig-radio-vol" type="range" min="0" max="100" value="${Math.round(volume * 100)}" style="width:100%">`;
      panel.querySelectorAll("button.t").forEach(b => b.onclick = () => { b.dataset.id ? play(b.dataset.id) : stop(); });
      panel.querySelector("#aig-radio-vol").oninput = e => setVolume(e.target.value / 100);
    };
    listeners.push(paint);
    btn.onclick = () => { panel.hidden = !panel.hidden; };
    document.body.appendChild(btn); document.body.appendChild(panel); paint();
  }

  window.AIGRadio = { TRACKS, play, stop, setVolume, get current() { return current; }, get volume() { return volume; }, onChange(fn) { listeners.push(fn); }, mountButton };
})();
