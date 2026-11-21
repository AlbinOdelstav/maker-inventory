/* maker-inventory web app. Same code runs live (`node inv.mjs app`) and as a read-only snapshot (overview.html). */
(() => {
"use strict";

const BOOT = window.__BOOT__ || { mode: "snapshot", data: { items: [], projects: [] } };
const LIVE = BOOT.mode === "live";
const FILES = ["filament", "electronics", "hardware", "consumables", "tools"];

// ---------------------------------------------------------------- i18n
const I18N = {
  en: {
    "app.sub": "Parts, filament & projects", "nav.workspace": "Workspace", "nav.inventory": "Inventory",
    "nav.dashboard": "Overview", "nav.projects": "Projects",
    "file.filament": "Filament", "file.electronics": "Electronics", "file.hardware": "Hardware", "file.consumables": "Consumables", "file.tools": "Tools",
    "search": "Search everything…", "add": "Add item", "results": "Search results",
    "live": "Live · saves to YAML", "snapshot": "Read-only snapshot", "updated": "Updated {t}",
    "ro.banner": "This is a read-only snapshot. To add and edit items, run", "lang": "Language", "theme": "Theme",
    "theme.auto": "Auto", "theme.light": "Light", "theme.dark": "Dark",
    "kpi.items": "Items", "kpi.filament": "Filament on hand", "kpi.low": "Below minimum", "kpi.unverified": "Not verified", "kpi.tobuy": "To buy for projects",
    "attn.title": "Needs attention", "attn.none": "Nothing needs attention. 🎉", "attn.low": "below min {n}", "attn.unverified": "not verified", "attn.inuse": "in use: {p}",
    "fil.title": "Filament", "fil.none": "No filament yet.", "proj.title": "Projects", "proj.none": "No projects yet.",
    "proj.hint": "Projects are YAML files in {dir}. Ask an agent: “check if I have everything for …”, or copy {ex}.",
    "proj.ready": "{a}/{b} ready", "proj.short": "{n} short", "proj.missing": "{n} missing", "proj.example": "example",
    "proj.need": "Need", "proj.qty": "Qty", "proj.have": "Have", "proj.from": "From stock", "proj.notes": "Notes",
    "proj.shop": "Shopping list", "proj.copy": "Copy as Markdown", "proj.copied": "Shopping list copied", "proj.nothing": "Nothing to buy. You have everything.",
    "proj.optional": "optional", "proj.alt": "you have: {name} ({qty})", "why.other color": "other color", "why.other specs": "other specs",
    "why.same category": "same category", "why.other finish/brand": "other finish/brand", "proj.inuse": "in use in {p}",
    "col.name": "Name", "col.category": "Category", "col.tags": "Tags", "col.specs": "Specs", "col.location": "Location", "col.qty": "Qty",
    "col.status": "Status", "col.section": "Section", "col.color": "Filament", "col.finish": "Finish", "col.brand": "Brand", "col.grams": "Left", "col.spools": "Spools",
    "all": "All", "attention": "Needs attention", "count": "{n} of {total} items", "no.rows": "No items match.",
    "empty.title": "Your inventory is empty", "empty.text": "Add what you have at home (filament, boards, sensors, screws) and agents can tell you what a project still needs.",
    "empty.cta": "Add your first item", "empty.file": "Nothing in {f} yet.",
    "b.unverified": "not verified", "b.low": "low", "b.inuse": "in use: {p}",
    "d.new": "New item", "d.edit": "Edit item", "d.view": "Item", "d.save": "Save", "d.cancel": "Cancel", "d.close": "Close", "d.delete": "Delete", "d.confirm": "Click again to delete",
    "f.basics": "Basics", "f.stock": "Stock", "f.details": "Details", "f.name": "Name", "f.name.auto": "Leave empty to use material + color.", "f.id": "ID", "f.id.hint": "Unique, kebab-case. Projects refer to it.",
    "f.section": "Section", "f.category": "Category", "f.material": "Material", "f.color": "Color", "f.finish": "Finish", "f.brand": "Brand",
    "f.qty": "Quantity", "f.grams": "Grams left", "f.unit": "Unit", "f.spools": "Spools", "f.min": "Warn below", "f.location": "Location",
    "f.inuse": "Built into project", "f.inuse.hint": "Still counts as owned, but is flagged in checks.", "f.verified": "Verified: I have checked this in the drawer",
    "f.tags": "Tags", "f.tags.hint": "Press Enter or comma to add. Used by agents to match parts (e.g. 5v, i2c).",
    "f.specs": "Specs", "f.spec.key": "key (e.g. voltage)", "f.spec.val": "value", "f.spec.add": "Add spec", "f.notes": "Notes", "f.source": "Source",
    "t.saved": "Saved", "t.added": "Added {n}", "t.deleted": "Deleted {n}", "t.conflict": "The file was changed elsewhere (an agent?). Reloaded — check and save again.",
    "t.reloaded": "Updated from disk", "t.error": "Could not save: {e}", "t.offline": "Lost connection to the app server",
    "a.dec": "Decrease", "a.inc": "Increase", "a.remove": "Remove", "unsaved": "Discard unsaved changes?",
  },
  sv: {
    "app.sub": "Delar, filament & projekt", "nav.workspace": "Arbetsyta", "nav.inventory": "Lager",
    "nav.dashboard": "Översikt", "nav.projects": "Projekt",
    "file.filament": "Filament", "file.electronics": "Elektronik", "file.hardware": "Mekanik", "file.consumables": "Förbrukning", "file.tools": "Verktyg",
    "search": "Sök i allt…", "add": "Lägg till", "results": "Sökresultat",
    "live": "Live · sparar till YAML", "snapshot": "Skrivskyddad ögonblicksbild", "updated": "Uppdaterad {t}",
    "ro.banner": "Det här är en skrivskyddad ögonblicksbild. För att lägga till och ändra, kör", "lang": "Språk", "theme": "Tema",
    "theme.auto": "Auto", "theme.light": "Ljust", "theme.dark": "Mörkt",
    "kpi.items": "Poster", "kpi.filament": "Filament hemma", "kpi.low": "Under miniminivå", "kpi.unverified": "Ej verifierade", "kpi.tobuy": "Att köpa till projekt",
    "attn.title": "Behöver kollas", "attn.none": "Inget behöver kollas. 🎉", "attn.low": "under min {n}", "attn.unverified": "ej verifierad", "attn.inuse": "sitter i {p}",
    "fil.title": "Filament", "fil.none": "Inget filament än.", "proj.title": "Projekt", "proj.none": "Inga projekt än.",
    "proj.hint": "Projekt är YAML-filer i {dir}. Fråga en agent: ”kolla om jag har allt för …”, eller kopiera {ex}.",
    "proj.ready": "{a}/{b} klart", "proj.short": "{n} räcker inte", "proj.missing": "{n} saknas", "proj.example": "exempel",
    "proj.need": "Behov", "proj.qty": "Antal", "proj.have": "Hemma", "proj.from": "Från lagret", "proj.notes": "Noteringar",
    "proj.shop": "Inköpslista", "proj.copy": "Kopiera som Markdown", "proj.copied": "Inköpslistan kopierad", "proj.nothing": "Inget att köpa. Du har allt.",
    "proj.optional": "valfri", "proj.alt": "du har: {name} ({qty})", "why.other color": "annan färg", "why.other specs": "andra specs",
    "why.same category": "samma kategori", "why.other finish/brand": "annan finish/märke", "proj.inuse": "sitter i {p}",
    "col.name": "Namn", "col.category": "Kategori", "col.tags": "Taggar", "col.specs": "Specs", "col.location": "Plats", "col.qty": "Antal",
    "col.status": "Status", "col.section": "Sektion", "col.color": "Filament", "col.finish": "Finish", "col.brand": "Märke", "col.grams": "Kvar", "col.spools": "Rullar",
    "all": "Alla", "attention": "Behöver kollas", "count": "{n} av {total} poster", "no.rows": "Inga poster matchar.",
    "empty.title": "Ditt lager är tomt", "empty.text": "Lägg in det du har hemma (filament, kort, sensorer, skruv) så kan agenter säga vad ett projekt saknar.",
    "empty.cta": "Lägg till första posten", "empty.file": "Inget i {f} än.",
    "b.unverified": "ej verifierad", "b.low": "lågt", "b.inuse": "sitter i {p}",
    "d.new": "Ny post", "d.edit": "Ändra post", "d.view": "Post", "d.save": "Spara", "d.cancel": "Avbryt", "d.close": "Stäng", "d.delete": "Ta bort", "d.confirm": "Klicka igen för att ta bort",
    "f.basics": "Grundinfo", "f.stock": "Lager", "f.details": "Detaljer", "f.name": "Namn", "f.name.auto": "Lämna tomt för material + färg.", "f.id": "ID", "f.id.hint": "Unikt, kebab-case. Projekt pekar på det.",
    "f.section": "Sektion", "f.category": "Kategori", "f.material": "Material", "f.color": "Färg", "f.finish": "Finish", "f.brand": "Märke",
    "f.qty": "Antal", "f.grams": "Gram kvar", "f.unit": "Enhet", "f.spools": "Rullar", "f.min": "Varna under", "f.location": "Plats",
    "f.inuse": "Monterad i projekt", "f.inuse.hint": "Räknas som ägd, men flaggas i kontroller.", "f.verified": "Verifierad: jag har kollat i lådan",
    "f.tags": "Taggar", "f.tags.hint": "Enter eller komma för att lägga till. Agenter matchar delar på dem (t.ex. 5v, i2c).",
    "f.specs": "Specs", "f.spec.key": "nyckel (t.ex. spänning)", "f.spec.val": "värde", "f.spec.add": "Lägg till spec", "f.notes": "Anteckningar", "f.source": "Källa",
    "t.saved": "Sparat", "t.added": "Lade till {n}", "t.deleted": "Tog bort {n}", "t.conflict": "Filen ändrades någon annanstans (en agent?). Laddade om – kolla och spara igen.",
    "t.reloaded": "Uppdaterat från disk", "t.error": "Kunde inte spara: {e}", "t.offline": "Tappade kontakten med app-servern",
    "a.dec": "Minska", "a.inc": "Öka", "a.remove": "Ta bort", "unsaved": "Släng osparade ändringar?",
  },
};
const store = {
  get(k) { try { return localStorage.getItem("mi." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("mi." + k, v); } catch { /* private mode */ } },
};
let lang = store.get("lang") || ((navigator.language || "").toLowerCase().startsWith("sv") ? "sv" : "en");
const t = (k, vars = {}) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
const fileLabel = (f) => I18N[lang]["file." + f] ? t("file." + f) : f;
// ---------------------------------------------------------------- vocabulary
// Data stores canonical keys (English); the UI shows them in the chosen language and accepts either.
const VOCAB = window.__VOCAB__ || { colors: {}, finishes: {}, categories: {}, units: {}, specKeys: {} };
if (!window.__VOCAB__) console.warn("maker-inventory: no vocabulary from the server. Restart `node inv.mjs app` after updating the tool.");
const ALL_CATS = Object.assign({}, ...Object.values(VOCAB.categories));
const vnorm = (s) => String(s ?? "").trim().toLowerCase();
function canon(table, value) {
  const v = vnorm(value); if (!v) return null;
  for (const [key, e] of Object.entries(table)) if (vnorm(key) === v || vnorm(e.en) === v || vnorm(e.sv) === v || (e.aliases || []).some((a) => vnorm(a) === v)) return key;
  return null;
}
const label = (table, value) => { const k = canon(table, value); return k ? table[k][lang] : (value ?? ""); };
const catTable = (file) => VOCAB.categories[file] || ALL_CATS;
const colorLabel = (c) => label(VOCAB.colors, c);
const finishLabel = (f) => label(VOCAB.finishes, f);
const catLabel = (c, file) => label(catTable(file), c);
const unitLabel = (u) => label(VOCAB.units, u);
const specLabel = (k) => label(VOCAB.specKeys, k);
// Every way to name a vocab value, so search finds "grön" and "green" alike.
const allNames = (table, value) => { const k = canon(table, value); return k ? [k, table[k].en, table[k].sv, ...(table[k].aliases || [])] : [value]; };
// Form shows labels in the current language; the server stores the canonical key.
function localizeForm(f, file) {
  // A filament name that is just "material + color" (in any language) is auto: show it empty with a localized placeholder.
  if (file === "filament" && f.name && allNames(VOCAB.colors, f.color).some((c) => vnorm(f.name) === vnorm(`${f.material} ${c}`))) f.name = "";
  if (f.color) f.color = colorLabel(f.color);
  if (f.finish) f.finish = finishLabel(f.finish);
  if (f.category) f.category = catLabel(f.category, file);
  if (f.unit) f.unit = unitLabel(f.unit);
  if (f.specs) f.specs = Object.fromEntries(Object.entries(f.specs).map(([k, v]) => [specLabel(k), v]));
  return f;
}
const fmtNum = (n) => Number(n).toLocaleString(lang === "sv" ? "sv-SE" : "en-US", { maximumFractionDigits: 2 });

// ---------------------------------------------------------------- theme
let theme = store.get("theme") || "auto";
const applyTheme = () => { if (theme === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = theme; };
applyTheme();

// ---------------------------------------------------------------- state
let S = normalize(BOOT.data || { items: [], projects: [] });
let route = parseRoute();
let query = "";
const ui = { attention: false, category: "", sort: { key: "name", dir: 1 }, project: null };
let drawer = null; // { mode: "new"|"edit"|"view", originalId, file, form, dirty, armed }
let saving = false;

function normalize(d) { return { items: d.items || [], projects: d.projects || [], versions: d.versions || {}, version: d.version, generatedAt: d.generatedAt, dataDir: d.dataDir }; }
function parseRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [page, arg] = h.split("/");
  if (FILES.includes(page)) return { page: "file", file: page };
  if (page === "projects") return { page: "projects", project: arg || null };
  return { page: "dashboard" };
}

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const unitOf = (it) => it.unit || (it._file === "filament" ? "g" : "pcs");
const isLow = (it) => it.min_qty !== undefined && it.min_qty !== null && Number(it.qty) < Number(it.min_qty);
const needsAttention = (it) => it.verified === false || isLow(it) || !!it.in_use;
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/×/g, "x").replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
const hay = (it) => [it.id, it.name, it.material, it.brand, it.location, it.notes, it.in_use, fileLabel(it._file),
  ...allNames(catTable(it._file), it.category), ...allNames(VOCAB.colors, it.color), ...allNames(VOCAB.finishes, it.finish),
  ...(it.tags || []), ...Object.entries(it.specs || {}).flatMap(([k, v]) => [...allNames(VOCAB.specKeys, k), v])].join(" ").toLowerCase();
const matchQuery = (it) => query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay(it).includes(w));

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  filament: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6"/>',
  electronics: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  hardware: '<path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/><circle cx="12" cy="12" r="3"/>',
  consumables: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',
};
const icon = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

