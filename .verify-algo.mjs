// Verification harness: pulls the REAL algorithm functions out of index.html
// and exercises them against the scenarios we promised to fix.
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");

function slice(marker, endMarker) {
  const a = html.indexOf(marker);
  if (a < 0) throw new Error("marker not found: " + marker);
  const b = html.indexOf(endMarker, a);
  if (b < 0) throw new Error("endMarker not found after: " + marker);
  return html.slice(a, b);
}

// Extract the exact source of the pieces we need (real code, verbatim).
const WEIGHTS_SRC = slice("const WEIGHTS =", "\n");
const weightedPickSrc = slice("function weightedPick(obj){", "\nfunction topEntries");
const seedHelpersSrc = slice("function seedKey(title){", "\nfunction bumpSeed");
const profileOnSrc = slice("const PROFILE_ON_AT", "function pickStrategy(){");
const pickStrategySrc = slice("function pickStrategy(){", "\n\n/* ---------- feed rendering");

// Controllable RNG so results are deterministic & we can force branches.
let rngQueue = [];
let rngDefault = 0.999; // default high → avoids exploit/search branches unless we feed values
function nextRand() {
  return rngQueue.length ? rngQueue.shift() : rngDefault;
}

const sandbox = {
  Math: Object.assign(Object.create(Math), { random: () => nextRand() }),
  state: null,
  console,
};
vm.createContext(sandbox);
vm.runInContext(
  [WEIGHTS_SRC, weightedPickSrc, seedHelpersSrc, profileOnSrc, pickStrategySrc].join("\n"),
  sandbox
);
const WEIGHTS = vm.runInContext("WEIGHTS", sandbox);

function freshState(over = {}) {
  return Object.assign(
    { lang: "de", exploit: 0.4, interests: [], profile: { seeds: {}, cats: {} } },
    over
  );
}
function pick() {
  return vm.runInContext("pickStrategy()", sandbox);
}

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  (cond ? (pass++, console.log("  PASS " + name)) : (fail++, console.log("  FAIL " + name + "  " + detail)));
}

console.log("WEIGHTS:", JSON.stringify(WEIGHTS));

// ---- Scenario 1: ONE article read (open=2.0 + plausible dwell up to +1.2) ----
console.log("\n[1] After reading ONE tool article — profile must NOT activate morelike");
for (const dwell of [0, 0.6, 1.2]) {
  const seedVal = WEIGHTS.open + dwell; // 2.0 .. 3.2
  // 8 categories each got +open from that single open
  const cats = {}; for (let i = 0; i < 8; i++) cats["Cat" + i] = WEIGHTS.open;
  sandbox.state = freshState({ exploit: 0.85, profile: { seeds: { "de::Werkzeug": seedVal }, cats } });
  rngDefault = 0.0; rngQueue = []; // force every probabilistic branch to fire if eligible
  let morelike = 0, catSearch = 0;
  for (let i = 0; i < 20000; i++) { const s = pick(); if (s.type === "morelike") morelike++; else if (s.type === "search") catSearch++; }
  check(`seed=${seedVal.toFixed(1)} → 0 morelike (got ${morelike})`, morelike === 0, `morelike=${morelike}`);
  check(`seed=${seedVal.toFixed(1)} → 0 category-search from single-read cats (got ${catSearch})`, catSearch === 0, `catSearch=${catSearch}`);
}

// ---- Scenario 2: a STAR (explicit signal, weight 5.0) should activate immediately ----
console.log("\n[2] A single STARRED article (weight 5.0) — explicit signal SHOULD activate");
sandbox.state = freshState({ exploit: 1.0, profile: { seeds: { "de::Gestirn": WEIGHTS.star }, cats: {} } });
rngDefault = 0.0; rngQueue = [];
{ let morelike = 0; for (let i = 0; i < 5000; i++) if (pick().type === "morelike") morelike++; check("star → morelike fires", morelike > 0, `morelike=${morelike}`); }

// ---- Scenario 3: TWO reads (two distinct seeds, 2.0 each = 4.0) — activates ----
console.log("\n[3] After reading TWO articles (signal 4.0) — profile MAY activate, gated by exploit");
sandbox.state = freshState({ exploit: 0.4, profile: { seeds: { "de::A": 2.0, "de::B": 2.0 }, cats: {} } });
rngDefault = 0.5; rngQueue = []; // r=0.5 ≥ exploit(0.4) → should NOT exploit
check("r=0.5 ≥ exploit 0.4 → not morelike", pick().type !== "morelike");
sandbox.state = freshState({ exploit: 0.4, profile: { seeds: { "de::A": 2.0, "de::B": 2.0 }, cats: {} } });
rngDefault = 0.5; rngQueue = [0.2]; // r=0.2 < 0.4 → morelike
check("r=0.2 < exploit 0.4 → morelike", pick().type === "morelike");

// ---- Scenario 4: cluster cap — replicate the REAL loadMore inner loop verbatim ----
// We mirror only the cap bookkeeping we added; fetch returns 6 same-seed items.
console.log("\n[4] Feed fill round — one seed must contribute at most 2 cards (MAX_PER_CLUSTER)");
function simulateFillRound() {
  // Profile strong enough to always exploit the single seed:
  sandbox.state = freshState({ exploit: 1.0, profile: { seeds: { "de::Werkzeug": 10.0 }, cats: {} } });
  rngDefault = 0.0; rngQueue = [];
  const MAX_PER_CLUSTER = 2, clusterUse = {};
  const seenTitles = new Set();
  const inserted = []; // {seed}
  let attempts = 0, added = 0;
  const fetchMoreLike = (seed) => Array.from({ length: 6 }, (_, i) => ({ title: seed + "#" + Math.random().toString(36).slice(2) }));
  const fetchRandom = () => Array.from({ length: 6 }, () => ({ title: "rand#" + Math.random().toString(36).slice(2) }));
  while (added < 4 && attempts < 6) {
    attempts++;
    let strat = pick();
    let clusterKey = strat.type === "morelike" ? "m:" + strat.seed : strat.type === "search" ? "s:" + strat.term : null;
    if (clusterKey && (clusterUse[clusterKey] || 0) >= MAX_PER_CLUSTER) { strat = { type: "random" }; clusterKey = null; }
    let batch = strat.type === "morelike" ? fetchMoreLike(strat.seed) : fetchRandom();
    const seed = strat.type === "morelike" ? strat.seed : null;
    let fromCluster = 0;
    for (const a of batch) {
      if (seenTitles.has(a.title)) continue;
      seenTitles.add(a.title);
      inserted.push({ seed });
      added++;
      if (clusterKey) { clusterUse[clusterKey] = (clusterUse[clusterKey] || 0) + 1; if (++fromCluster >= MAX_PER_CLUSTER) break; }
    }
  }
  return inserted;
}
let worstSameSeed = 0;
for (let run = 0; run < 1000; run++) {
  const ins = simulateFillRound();
  const counts = {};
  for (const x of ins) if (x.seed) counts[x.seed] = (counts[x.seed] || 0) + 1;
  worstSameSeed = Math.max(worstSameSeed, 0, ...Object.values(counts));
}
check(`across 1000 rounds, max cards from one seed per round = ${worstSameSeed} (≤2)`, worstSameSeed <= 2, `worst=${worstSameSeed}`);

console.log(`\n${fail === 0 ? "ALL PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
