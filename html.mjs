// Renders overview.html: a self-contained visual overview of the inventory and projects.
// Called by `node inv.mjs html` (and automatically by `validate`). Never edit overview.html by hand.

const FILE_LABEL = {
  filament: "Filament", electronics: "Electronics", hardware: "Hardware",
  consumables: "Consumables", tools: "Tools",
};

export function renderHtml(items, projects, generatedAt) {
  const data = { items, projects, fileLabel: FILE_LABEL, generatedAt };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maker-inventory</title>
<style>
:root {
  --bg: #f6f5f2; --panel: #ffffff; --ink: #1d1d1f; --muted: #6b6b70; --line: #e4e2dc;
  --accent: #2f6fd6; --ok: #2e8b57; --warn: #c98a00; --bad: #c8412f; --chip: #efede8;
  --okbg: #e6f4ec; --warnbg: #fdf3dc; --badbg: #fbe7e3;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #141416; --panel: #1d1d20; --ink: #ececee; --muted: #9a9aa2; --line: #2e2e33;
    --accent: #6ea0ff; --ok: #5cc48a; --warn: #e6b445; --bad: #f07a68; --chip: #2a2a2f;
    --okbg: #1c3326; --warnbg: #3a3018; --badbg: #3d221e;
  }
}
:root[data-theme="dark"] {
  --bg: #141416; --panel: #1d1d20; --ink: #ececee; --muted: #9a9aa2; --line: #2e2e33;
  --accent: #6ea0ff; --ok: #5cc48a; --warn: #e6b445; --bad: #f07a68; --chip: #2a2a2f;
  --okbg: #1c3326; --warnbg: #3a3018; --badbg: #3d221e;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 24px 16px 64px; }
header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
h1 { font-size: 26px; margin: 0; letter-spacing: -0.02em; }
h2 { font-size: 17px; margin: 32px 0 12px; display: flex; align-items: baseline; gap: 8px; }
h2 small { color: var(--muted); font-weight: 400; font-size: 13px; }
.stamp { color: var(--muted); font-size: 13px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 18px 0 8px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.stat b { display: block; font-size: 24px; letter-spacing: -0.02em; }
.stat span { color: var(--muted); font-size: 13px; }
.stat.warn b { color: var(--warn); } .stat.bad b { color: var(--bad); }
.controls { position: sticky; top: 0; z-index: 2; background: var(--bg); padding: 12px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
input[type=search] { flex: 1 1 240px; min-width: 0; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line);
  background: var(--panel); color: var(--ink); font: inherit; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 999px; padding: 6px 12px;
  font: inherit; font-size: 13px; cursor: pointer; }
.chip[aria-pressed=true] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.toggle { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.card .top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.card .name { font-weight: 600; }
.card .id { color: var(--muted); font: 12px ui-monospace, Consolas, monospace; }
.qty { font-size: 20px; font-weight: 650; white-space: nowrap; letter-spacing: -0.02em; }
.qty small { font-size: 12px; color: var(--muted); font-weight: 400; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { background: var(--chip); border-radius: 6px; padding: 1px 7px; font-size: 12px; color: var(--muted); }
.specs { font-size: 12px; color: var(--muted); }
.badges { display: flex; flex-wrap: wrap; gap: 4px; }
.badge { font-size: 12px; border-radius: 6px; padding: 1px 7px; }
.b-warn { background: var(--warnbg); color: var(--warn); }
.b-bad { background: var(--badbg); color: var(--bad); }
.b-info { background: var(--chip); color: var(--ink); }
.notes { font-size: 13px; color: var(--muted); }
.swatch { width: 40px; height: 40px; border-radius: 50%; flex: none; border: 1px solid var(--line);
  box-shadow: inset 0 -6px 10px rgba(0,0,0,.15); }
.fil { flex-direction: row; gap: 12px; align-items: center; }
.fil .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.bar { height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); }
.empty { background: var(--panel); border: 1px dashed var(--line); border-radius: 12px; padding: 16px; color: var(--muted); font-size: 14px; }
.proj .head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.prog { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--chip); }
.prog i:nth-child(1) { background: var(--ok); } .prog i:nth-child(2) { background: var(--warn); } .prog i:nth-child(3) { background: var(--bad); }
.need { display: grid; grid-template-columns: 18px 1fr auto; gap: 6px; font-size: 13px; padding: 3px 0; border-top: 1px solid var(--line); }
.need .s-OK { color: var(--ok); } .need .s-SHORT { color: var(--warn); } .need .s-MISSING { color: var(--bad); }
.need .alt { grid-column: 2 / 4; color: var(--muted); font-size: 12px; }
.hidden { display: none !important; }
footer { margin-top: 40px; color: var(--muted); font-size: 12px; }
code { font: 12px ui-monospace, Consolas, monospace; background: var(--chip); padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Maker-inventory</h1>
    <span class="stamp" id="stamp"></span>
  </header>
  <div class="stats" id="stats"></div>

  <div class="controls">
    <input type="search" id="q" placeholder="Search: petg red, servo, m3, 5v …" autocomplete="off">
    <div class="chips" id="chips"></div>
    <label class="toggle"><input type="checkbox" id="onlyWarn"> only what needs attention</label>
  </div>

  <div id="sections"></div>

  <h2 id="projects-h">Projects <small>what you have and what to buy</small></h2>
  <div class="grid" id="projects"></div>

  <footer>Generated from <code>inventory/*.yaml</code> och <code>projects/*.yaml</code> by <code>node inv.mjs html</code>. Edit the YAML files, not this page.</footer>
</div>

<script>
const DATA = ${json};
const COLORS = {
  svart: "#1b1b1b", vit: "#f4f4f2", grå: "#8c8c8c", silver: "#c0c4c8", röd: "#d0352b", blå: "#2f63c9",
  ljusblå: "#7fb6e8", mörkblå: "#1f3a7a", grön: "#3a9a4c", ljusgrön: "#8fd17a", gul: "#f2c62e", orange: "#ef8424",
  lila: "#7f4cc4", rosa: "#ec86ad", brun: "#7a4e2d", beige: "#d9c6a2", guld: "#c9a43c", natur: "#e9e2cf",
  turkos: "#2bb3b1", magenta: "#c62f8e", transparent: "transparent",
  black: "#1b1b1b", white: "#f4f4f2", gray: "#8c8c8c", grey: "#8c8c8c", red: "#d0352b", blue: "#2f63c9",
  "light blue": "#7fb6e8", "dark blue": "#1f3a7a", green: "#3a9a4c", "light green": "#8fd17a", yellow: "#f2c62e",
  purple: "#7f4cc4", pink: "#ec86ad", brown: "#7a4e2d", gold: "#c9a43c", natural: "#e9e2cf", teal: "#2bb3b1",
};
const swatchStyle = (c) => {
  const k = String(c || "").toLowerCase().trim();
  if (k === "transparent" || k === "genomskinlig" || k === "clear")
    return "background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50%/10px 10px";
  if (COLORS[k]) return "background:" + COLORS[k];
  if (/^#|^rgb/.test(k)) return "background:" + k;
  let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return "background: hsl(" + h + " 55% 55%)";
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unitOf = (it) => it.unit || (it._file === "filament" ? "g" : "pcs");
const isLow = (it) => it.min_qty !== undefined && Number(it.qty) < Number(it.min_qty);
const needsCheck = (it) => it.verified === false || isLow(it) || !!it.in_use;
const hay = (it) => [it.id, it.name, it.category, it.material, it.color, it.finish, it.brand, it.location, it.notes,
  DATA.fileLabel[it._file], ...(it.tags || []), ...Object.entries(it.specs || {}).flat()].join(" ").toLowerCase();

const items = DATA.items;
const files = Object.keys(DATA.fileLabel);
document.getElementById("stamp").textContent = "Updated " + DATA.generatedAt;

// Stats
const filG = items.filter((i) => i._file === "filament").reduce((s, i) => s + Number(i.qty || 0), 0);
const unv = items.filter((i) => i.verified === false).length;
const low = items.filter(isLow).length;
const missing = DATA.projects.filter((p) => !p.example).reduce((s, p) => s + p.rows.filter((r) => r.status !== "OK").length, 0);
document.getElementById("stats").innerHTML = [
  ["", items.length, "items in total"],
  ["", (filG / 1000).toFixed(filG ? 1 : 0) + " kg", "filament on hand"],
  [unv ? "warn" : "", unv, "not verified"],
  [low ? "bad" : "", low, "below minimum"],
  [missing ? "bad" : "", missing, "to buy for projects"],
].map(([c, b, s]) => '<div class="stat ' + c + '"><b>' + b + "</b><span>" + s + "</span></div>").join("");

// Chips
let active = "all";
const chips = document.getElementById("chips");
chips.innerHTML = [["all", "All"], ...files.map((f) => [f, DATA.fileLabel[f]]), ["projects", "Projects"]]
  .map(([k, l]) => '<button class="chip" data-k="' + k + '" aria-pressed="' + (k === "all") + '">' + l + "</button>").join("");
chips.addEventListener("click", (e) => {
  const b = e.target.closest(".chip"); if (!b) return;
  active = b.dataset.k;
  chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
  render();
});

function badges(it) {
  const b = [];
  if (it.verified === false) b.push('<span class="badge b-warn">unverified</span>');
  if (isLow(it)) b.push('<span class="badge b-bad">below min (' + esc(it.min_qty) + ")</span>");
  if (it.in_use) b.push('<span class="badge b-info">in use: ' + esc(it.in_use) + "</span>");
  if (it.location) b.push('<span class="badge b-info">📍 ' + esc(it.location) + "</span>");
  return b.length ? '<div class="badges">' + b.join("") + "</div>" : "";
}

function filamentCard(it) {
  const g = Number(it.qty || 0);
  const pct = Math.min(100, (g / (1000 * Math.max(1, Number(it.spools || 1)))) * 100);
  return '<div class="card fil"><div class="swatch" style="' + swatchStyle(it.color) + '"></div><div class="body">' +
    '<div class="top"><div><div class="name">' + esc(it.material) + " " + esc(it.color) +
    (it.finish ? " · " + esc(it.finish) : "") + '</div><div class="id">' + esc(it.brand || it.id) + "</div></div>" +
    '<div class="qty">' + g + " <small>g" + (it.spools ? " · " + esc(it.spools) + " spools" : "") + "</small></div></div>" +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' + badges(it) +
    (it.notes ? '<div class="notes">' + esc(it.notes) + "</div>" : "") + "</div></div>";
}

function itemCard(it) {
  const specs = Object.entries(it.specs || {}).map(([k, v]) => esc(k) + ": " + esc(v)).join(" · ");
  return '<div class="card"><div class="top"><div><div class="name">' + esc(it.name) + '</div><div class="id">' +
    esc(it.id) + (it.category ? " · " + esc(it.category) : "") + "</div></div>" +
    '<div class="qty">' + esc(it.qty) + " <small>" + esc(unitOf(it)) + "</small></div></div>" +
    (specs ? '<div class="specs">' + specs + "</div>" : "") +
    (it.tags && it.tags.length ? '<div class="tags">' + it.tags.map((t) => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" : "") +
    badges(it) + (it.notes ? '<div class="notes">' + esc(it.notes) + "</div>" : "") + "</div>";
}

function projectCard(p) {
  const n = p.rows.length || 1;
  const c = (s) => p.rows.filter((r) => r.status === s).length;
  const icon = { OK: "✓", SHORT: "◐", MISSING: "✕" };
  const rows = p.rows.map((r) =>
    '<div class="need"><span class="s-' + r.status + '">' + icon[r.status] + "</span><span>" + esc(r.need) +
    (r.optional ? ' <span class="tag">optional</span>' : "") + "</span><span>" + r.got + " / " + r.qty + " " + esc(r.unit) + "</span>" +
    r.alternatives.map((a) => '<span class="alt">alt (' + esc(a.why) + "): " + esc(a.name) + " · " + esc(a.qty) + " " + esc(a.unit) + "</span>").join("") +
    "</div>").join("");
  return '<div class="card proj"><div class="head"><div class="name">' + esc(p.name) + "</div>" +
    '<div class="id">' + c("OK") + "/" + p.rows.length + " ready</div></div>" +
    (p.example ? '<div class="badges"><span class="badge b-info">example</span></div>' : "") +
    '<div class="prog"><i style="width:' + (c("OK") / n) * 100 + '%"></i><i style="width:' + (c("SHORT") / n) * 100 +
    '%"></i><i style="width:' + (c("MISSING") / n) * 100 + '%"></i></div>' + rows + "</div>";
}

function render() {
  const words = document.getElementById("q").value.toLowerCase().split(/\\s+/).filter(Boolean);
  const onlyWarn = document.getElementById("onlyWarn").checked;
  const ok = (it) => words.every((w) => hay(it).includes(w)) && (!onlyWarn || needsCheck(it));
  const out = [];
  for (const f of files) {
    if (active !== "all" && active !== f) continue;
    const all = items.filter((i) => i._file === f);
    const shown = all.filter(ok);
    if (!shown.length && (words.length || onlyWarn)) continue;
    out.push("<h2>" + DATA.fileLabel[f] + " <small>" + shown.length + (shown.length !== all.length ? " of " + all.length : "") + "</small></h2>");
    out.push(shown.length ? '<div class="grid">' + shown.map(f === "filament" ? filamentCard : itemCard).join("") + "</div>"
      : '<div class="empty">Nothing here yet. Tell an agent what you have, e.g. “2 spools of black PLA basic”.</div>');
  }
  if (!out.length && active !== "projects") out.push('<div class="empty">No matches.</div>');
  document.getElementById("sections").innerHTML = out.join("");
  const showProj = active === "all" || active === "projects";
  document.getElementById("projects-h").classList.toggle("hidden", !showProj);
  const pEl = document.getElementById("projects");
  pEl.classList.toggle("hidden", !showProj);
  pEl.innerHTML = DATA.projects.length ? DATA.projects.map(projectCard).join("")
    : '<div class="empty">No projects yet.</div>';
}
document.getElementById("q").addEventListener("input", render);
document.getElementById("onlyWarn").addEventListener("change", render);
render();
</script>
</body>
</html>`;
}