function swatch(color, lg) {
  const k = String(color || "").toLowerCase().trim();
  const key = canon(VOCAB.colors, k);
  let st;
  if (key === "transparent") st = "background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50%/8px 8px";
  else if (key) st = "background:" + VOCAB.colors[key].hex;
  else if (/^#[0-9a-f]{3,8}$/i.test(k)) st = "background:" + k;
  else if (!k) st = "background: var(--surface-2)";
  else { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360; st = `background: hsl(${h} 55% 55%)`; }
  return `<span class="sw${lg ? " lg" : ""}" style="${st}" title="${esc(colorLabel(color))}"></span>`;
}
function badges(it) {
  const b = [];
  if (isLow(it)) b.push(`<span class="badge b-bad">${esc(t("b.low"))}</span>`);
  if (it.verified === false) b.push(`<span class="badge b-warn">${esc(t("b.unverified"))}</span>`);
  if (it.in_use) b.push(`<span class="badge b-info">${esc(t("b.inuse", { p: it.in_use }))}</span>`);
  return `<div class="badges">${b.join("")}</div>`;
}
const filamentTitle = (it) => [it.material, colorLabel(it.color)].filter(Boolean).join(" ") || it.name;

// ---------------------------------------------------------------- layout
function renderShell() {
  const counts = Object.fromEntries(FILES.map((f) => [f, S.items.filter((i) => i._file === f)]));
  const nav = (href, ic, label, current, extra = "") =>
    `<a href="#/${href}" ${current ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span>${extra}</a>`;
  const title = route.page === "dashboard" ? (query ? t("results") : t("nav.dashboard"))
    : route.page === "projects" ? t("nav.projects") : fileLabel(route.file);
  const stamp = S.generatedAt ? new Date(S.generatedAt).toLocaleString(lang === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "";

  $("#app").innerHTML = `
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><div class="logo">${icon("box")}</div><div>maker-inventory<small>${esc(t("app.sub"))}</small></div></div>
      <nav class="nav">
        <div class="nav-label">${esc(t("nav.workspace"))}</div>
        ${nav("", "grid", t("nav.dashboard"), route.page === "dashboard")}
        ${nav("projects", "projects", t("nav.projects"), route.page === "projects", `<span class="count">${S.projects.filter((p) => !p.example).length}</span>`)}
        <div class="nav-label">${esc(t("nav.inventory"))}</div>
        ${FILES.map((f) => nav(f, f, fileLabel(f), route.page === "file" && route.file === f,
          `<span class="count">${counts[f].length}</span>${counts[f].some(needsAttention) ? '<span class="dot" title="' + esc(t("attention")) + '"></span>' : ""}`)).join("")}
      </nav>
      <div class="foot">
        <div class="status ${LIVE ? "" : "ro"}"><span class="pulse"></span><span>${esc(LIVE ? t("live") : t("snapshot"))}${!LIVE && stamp ? " · " + esc(stamp) : ""}</span></div>
        <div class="foot-row">
          <div class="seg" role="group" aria-label="${esc(t("lang"))}">
            <button data-lang="sv" aria-pressed="${lang === "sv"}">SV</button><button data-lang="en" aria-pressed="${lang === "en"}">EN</button>
          </div>
          <div class="seg" role="group" aria-label="${esc(t("theme"))}">
            ${["auto", "light", "dark"].map((m) => `<button data-theme-set="${m}" aria-pressed="${theme === m}" title="${esc(t("theme." + m))}">${icon(m === "light" ? "sun" : m === "dark" ? "moon" : "auto")}</button>`).join("")}
          </div>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1>${esc(title)}</h1>
        <label class="search">${icon("search")}<input id="q" type="search" placeholder="${esc(t("search"))}" value="${esc(query)}" autocomplete="off"><kbd>/</kbd></label>
        ${LIVE ? `<button class="btn primary" data-act="new">${icon("plus")}<span class="hide-sm">${esc(t("add"))}</span></button>` : ""}
      </header>
      ${LIVE ? "" : `<div class="banner">${icon("alert")}<span>${esc(t("ro.banner"))} <code>node inv.mjs app</code></span></div>`}
      <main class="content" id="content"></main>
    </div>
  </div>`;
  renderContent();
}

function renderContent() {
  const el = $("#content");
  if (!el) return;
  if (route.page === "projects") el.innerHTML = projectsView();
  else if (route.page === "file") el.innerHTML = fileView(route.file);
  else el.innerHTML = query.trim() ? searchView() : dashboardView();
}

// ---------------------------------------------------------------- dashboard
function dashboardView() {
  if (!S.items.length) {
    return `<div class="welcome">${icon("box", "i")}<h2>${esc(t("empty.title"))}</h2><p>${esc(t("empty.text"))}</p>
      ${LIVE ? `<button class="btn primary" data-act="new">${icon("plus")}${esc(t("empty.cta"))}</button>` : ""}</div>` + projectsPanel();
  }
  const fil = S.items.filter((i) => i._file === "filament");
  const grams = fil.reduce((s, i) => s + Number(i.qty || 0), 0);
  const low = S.items.filter(isLow), unv = S.items.filter((i) => i.verified === false);
  const toBuy = S.projects.filter((p) => !p.example).reduce((s, p) => s + p.rows.filter((r) => r.status !== "OK" && !r.optional).length, 0);
  const kpi = (cls, label, value, act) => `<button class="kpi ${cls}" data-act="${act}"><div class="label">${esc(label)}</div><div class="value">${value}</div></button>`;

  const attn = [...low, ...unv.filter((i) => !isLow(i)), ...S.items.filter((i) => i.in_use && !isLow(i) && i.verified !== false)].slice(0, 9);
  const attnRows = attn.map((it) => {
    const why = [isLow(it) && t("attn.low", { n: it.min_qty }), it.verified === false && t("attn.unverified"), it.in_use && t("attn.inuse", { p: it.in_use })].filter(Boolean).join(" · ");
    return `<div class="list-row" data-open="${esc(it.id)}">${it._file === "filament" ? swatch(it.color) : `<span class="muted">${icon(it._file)}</span>`}
      <div class="grow"><div class="title">${esc(it._file === "filament" ? filamentTitle(it) : it.name)}</div><div class="sub">${esc(fileLabel(it._file))} · ${esc(why)}</div></div>
      <div class="qty-ro">${fmtNum(it.qty ?? 0)} <small>${esc(unitLabel(unitOf(it)))}</small></div></div>`;
  }).join("");

  const maxG = Math.max(1000, ...fil.map((i) => Number(i.qty || 0)));
  const filRows = [...fil].sort((a, b) => b.qty - a.qty).slice(0, 8).map((it) =>
    `<div class="list-row" data-open="${esc(it.id)}">${swatch(it.color, true)}<div class="grow"><div class="title">${esc(filamentTitle(it))}${it.finish ? ` <span class="muted">· ${esc(finishLabel(it.finish))}</span>` : ""}</div>
      <div class="bar ${isLow(it) ? "low" : ""}"><i style="width:${Math.min(100, (Number(it.qty || 0) / maxG) * 100)}%"></i></div></div>
      <div class="qty-ro">${fmtNum(it.qty ?? 0)} <small>g</small></div></div>`).join("");

  return `<div class="kpis">
      ${kpi("", t("kpi.items"), S.items.length, "nav:")}
      ${kpi("", t("kpi.filament"), (grams / 1000).toLocaleString(lang === "sv" ? "sv-SE" : "en-US", { maximumFractionDigits: 1 }) + " kg", "nav:filament")}
      ${kpi(low.length ? "bad" : "", t("kpi.low"), low.length, "attn")}
      ${kpi(unv.length ? "warn" : "", t("kpi.unverified"), unv.length, "attn")}
      ${kpi(toBuy ? "bad" : "", t("kpi.tobuy"), toBuy, "nav:projects")}
    </div>
    <div class="panels">
      <section class="panel"><div class="panel-h"><h2>${esc(t("attn.title"))}</h2><span class="muted">${attn.length}</span></div>
        <div class="panel-b">${attnRows || `<div class="empty-mini">${esc(t("attn.none"))}</div>`}</div></section>
      <section class="panel"><div class="panel-h"><h2>${esc(t("fil.title"))}</h2><a class="btn sm ghost" href="#/filament">${fmtNum(fil.length)} →</a></div>
        <div class="panel-b">${filRows || `<div class="empty-mini">${esc(t("fil.none"))}</div>`}</div></section>
    </div>${projectsPanel()}`;
}

function projStats(p) {
  const c = (s) => p.rows.filter((r) => r.status === s).length;
  return { ok: c("OK"), short: c("SHORT"), missing: c("MISSING"), n: p.rows.length || 1 };
}
const progBar = (s) => `<div class="prog"><i class="p-ok" style="width:${s.ok / s.n * 100}%"></i><i class="p-short" style="width:${s.short / s.n * 100}%"></i><i class="p-missing" style="width:${s.missing / s.n * 100}%"></i></div>`;

function projectsPanel() {
  const cards = S.projects.map((p) => {
    const s = projStats(p);
    return `<button class="proj-card" data-act="nav:projects/${esc(encodeURIComponent(p.file))}"><div class="name"><span>${esc(p.name)}</span>
      ${p.example ? `<span class="badge b-info">${esc(t("proj.example"))}</span>` : ""}</div>${progBar(s)}
      <div class="meta"><span>${esc(t("proj.ready", { a: s.ok, b: p.rows.length }))}</span>${s.short ? `<span>${esc(t("proj.short", { n: s.short }))}</span>` : ""}${s.missing ? `<span>${esc(t("proj.missing", { n: s.missing }))}</span>` : ""}</div></button>`;
  }).join("");
  return `<section class="panel full"><div class="panel-h"><h2>${esc(t("proj.title"))}</h2></div>
    ${cards ? `<div class="proj-grid">${cards}</div>` : `<div class="hint">${projHint()}</div>`}</section>`;
}
const projHint = () => t("proj.hint", { dir: "<code>projects/</code>", ex: "<code>examples/projects/plant-watering.yaml</code>" });

// ---------------------------------------------------------------- tables
function sortItems(list, file) {
  const { key, dir } = ui.sort;
  const val = (it) => key === "qty" ? Number(it.qty || 0) : key === "name" ? String(file === "filament" ? filamentTitle(it) : it.name).toLowerCase()
    : key === "section" ? fileLabel(it._file) : key === "category" ? catLabel(it.category, it._file).toLowerCase()
    : key === "finish" ? finishLabel(it.finish).toLowerCase() : String(it[key] ?? "").toLowerCase();
  return [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
}
function th(key, label, cls = "") {
  const on = ui.sort.key === key;
  return `<th class="sortable ${cls}" data-sort="${key}">${esc(label)}${on ? `<span class="arrow">${ui.sort.dir > 0 ? "↑" : "↓"}</span>` : ""}</th>`;
}
function qtyCell(it) {
  const u = unitOf(it);
  if (!LIVE) return `<span class="qty-ro">${fmtNum(it.qty ?? 0)} <small>${esc(unitLabel(u))}</small></span>`;
  return `<div class="stepper" data-stop><button data-step="-1" data-id="${esc(it.id)}" aria-label="${esc(t("a.dec"))}">${icon("minus")}</button>
    <span class="v">${fmtNum(it.qty ?? 0)}<small>${esc(unitLabel(u))}</small></span>
    <button data-step="1" data-id="${esc(it.id)}" aria-label="${esc(t("a.inc"))}">${icon("plus")}</button></div>`;
}
const specsText = (it) => Object.entries(it.specs || {}).map(([k, v]) => `${specLabel(k)}: ${v}`).join(" · ");
const tagsHtml = (it) => (it.tags || []).slice(0, 5).map((x) => `<span class="tag">${esc(x)}</span>`).join("") + ((it.tags || []).length > 5 ? `<span class="tag">+${it.tags.length - 5}</span>` : "");

function itemTable(list, file, showSection) {
  if (!list.length) return `<div class="table-wrap"><div class="no-rows">${esc(t("no.rows"))}</div></div>`;
  const rows = sortItems(list, file).map((it) => {
    if (it._file === "filament" && !showSection) {
      return `<tr data-open="${esc(it.id)}"><td><div class="cell-flex">${swatch(it.color, true)}<div><div class="name">${esc(filamentTitle(it))}</div><div class="id">${esc(it.id)}</div></div></div></td>
        <td>${esc(finishLabel(it.finish))}</td><td class="hide-sm">${esc(it.brand || "")}</td>
        <td class="hide-sm" style="min-width:120px"><div class="bar ${isLow(it) ? "low" : ""}"><i style="width:${Math.min(100, Number(it.qty || 0) / (1000 * Math.max(1, Number(it.spools || 1))) * 100)}%"></i></div></td>
        <td class="num hide-sm">${esc(it.spools ?? "")}</td><td class="hide-sm">${esc(it.location || "")}</td><td>${badges(it)}</td><td class="num">${qtyCell(it)}</td></tr>`;
    }
    return `<tr data-open="${esc(it.id)}"><td><div class="cell-flex">${it._file === "filament" ? swatch(it.color) : ""}<div><div class="name">${esc(it._file === "filament" ? filamentTitle(it) : it.name)}</div><div class="id">${esc(it.id)}</div></div></div></td>
      ${showSection ? `<td>${esc(fileLabel(it._file))}</td>` : ""}
      <td>${esc(catLabel(it.category, it._file))}</td><td class="hide-sm">${tagsHtml(it)}</td><td class="specs hide-sm">${esc(specsText(it))}</td>
      <td class="hide-sm">${esc(it.location || "")}</td><td>${badges(it)}</td><td class="num">${qtyCell(it)}</td></tr>`;
  }).join("");
  const head = file === "filament" && !showSection
    ? `${th("name", t("col.color"))}${th("finish", t("col.finish"))}${th("brand", t("col.brand"), "hide-sm")}<th class="hide-sm">${esc(t("col.grams"))}</th>${th("spools", t("col.spools"), "num hide-sm")}${th("location", t("col.location"), "hide-sm")}<th>${esc(t("col.status"))}</th>${th("qty", t("col.qty"), "num")}`
    : `${th("name", t("col.name"))}${showSection ? th("section", t("col.section")) : ""}${th("category", t("col.category"))}<th class="hide-sm">${esc(t("col.tags"))}</th><th class="hide-sm">${esc(t("col.specs"))}</th>${th("location", t("col.location"), "hide-sm")}<th>${esc(t("col.status"))}</th>${th("qty", t("col.qty"), "num")}`;
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fileView(file) {
  const all = S.items.filter((i) => i._file === file);
  if (!all.length) {
    return `<div class="welcome">${icon(file)}<h2>${esc(t("empty.file", { f: fileLabel(file) }))}</h2><p>${esc(t("empty.text"))}</p>
      ${LIVE ? `<button class="btn primary" data-act="new">${icon("plus")}${esc(t("add"))}</button>` : ""}</div>`;
  }
  const catOf = (i) => file === "filament" ? i.material : (canon(catTable(file), i.category) ?? i.category);
  const catName = (c) => file === "filament" ? c : catLabel(c, file);
  const cats = [...new Set(all.map(catOf).filter(Boolean))].sort((a, b) => catName(a).localeCompare(catName(b)));
  const catKey = file === "filament" ? "material" : "category";
  if (ui.category && !cats.includes(ui.category)) ui.category = "";
  const shown = all.filter((i) => matchQuery(i) && (!ui.attention || needsAttention(i)) && (!ui.category || catOf(i) === ui.category));
  return `<div class="toolbar">
      <button class="chip" data-cat="" aria-pressed="${!ui.category}">${esc(t("all"))}</button>
      ${cats.map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${ui.category === c}">${esc(catName(c))}</button>`).join("")}
      <span class="spacer"></span>
      <label class="switch"><input type="checkbox" id="attn" ${ui.attention ? "checked" : ""}>${esc(t("attention"))}</label>
    </div>${itemTable(shown, file, false)}
    <div class="table-foot" style="border:0;background:transparent">${esc(t("count", { n: shown.length, total: all.length }))}</div>`;
}

function searchView() {
  const shown = S.items.filter(matchQuery);
  return itemTable(shown, null, true) + `<div class="table-foot" style="border:0;background:transparent">${esc(t("count", { n: shown.length, total: S.items.length }))}</div>`;
}

// ---------------------------------------------------------------- projects
function projectsView() {
  if (!S.projects.length) return `<div class="welcome">${icon("projects")}<h2>${esc(t("proj.none"))}</h2><p>${projHint()}</p></div>`;
  const cur = S.projects.find((p) => p.file === route.project) || S.projects[0];
  const list = S.projects.map((p) => {
    const s = projStats(p);
    return `<div class="list-row" data-act="nav:projects/${esc(encodeURIComponent(p.file))}" aria-current="${p === cur}"><div class="grow">
      <div class="title">${esc(p.name)}</div>${progBar(s)}<div class="sub" style="margin-top:4px">${esc(t("proj.ready", { a: s.ok, b: p.rows.length }))}${p.example ? " · " + esc(t("proj.example")) : ""}</div></div></div>`;
  }).join("");
  const why = (w) => t("why." + w);
  const rows = cur.rows.map((r) => {
    const notes = [r.optional && `<span class="badge b-info">${esc(t("proj.optional"))}</span>`, r.unverified && `<span class="badge b-warn">${esc(t("b.unverified"))}</span>`,
      ...r.from.filter((f) => f.in_use).map((f) => `<span class="badge b-info">${esc(t("proj.inuse", { p: f.in_use }))}</span>`), r.note && `<span class="muted">${esc(r.note)}</span>`].filter(Boolean).join(" ");
    const alts = r.alternatives.map((a) => `<div class="alt">↳ ${esc(why(a.why))}: ${esc(t("proj.alt", { name: a.name, qty: fmtNum(a.qty) + " " + unitLabel(a.unit) }))}</div>`).join("");
    return `<tr style="cursor:default"><td><span class="st st-${r.status}">${r.status === "OK" ? "✓" : r.status === "SHORT" ? "◐" : "✕"}</span></td>
      <td><div class="name">${esc(r.need)}</div>${alts}</td><td class="num">${fmtNum(r.qty)} ${esc(unitLabel(r.unit))}</td><td class="num">${fmtNum(r.got)}</td>
      <td class="hide-sm">${r.from.map((f) => `<a href="#" data-open="${esc(f.id)}">${esc(f.id)}</a>`).join(", ") || "–"}</td><td class="hide-sm">${notes}</td></tr>`;
  }).join("");
  const buy = cur.rows.filter((r) => r.status !== "OK");
  const shop = buy.length ? buy.map((r) => `<label><input type="checkbox"> <span>${esc(r.need)}: <b>${fmtNum(r.qty - r.got)} ${esc(unitLabel(r.unit))}</b>${r.optional ? ` <span class="muted">(${esc(t("proj.optional"))})</span>` : ""}${r.buy?.where ? ` <span class="muted">· ${esc(r.buy.where)}</span>` : ""}</span></label>`).join("")
    : `<span class="muted">${esc(t("proj.nothing"))}</span>`;
  return `<div class="proj-layout">
    <section class="panel proj-list"><div class="panel-h"><h2>${esc(t("proj.title"))}</h2></div><div class="panel-b">${list}</div><div class="hint">${projHint()}</div></section>
    <div>
      <section class="panel"><div class="panel-h"><h2>${esc(cur.name)}</h2>${progBar(projStats(cur)).replace('class="prog"', 'class="prog" style="width:140px"')}</div>
        <div style="overflow-x:auto"><table><thead><tr><th></th><th>${esc(t("proj.need"))}</th><th class="num">${esc(t("proj.qty"))}</th><th class="num">${esc(t("proj.have"))}</th><th class="hide-sm">${esc(t("proj.from"))}</th><th class="hide-sm">${esc(t("proj.notes"))}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <section class="panel full"><div class="panel-h"><h2>${esc(t("proj.shop"))}</h2>${buy.length ? `<button class="btn sm" data-act="copy-shop">${icon("copy")}${esc(t("proj.copy"))}</button>` : ""}</div><div class="shop">${shop}</div></section>
    </div></div>`;
}
function shoppingMarkdown(p) {
  return `## ${t("proj.shop")}: ${p.name}\n\n` + p.rows.filter((r) => r.status !== "OK")
    .map((r) => `- [ ] ${r.need}: ${r.qty - r.got} ${unitLabel(r.unit)}${r.optional ? ` (${t("proj.optional")})` : ""}${r.buy?.where ? ` – ${r.buy.where}` : ""}`).join("\n");
}

// ---------------------------------------------------------------- drawer
const MATERIALS = ["PLA", "PLA+", "PETG", "TPU", "ABS", "ASA", "PLA-CF", "PETG-CF", "PC", "Nylon"];
// Datalist options: every vocab label in the current language, plus the user's own values that aren't in the vocab.
const vocabOptions = (table, own) => [...Object.values(table).map((e) => e[lang]), ...own.filter((v) => v && !canon(table, v))];

function openDrawer(mode, item) {
  const base = item ? JSON.parse(JSON.stringify(item)) : { _file: route.page === "file" ? route.file : "electronics", qty: 1 };
  drawer = { mode, originalId: item?.id || null, file: base._file, form: localizeForm(base, base._file), dirty: false, armed: false, idTouched: !!item, error: "" };
  renderDrawer();
  requestAnimationFrame(() => { $("#scrim").classList.add("open"); $("#drawer").classList.add("open"); setTimeout(() => $("#drawer [name=name]")?.focus(), 60); });
}
function closeDrawer(force) {
  if (!drawer) return;
  if (drawer.dirty && !force && !confirm(t("unsaved"))) return;
  drawer = null;
  $("#scrim").classList.remove("open"); $("#drawer").classList.remove("open");
}

function renderDrawer() {
  const d = drawer, f = d.form, ro = !LIVE, fil = d.file === "filament";
  const dis = ro ? "disabled" : "";
  const datalist = (id, opts) => `<datalist id="${id}">${[...new Set(opts)].filter(Boolean).map((o) => `<option value="${esc(o)}">`).join("")}</datalist>`;
  const sameFile = S.items.filter((i) => i._file === d.file);
  const field = (name, label, attrs = "", hint = "", req = false) =>
    `<label class="field"><span>${esc(label)}${req ? " <em>*</em>" : ""}</span><input name="${name}" value="${esc(f[name] ?? "")}" ${attrs} ${dis}>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  const title = ro ? t("d.view") : d.mode === "new" ? t("d.new") : t("d.edit");
  const specs = Object.entries(f.specs || {});
  if (!ro) specs.push(["", ""]);

  $("#drawer").innerHTML = `
    <div class="drawer-h">${fil ? swatch(f.color, true) : icon(d.file)}<h2>${esc(d.mode === "new" ? title : (fil ? filamentTitle(f) : f.name) || title)}</h2>
      <button class="icon-btn" data-act="close" aria-label="${esc(t("d.close"))}">${icon("x")}</button></div>
    <form class="drawer-b" id="itemForm" autocomplete="off" novalidate>
      ${d.error ? `<div class="form-err">${esc(d.error)}</div>` : ""}
      <div class="section-t">${esc(t("f.basics"))}</div>
      <label class="field"><span>${esc(t("f.section"))}</span><select name="_file" ${dis}>${FILES.map((x) => `<option value="${x}" ${x === d.file ? "selected" : ""}>${esc(fileLabel(x))}</option>`).join("")}</select></label>
      ${fil ? `<div class="row2">${field("material", t("f.material"), 'list="dl-mat"', "", true)}
          <label class="field"><span>${esc(t("f.color"))} <em>*</em></span><div class="color-in">${swatch(f.color)}<input name="color" list="dl-color" value="${esc(f.color ?? "")}" ${dis}></div></label></div>
        <div class="row2">${field("finish", t("f.finish"), 'list="dl-finish"')}${field("brand", t("f.brand"), 'list="dl-brand"')}</div>
        ${datalist("dl-mat", [...MATERIALS, ...sameFile.map((i) => i.material)])}${datalist("dl-color", vocabOptions(VOCAB.colors, sameFile.map((i) => i.color)))}
        ${datalist("dl-finish", vocabOptions(VOCAB.finishes, sameFile.map((i) => i.finish)))}${datalist("dl-brand", sameFile.map((i) => i.brand))}` : ""}
      ${fil ? field("name", t("f.name"), `placeholder="${esc(filamentTitle({ ...f, name: "" }) || "")}"`, t("f.name.auto")) : field("name", t("f.name"), "", "", true)}
      <div class="row2">${field("id", t("f.id"), 'class="mono" spellcheck="false"', t("f.id.hint"), true)}
        ${fil ? "" : field("category", t("f.category"), 'list="dl-cat"')}</div>
      ${fil ? "" : datalist("dl-cat", vocabOptions(catTable(d.file), sameFile.map((i) => i.category)))}
      <div class="section-t">${esc(t("f.stock"))}</div>
      <div class="row3">${field("qty", fil ? t("f.grams") : t("f.qty"), 'type="number" min="0" step="any" inputmode="decimal"', "", true)}
        ${fil ? field("spools", t("f.spools"), 'type="number" min="0" step="1"') : field("unit", t("f.unit"), `list="dl-unit" placeholder="${esc(unitLabel("pcs"))}"`)}
        ${field("min_qty", t("f.min"), 'type="number" min="0" step="any"')}</div>
      ${datalist("dl-unit", vocabOptions(VOCAB.units, []))}
      <div class="row2">${field("location", t("f.location"), 'list="dl-loc"')}${field("in_use", t("f.inuse"), "", t("f.inuse.hint"))}</div>
      ${datalist("dl-loc", S.items.map((i) => i.location))}
      <label class="check"><input type="checkbox" name="verified" ${f.verified === false ? "" : "checked"} ${dis}><span>${esc(t("f.verified"))}</span></label>
      <div class="section-t">${esc(t("f.details"))}</div>
      <div class="field"><span>${esc(t("f.tags"))}</span><div class="tags-input" id="tagsBox">${(f.tags || []).map((x, i) =>
        `<span class="t">${esc(x)}${ro ? "" : `<button type="button" data-rmtag="${i}" aria-label="${esc(t("a.remove"))}">×</button>`}</span>`).join("")}${ro ? "" : '<input id="tagIn" spellcheck="false">'}</div>
        ${ro ? "" : `<small>${esc(t("f.tags.hint"))}</small>`}</div>
      <div class="field"><span>${esc(t("f.specs"))}</span><div class="kv">${specs.map(([k, v], i) =>
        `<div class="r"><input data-spec-k="${i}" placeholder="${esc(t("f.spec.key"))}" list="dl-spec" value="${esc(k)}" ${dis}><input data-spec-v="${i}" placeholder="${esc(t("f.spec.val"))}" value="${esc(v)}" ${dis}>
        ${ro || (!k && !v) ? "<span></span>" : `<button type="button" class="icon-btn" data-rmspec="${i}" aria-label="${esc(t("a.remove"))}">${icon("x")}</button>`}</div>`).join("")}</div></div>
      ${datalist("dl-spec", vocabOptions(VOCAB.specKeys, []))}
      <label class="field"><span>${esc(t("f.notes"))}</span><textarea name="notes" ${dis}>${esc(f.notes ?? "")}</textarea></label>
      ${field("source", t("f.source"))}
    </form>
    <div class="drawer-f">
      ${!ro && d.mode === "edit" ? `<button class="btn danger ${d.armed ? "armed" : ""}" data-act="delete">${esc(d.armed ? t("d.confirm") : t("d.delete"))}</button>` : ""}
      <span class="spacer"></span>
      <button class="btn" data-act="close">${esc(ro ? t("d.close") : t("d.cancel"))}</button>
      ${ro ? "" : `<button class="btn primary" data-act="save" ${saving ? "disabled" : ""}>${esc(t("d.save"))}</button>`}
    </div>`;
}

function readSpecs() {
  const specs = {};
  document.querySelectorAll("[data-spec-k]").forEach((k) => {
    const v = document.querySelector(`[data-spec-v="${k.dataset.specK}"]`);
    if (k.value.trim()) specs[k.value.trim()] = v.value.trim();
  });
  return specs;
}
function syncForm() {
  const form = $("#itemForm"); if (!form || !drawer) return;
  const f = drawer.form;
  for (const el of form.elements) {
    if (!el.name || el.name === "_file") continue;
    if (el.name === "verified") f.verified = el.checked ? undefined : false;
    else f[el.name] = el.value;
  }
  f.specs = readSpecs();
}
function autoId() {
  const f = drawer.form;
  if (drawer.idTouched) return;
  // ids use the canonical (English) words so they don't depend on the UI language
  const base = drawer.file === "filament"
    ? [f.material, canon(VOCAB.colors, f.color) ?? f.color, canon(VOCAB.finishes, f.finish) ?? f.finish, f.brand].filter(Boolean).join(" ")
    : f.name;
  f.id = slug(base);
  const el = $("#itemForm [name=id]"); if (el) el.value = f.id;
}

async function api(method, path, body) {
  const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || res.statusText); e.status = res.status; throw e; }
  return data;
}
function expectFor(...files) { const e = {}; for (const f of files) if (f && S.versions[f]) e[f] = S.versions[f]; return e; }

async function saveDrawer() {
  if (!drawer || saving) return;
  syncForm();
  const d = drawer, f = { ...d.form };
  if (d.file === "filament" && !f.name) f.name = filamentTitle(f);
  if (!f.id) f.id = slug(d.file === "filament" ? [f.material, f.color, f.finish].join(" ") : f.name);
  delete f._file;
  const prevFile = d.originalId ? S.items.find((i) => i.id === d.originalId)?._file : null;
  saving = true; renderDrawerKeepScroll();
  try {
    const r = d.mode === "new"
      ? await api("POST", "/api/items", { file: d.file, item: f, expect: expectFor(d.file) })
      : await api("PUT", "/api/items/" + encodeURIComponent(d.originalId), { file: d.file, item: f, expect: expectFor(d.file, prevFile) });
    S = normalize(r.state);
    toast(d.mode === "new" ? t("t.added", { n: r.item.name }) : t("t.saved"));
    saving = false; closeDrawer(true); renderShell();
  } catch (e) {
    saving = false;
    if (e.status === 409) { toast(t("t.conflict"), true); await loadState(true); drawer && (drawer.error = t("t.conflict")); }
    else if (drawer) drawer.error = t("t.error", { e: e.message });
    renderDrawerKeepScroll();
  }
}
async function deleteCurrent() {
  const d = drawer;
  if (!d.armed) { d.armed = true; syncForm(); renderDrawerKeepScroll(); return; }
  const prev = S.items.find((i) => i.id === d.originalId);
  try {
    const r = await api("DELETE", "/api/items/" + encodeURIComponent(d.originalId), { expect: expectFor(prev?._file) });
    S = normalize(r.state); toast(t("t.deleted", { n: prev?.name || d.originalId })); closeDrawer(true); renderShell();
  } catch (e) {
    if (e.status === 409) { toast(t("t.conflict"), true); await loadState(true); }
    else toast(t("t.error", { e: e.message }), true);
  }
}
async function step(id, dir) {
  const it = S.items.find((i) => i.id === id); if (!it) return;
  const inc = unitOf(it) === "g" ? 50 : 1;
  const item = { ...it, qty: Math.max(0, Number(it.qty || 0) + dir * inc) };
  delete item._file;
  it.qty = item.qty; renderContent(); // optimistic
  try { const r = await api("PUT", "/api/items/" + encodeURIComponent(id), { file: it._file, item, expect: expectFor(it._file) }); S = normalize(r.state); renderShell(); }
  catch (e) { if (e.status === 409) toast(t("t.conflict"), true); else toast(t("t.error", { e: e.message }), true); await loadState(true); }
}
function renderDrawerKeepScroll() { const b = $("#drawer .drawer-b"); const top = b ? b.scrollTop : 0; renderDrawer(); const nb = $("#drawer .drawer-b"); if (nb) nb.scrollTop = top; }

// ---------------------------------------------------------------- live sync
async function loadState(quiet) {
  if (!LIVE) return;
  try { S = normalize(await api("GET", "/api/state")); renderShell(); if (!quiet) toast(t("t.reloaded")); }
  catch { toast(t("t.offline"), true); }
}
let offline = false;
async function poll() {
  if (!LIVE || document.hidden || saving) return;
  try {
    const { version } = await api("GET", "/api/version");
    offline = false;
    if (version !== S.version) {
      const focusId = document.activeElement?.id;
      await loadState(!!drawer);
      if (focusId === "q") { const q = $("#q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  } catch { if (!offline) { offline = true; toast(t("t.offline"), true); } }
}

// ---------------------------------------------------------------- toasts
function toast(msg, err) {
  const el = document.createElement("div");
  el.className = "toast" + (err ? " err" : ""); el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), err ? 6000 : 2600);
}

// ---------------------------------------------------------------- events
document.addEventListener("click", (e) => {
  const tEl = e.target;
  const stepBtn = tEl.closest("[data-step]");
  if (stepBtn) { e.stopPropagation(); step(stepBtn.dataset.id, Number(stepBtn.dataset.step)); return; }
  if (tEl.closest("[data-stop]")) return;
  const langBtn = tEl.closest("[data-lang]");
  if (langBtn) { lang = langBtn.dataset.lang; store.set("lang", lang); document.documentElement.lang = lang; renderShell(); if (drawer) { syncForm(); localizeForm(drawer.form, drawer.file); renderDrawerKeepScroll(); } return; }
  const themeBtn = tEl.closest("[data-theme-set]");
  if (themeBtn) { theme = themeBtn.dataset.themeSet; store.set("theme", theme); applyTheme(); renderShell(); return; }
  const sortTh = tEl.closest("[data-sort]");
  if (sortTh) { const k = sortTh.dataset.sort; ui.sort = { key: k, dir: ui.sort.key === k ? -ui.sort.dir : 1 }; renderContent(); return; }
  const cat = tEl.closest("[data-cat]");
  if (cat) { ui.category = cat.dataset.cat; renderContent(); return; }
  const rmTag = tEl.closest("[data-rmtag]");
  if (rmTag) { syncForm(); drawer.form.tags.splice(Number(rmTag.dataset.rmtag), 1); drawer.dirty = true; renderDrawerKeepScroll(); return; }
  const rmSpec = tEl.closest("[data-rmspec]");
  if (rmSpec) { syncForm(); const k = $(`[data-spec-k="${rmSpec.dataset.rmspec}"]`).value.trim(); delete drawer.form.specs[k]; drawer.dirty = true; renderDrawerKeepScroll(); return; }
  if (tEl.closest("#tagsBox")) { $("#tagIn")?.focus(); }
  const open = tEl.closest("[data-open]");
  if (open && !tEl.closest(".drawer")) { e.preventDefault(); const it = S.items.find((i) => i.id === open.dataset.open); if (it) openDrawer(LIVE ? "edit" : "view", it); return; }
  if (tEl.id === "scrim") { closeDrawer(); return; }
  const act = tEl.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "new") openDrawer("new");
  else if (act === "close") closeDrawer();
  else if (act === "save") saveDrawer();
  else if (act === "delete") deleteCurrent();
  else if (act === "attn") { query = ""; go("#/" + (S.items.find(needsAttention)?._file || "electronics")); ui.attention = true; renderContent(); }
  else if (act === "copy-shop") {
    const p = S.projects.find((x) => x.file === route.project) || S.projects[0];
    navigator.clipboard?.writeText(shoppingMarkdown(p)).then(() => toast(t("proj.copied")), () => toast(shoppingMarkdown(p)));
  } else if (act.startsWith("nav:")) { query = ""; go("#/" + act.slice(4)); }
});
// Navigate; hashchange doesn't fire for the current hash, so render directly then.
function go(hash) {
  if (location.hash === hash || (hash === "#/" && !location.hash)) { route = parseRoute(); renderShell(); }
  else { location.hash = hash; route = parseRoute(); ui.category = ""; ui.attention = false; renderShell(); }
}

document.addEventListener("input", (e) => {
  if (e.target.id === "q") { query = e.target.value; if (route.page === "dashboard" || route.page === "file") { renderContent(); $("#app h1").textContent = route.page === "dashboard" ? (query ? t("results") : t("nav.dashboard")) : fileLabel(route.file); } return; }
  if (!drawer || !e.target.closest("#itemForm")) return;
  drawer.dirty = true; drawer.armed = false;
  const n = e.target.name;
  if (n === "id") drawer.idTouched = true;
  if (["name", "material", "color", "finish", "brand"].includes(n)) { drawer.form[n] = e.target.value; autoId(); }
  if (n === "color") {
    e.target.parentElement.querySelector(".sw").outerHTML = swatch(e.target.value);
    $("#drawer .drawer-h .sw")?.replaceWith(Object.assign(document.createElement("template"), { innerHTML: swatch(e.target.value, true) }).content);
  }
  if (drawer.file === "filament" && ["material", "color"].includes(n)) {
    const nameEl = $("#itemForm [name=name]"); if (nameEl) nameEl.placeholder = filamentTitle({ ...drawer.form, name: "" });
  }
  if (e.target.dataset.specK !== undefined || e.target.dataset.specV !== undefined) {
    const rows = document.querySelectorAll(".kv .r"); const last = rows[rows.length - 1];
    if (last && [...last.querySelectorAll("input")].some((i) => i.value)) { syncForm(); renderDrawerKeepScroll(); const sel = `[data-spec-${e.target.dataset.specK !== undefined ? "k" : "v"}="${e.target.dataset.specK ?? e.target.dataset.specV}"]`; const el = $(sel); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "attn") { ui.attention = e.target.checked; renderContent(); return; }
  if (drawer && e.target.name === "_file") { syncForm(); drawer.file = e.target.value; drawer.form._file = drawer.file; drawer.dirty = true; autoId(); renderDrawerKeepScroll(); return; }
  if (drawer && e.target.closest("#itemForm")) drawer.dirty = true;
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "tagIn" && (e.key === "Enter" || e.key === ",")) {
    e.preventDefault(); const v = e.target.value.trim().replace(/,$/, "");
    if (v) { syncForm(); drawer.form.tags = [...(drawer.form.tags || []), ...v.split(/\s*,\s*/).filter(Boolean)]; drawer.dirty = true; renderDrawerKeepScroll(); $("#tagIn")?.focus(); }
    return;
  }
  if (e.target.id === "tagIn" && e.key === "Backspace" && !e.target.value && drawer.form.tags?.length) { syncForm(); drawer.form.tags.pop(); renderDrawerKeepScroll(); $("#tagIn")?.focus(); return; }
  if (drawer && e.key === "Escape") { closeDrawer(); return; }
  if (drawer && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDrawer(); return; }
  if (drawer && e.key === "Enter" && e.target.tagName === "INPUT" && e.target.closest("#itemForm")) { e.preventDefault(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (!typing && e.key === "/") { e.preventDefault(); $("#q")?.focus(); }
  if (!typing && LIVE && e.key.toLowerCase() === "n" && !drawer && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openDrawer("new"); }
  if (e.target.id === "q" && e.key === "Escape") { query = ""; e.target.value = ""; renderContent(); }
});
window.addEventListener("hashchange", () => { route = parseRoute(); ui.category = ""; if (route.page !== "file") ui.attention = false; renderShell(); });
window.addEventListener("beforeunload", (e) => { if (drawer?.dirty) { e.preventDefault(); e.returnValue = ""; } });

// ---------------------------------------------------------------- boot
document.documentElement.lang = lang;
document.body.insertAdjacentHTML("beforeend", '<div id="scrim" class="scrim"></div><aside id="drawer" class="drawer"></aside><div id="toasts" class="toasts" aria-live="polite"></div>');
renderShell();
if (LIVE) { loadState(true); setInterval(poll, 3000); document.addEventListener("visibilitychange", poll); }
})();
