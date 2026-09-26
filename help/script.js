/* =================================================================
   Help (PM round 13, item 19) -- kid-friendly FAQ + a "report a problem"
   box. Reports go to leaderboard/reports and show up in the teacher
   dashboard under "Laporan".
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const FAQ = [
  ["Where do my coins and gems come from?", "Every question you get right gives you 1 🪙 coin, and every 15 right answers gives you a 💎 gem. Games also give small bonuses when you finish them."],
  ["Why did my coins go down?", "Coins go down when you buy something (like a costume, furniture or a seed). You always see the price before you buy."],
  ["What is my streak?", "Your 🔥 streak counts how many days in a row you played. If you miss a day it starts again — unless you have a Streak Freeze from the Extras page!"],
  ["How do I change how the app looks?", "Open 🎨 Customize on the hub for themes, hats and effects, or ⚙️ Settings for bigger text, high contrast and calmer motion."],
  ["I got a question wrong. What now?", "Don't worry! Wrong answers are saved in 🔁 Quick Review, and they come back a day later so you can master them."],
  ["What is Bo's World?", "It's Bo's house, your pet (familiar), letters from Bo, the museum and the study radio. Your right answers help Bo level up."],
  ["How do I get on my friend's game?", "Try ⚔️ Friend Duel (you can play any time) or 🏘️ My Town to visit friends' towns and leave a 💖."],
  ["Where did my game go?", "Use 🔍 Search on the hub, or open the 🗺️ World Map — every game is there."],
  ["The sound is too loud or annoying.", "Go to ⚙️ Settings and turn on \"Mute answer sounds\". The 🎧 button in Game Room games controls the study radio volume."],
  ["Can I use my account on another phone?", "Yes! Sign in with the same name and PIN. Everything is saved online. In ⚙️ Settings you can also download a copy of your progress."],
  ["I forgot my PIN.", "Ask a parent or teacher to help. They can reach Adit, who can reset it."],
  ["Why did Bo say it's time to rest?", "A parent can set a daily play limit. When it's reached, calm activities like Zen Mode stay open. You can play more tomorrow!"],
  ["Does the app work without internet?", "Some of it does: pages you opened before can load again offline, but your progress only saves when you're online."],
  ["How do I see the welcome tour again?", "Open ⚙️ Settings and tap \"Show the welcome tour again\"."]
];
$("hp-faq").innerHTML = FAQ.map(([q, a]) => `<details><summary>${K.esc(q)}</summary><p>${K.esc(a)}</p></details>`).join("");
$("hp-send").onclick = async () => {
  const p = K.signedIn();
  if (!p) { $("hp-msg").textContent = "Please sign in from the hub first."; return; }
  const btn = $("hp-send"); btn.disabled = true;
  const r = await AIGLeaderboard.sendReport($("hp-text").value, document.referrer || "");
  $("hp-msg").textContent = r.ok ? "✅ Thank you! Your report was sent." : "Please write a little more so we can understand (at least 5 letters).";
  if (r.ok) $("hp-text").value = "";
  btn.disabled = false;
};
