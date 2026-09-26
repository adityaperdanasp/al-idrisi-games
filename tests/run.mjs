// BrainBox static smoke tests (PM round 13, item 20). No dependencies:
//   node tests/run.mjs
// Checks, for every page in the repo:
//   1. every .js file parses (node --check)
//   2. every local <script src>, <link href>, <img src> and <a href> points at a file that exists
//   3. every AIGLeaderboard.<name> a page/script calls is actually exported by leaderboard.js
//   4. every getElementById("x") in a page's OWN script.js has a matching id in that page's HTML
// Exit code 1 if anything fails, so it can gate a deploy / CI run.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const SKIP_DIRS = new Set(["node_modules", ".git", ".vercel", "android", ".github", "tests", ".claude", "dinorace"]);
const problems = [];
const fail = (where, msg) => problems.push(`${relative(ROOT, where)}: ${msg}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const jsFiles = files.filter(f => f.endsWith(".js") && !f.endsWith(".min.js"));
const htmlFiles = files.filter(f => f.endsWith(".html"));

// 1. syntax
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); } catch (e) { fail(f, "syntax error: " + String(e.stderr || e.message).split("\n").slice(0, 3).join(" ")); }
}

// 2. local references in HTML
const refRe = /(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g;
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf8");
  let m;
  while ((m = refRe.exec(html))) {
    const ref = m[1];
    if (/^(https?:|\/\/|mailto:|tel:|data:|javascript:|whatsapp:)/.test(ref) || ref.includes("${")) continue; // external, or a template built at runtime
    if (ref.startsWith("/")) continue; // root-absolute paths are resolved by the host, not checked here
    const target = resolve(dirname(f), ref);
    const t = existsSync(target) && statSync(target).isDirectory() ? join(target, "index.html") : target;
    if (!existsSync(t)) fail(f, `missing file: ${ref}`);
  }
}

// 3. AIGLeaderboard API usage vs exports
const lb = readFileSync(join(ROOT, "leaderboard.js"), "utf8");
const exportBlock = lb.slice(lb.lastIndexOf("return {"));
const exported = new Set([...exportBlock.matchAll(/[\w$]+/g)].map(x => x[0]));
const useRe = /AIGLeaderboard\.([A-Za-z_$][\w$]*)/g;
const scanUses = f => {
  const src = readFileSync(f, "utf8");
  let m; const seen = new Set();
  while ((m = useRe.exec(src))) {
    const name = m[1];
    if (seen.has(name) || exported.has(name)) continue;
    seen.add(name);
    fail(f, `AIGLeaderboard.${name} is used but not exported by leaderboard.js`);
  }
};
[...jsFiles, ...htmlFiles].filter(f => !f.endsWith("leaderboard.js")).forEach(scanUses);

// 4. getElementById ids used by a page's own script exist in its HTML
for (const f of htmlFiles) {
  const dir = dirname(f);
  const script = join(dir, "script.js");
  if (!existsSync(script) || dir === ROOT) continue;
  const html = readFileSync(f, "utf8"), js = readFileSync(script, "utf8");
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map(x => x[1]));
  // ids the script itself creates via innerHTML/template strings also count
  for (const m of js.matchAll(/\bid=["']([^"'$`{}]+)["']/g)) ids.add(m[1]);
  for (const m of js.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)) ids.add(m[1]); // el.id = "x"
  for (const m of js.matchAll(/\$\(["']([^"']+)["']\)|getElementById\(["']([^"']+)["']\)/g)) {
    const id = m[1] || m[2];
    if (!ids.has(id)) fail(script, `element #${id} is used but never defined in ${relative(ROOT, f)} or the script`);
  }
}

console.log(`Checked ${jsFiles.length} JS files and ${htmlFiles.length} HTML pages.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 80).forEach(p => console.log(" - " + p));
  if (problems.length > 80) console.log(` … and ${problems.length - 80} more`);
  process.exit(1);
}
console.log("All checks passed ✅");
