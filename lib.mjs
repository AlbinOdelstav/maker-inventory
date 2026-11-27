// Shared logic for the CLI (inv.mjs) and the web app server (server.mjs).
import { readFileSync, readdirSync, existsSync, writeFileSync, renameSync, mkdirSync, copyFileSync, unlinkSync, rmdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import YAML from "yaml";
import { VOCAB, canon, allCategories } from "./vocab.mjs";

export const ROOT = dirname(fileURLToPath(import.meta.url));
// Your data lives here. Default: next to the tool (git-ignored). Override with MAKER_INVENTORY_DIR.
export const DATA = resolve(process.env.MAKER_INVENTORY_DIR ?? ROOT);
export const INV_DIR = join(DATA, "inventory");
export const PROJ_DIR = join(DATA, "projects");
export const FILES = ["filament", "electronics", "hardware", "consumables", "tools"];

export const norm = (v) => String(v ?? "").trim().toLowerCase();
export const unitOf = (it) => it.unit ?? (it._file === "filament" ? "g" : "pcs");
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

export function inventoryExists() { return existsSync(INV_DIR); }

const invFiles = () => readdirSync(INV_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();

// Returns items (each tagged with _file) and a version hash per file.
export function loadInventoryWithVersions() {
  const items = [];
  const versions = {};
  for (const f of invFiles()) {
    const text = readFileSync(join(INV_DIR, f), "utf8");
    const name = basename(f).replace(/\.ya?ml$/, "");
    versions[name] = hash(text);
    const data = YAML.parse(text) ?? [];
    if (!Array.isArray(data)) throw new Error(`${f}: top level must be a list`);
    for (const it of data) items.push({ ...it, _file: name });
  }
  return { items, versions };
}
export const loadInventory = () => loadInventoryWithVersions().items;

export function loadProjects(inv) {
  if (!existsSync(PROJ_DIR)) return [];
  return readdirSync(PROJ_DIR).filter((f) => /\.ya?ml$/.test(f)).sort().map((f) => {
    const text = readFileSync(join(PROJ_DIR, f), "utf8");
    const proj = YAML.parse(text) ?? {};
    return { file: f, name: proj.name ?? f, notes: proj.notes, needs: proj.needs ?? [], version: hash(text),
      status: proj.status, todos: proj.todos ?? [], links: proj.links ?? [], images: proj.images ?? [],
      example: f.startsWith("_"), rows: computeCheck(inv, proj) };
  }).sort((a, b) => a.example - b.example);
}

// ---------- matching ----------
// Keys: category, material, color, finish, brand, file -> equal (case-insensitive)
//       tags -> item has all of them; text -> substring of name/id; specs -> each spec equal
export function matches(it, m) {
  for (const [k, want] of Object.entries(m)) {
    if (k === "tags") {
      const have = (it.tags ?? []).map(norm);
      if (![].concat(want).every((t) => have.includes(norm(t)))) return false;
    } else if (k === "text") {
      if (!norm(`${it.name} ${it.id}`).includes(norm(want))) return false;
    } else if (k === "specs") {
      for (const [sk, sv] of Object.entries(want)) if (norm(it.specs?.[sk]) !== norm(sv)) return false;
    } else if (k === "file") {
      if (it._file !== norm(want)) return false;
    } else if (VOCAB_FIELD[k]) {
      // color/finish/category/unit: "grön" matches "green", "skruv" matches "screw"
      const c = (v) => canon(VOCAB_FIELD[k](), v) ?? norm(v);
      if (c(it[k]) !== c(want)) return false;
    } else if (norm(it[k]) !== norm(want)) return false;
  }
  return true;
}

const VOCAB_FIELD = { color: () => VOCAB.colors, finish: () => VOCAB.finishes, category: allCategories, unit: () => VOCAB.units };

function relaxations(m) {
  const out = [];
  if (m.color) { const { color, finish, ...r } = m; out.push(["other color", r]); }
  if (m.specs) { const { specs, ...r } = m; out.push(["other specs", r]); }
  if (m.tags && m.category) out.push(["same category", { category: m.category }]);
  if (m.material && !m.color) { const { finish, brand, ...r } = m; if (finish || brand) out.push(["other finish/brand", r]); }
  return out;
}

const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };

// Near matches the user already owns, closest first. With specs, items that share more of the wanted
// specs rank higher, earlier keys weigh more (thread before length), then numerically closer values
// (15 mm for 16 mm). Items that miss the first wanted spec are dropped when some item has it. Each alternative lists how its specs differ.
function findAlternatives(inv, m, cands) {
  const seen = new Set(cands.map((c) => c.id));
  const wanted = Object.entries(m.specs ?? {});
  const all = [];
  relaxations(m).forEach(([why, r], tier) => {
    for (const it of inv.filter((i) => matches(i, r) && !seen.has(i.id))) {
      seen.add(it.id);
      let same = 0, dist = 0, lead = wanted.length === 0;
      const diff = [];
      for (const [k, want] of wanted) {
        const have = it.specs?.[k];
        if (norm(have) === norm(want)) { same += 2 ** (wanted.length - 1 - wanted.findIndex(([x]) => x === k)); if (k === wanted[0][0]) lead = true; continue; }
        diff.push({ key: k, want: String(want), have: have == null ? null : String(have) });
        const a = num(have), b = num(want);
        dist += a != null && b != null ? Math.abs(a - b) / Math.max(Math.abs(b), 1) : 1;
      }
      all.push({ why, tier, same, dist, lead, alt: { why, id: it.id, name: it.name, qty: it.qty, unit: unitOf(it), diff } });
    }
  });
  const anyLead = all.some((a) => a.why === "other specs" && a.lead);
  const kept = all.filter((a) => a.why !== "other specs" || a.lead || !anyLead)
    .sort((a, b) => a.tier - b.tier || b.same - a.same || a.dist - b.dist);
  return kept.map((a) => a.alt);
}

const describe = (need) =>
  need.name ?? need.id ?? Object.entries(need.match ?? {}).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");

export function computeCheck(inv, proj) {
  const used = new Map(); // id -> qty already allocated to earlier needs
  const rows = [];
  for (const need of proj.needs ?? []) {
    const qty = Number(need.qty ?? 1);
    let cands;
    if (need.id) cands = inv.filter((it) => it.id === need.id);
    else if (need.match) cands = inv.filter((it) => matches(it, need.match));
    else cands = [];

    let got = 0;
    const from = [];
    for (const it of cands) {
      const free = Number(it.qty ?? 0) - (used.get(it.id) ?? 0);
      if (free <= 0 || got >= qty) continue;
      const take = Math.min(free, qty - got);
      used.set(it.id, (used.get(it.id) ?? 0) + take);
      got += take;
      from.push({ id: it.id, name: it.name, take, verified: it.verified !== false, location: it.location, in_use: it.in_use });
    }
    const status = got >= qty ? "OK" : got > 0 ? "SHORT" : "MISSING";
    const unit = need.unit ?? (cands[0] ? unitOf(cands[0]) : need.match?.material ? "g" : "pcs");
    const alternatives = status !== "OK" && need.match ? findAlternatives(inv, need.match, cands) : [];
    rows.push({ need: describe(need), qty, unit, got, status, from, alternatives,
      unverified: from.some((f) => !f.verified), optional: !!need.optional, buy: need.buy, note: need.note,
      purpose: need.purpose, match: need.match, id: need.id });
  }
  return rows;
}

// ---------- validation ----------
export function itemErrors(it, file) {
  const errs = [];
  if (!it.id) errs.push("missing id");
  else if (!/^[a-z0-9][a-z0-9.-]*$/.test(it.id)) errs.push("id must be kebab-case (a-z, 0-9, -, .)");
  if (!it.name) errs.push("missing name");
  if (it.qty === undefined || it.qty === "" || isNaN(Number(it.qty)) || Number(it.qty) < 0) errs.push("qty must be a number >= 0");
  if (it.min_qty !== undefined && (isNaN(Number(it.min_qty)) || Number(it.min_qty) < 0)) errs.push("min_qty must be a number >= 0");
  if (file === "filament" && (!it.material || !it.color)) errs.push("filament needs material and color");
  if (it.cad_component !== undefined && !/^[a-z0-9][a-z0-9._-]*$/.test(String(it.cad_component))) errs.push("cad_component must be a library id (kebab-case)");
  return errs;
}

// ---------- CAD component library (read-only) ----------
// One YAML per bought-part type with dimensions and where each came from. Kept outside the inventory
// so dimensions have one source of truth; items only link to it with `cad_component: <id>`.
const CAD_SUB = ["skills", "cad-validation", "cadkit", "library", "components"];
const expandHome = (p) => (p === "~" ? homedir() : /^~[\\/]/.test(p) ? join(homedir(), p.slice(2)) : p);

// `cad_library: <path>` in ~/.cadkit/config.yaml (flat key: value).
function cadConfigLibrary() {
  try {
    const text = readFileSync(join(homedir(), ".cadkit", "config.yaml"), "utf8");
    const m = text.match(/^cad_library:[ \t]*(.+?)[ \t]*$/m);
    if (!m) return null;
    const v = m[1].replace(/\s+#.*$/, "").replace(/^(["'])(.*)\1$/, "$2");
    return v ? resolve(expandHome(v)) : null;
  } catch { return null; }
}

// Newest installed cadkit plugin version in the Claude Code plugin cache.
function cadPluginLibrary() {
  const base = join(homedir(), ".claude", "plugins", "cache", "cadkit", "cadkit");
  try {
    const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true });
    const versions = readdirSync(base).sort(cmp).reverse();
    for (const v of versions) {
      const dir = join(base, v, ...CAD_SUB);
      if (existsSync(dir)) return dir;
    }
  } catch { /* no plugin cache */ }
  return null;
}

// Lookup order: MAKER_CAD_LIBRARY, cad_library in ~/.cadkit/config.yaml,
// newest installed plugin version, then the pre-plugin skills path.
export const CAD_LIB = resolve(
  process.env.MAKER_CAD_LIBRARY ? expandHome(process.env.MAKER_CAD_LIBRARY)
    : cadConfigLibrary() ?? cadPluginLibrary() ?? join(homedir(), ".claude", ...CAD_SUB));
const cadFiles = () => (existsSync(CAD_LIB) ? readdirSync(CAD_LIB).filter((f) => /\.ya?ml$/i.test(f)).sort() : []);

// Only http(s) links are ever shown as links.
const httpUrl = (u) => (typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim()) ? u.trim() : null);
// A source is a string ("Arduino board file, https://…, read 2026-11-23") or { title, url, read }.
function cadSource(key, v) {
  if (v && typeof v === "object") {
    return { key, title: String(v.title ?? v.name ?? v.text ?? key), url: httpUrl(v.url ?? v.link), read: v.read ?? v.accessed ?? v.date ?? null };
  }
  const s = String(v ?? "");
  const url = httpUrl((s.match(/https?:\/\/[^\s,;)]+/i) ?? [])[0]);
  return { key, title: s || key, url, read: null };
}

export function loadCadLibrary() {
  const components = {};
  for (const f of cadFiles()) {
    const id = f.replace(/\.ya?ml$/i, "");
    try {
      const doc = YAML.parse(readFileSync(join(CAD_LIB, f), "utf8")) ?? {};
      const num = (v) => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? v ?? null : Number(v));
      // label/group texts may be a string or { en, sv }; the app picks the user's language.
      const text = (v) => (v && typeof v === "object" ? v : v == null || v === "" ? null : String(v));
      components[id] = {
        id, file: f, name: text(doc.name) ?? id, notes: text(doc.notes), frame: text(doc.frame), unit: doc.unit ?? "mm",
        inventory_ids: [].concat(doc.inventory_ids ?? []).map(String),
        sources: Object.fromEntries(Object.entries(doc.sources ?? {}).map(([k, v]) => [k, cadSource(k, v)])),
        confirm: [].concat(doc.confirm ?? []).map(String),
        groups: Object.fromEntries(Object.entries(doc.groups ?? {}).map(([k, v]) => [k, text(v)])),
        dims: Object.entries(doc.dims ?? {}).map(([name, d]) => (d && typeof d === "object"
          ? { name, v: num(d.v), src: d.src ?? null, unc: num(d.unc), ref: d.ref ?? null, url: httpUrl(d.url), note: d.note ?? null, label: text(d.label), group: d.group ?? null }
          : { name, v: num(d), src: null, unc: null, ref: null, url: null, note: null, label: null, group: null })),
      };
    } catch (e) {
      components[id] = { id, file: f, name: id, error: String(e.message ?? e).split("\n")[0], inventory_ids: [], dims: [], sources: {}, confirm: [] };
    }
  }
  return { dir: CAD_LIB, exists: existsSync(CAD_LIB), components };
}
export const cadLibraryVersion = () => hash(cadFiles().map((f) => f + readFileSync(join(CAD_LIB, f), "utf8")).join("\n"));

// Kinds of stock that usually have a shape worth describing (screws and wire don't need a file each).
export const CAD_FILES = ["electronics", "hardware"];

// Warnings, not errors: broken links, and library files that name an item that doesn't link back.
export function cadWarnings(inv, lib = loadCadLibrary()) {
  const out = [];
  for (const it of inv) if (it.cad_component && !lib.components[it.cad_component])
    out.push(`${it._file}.yaml:${it.id}: cad_component "${it.cad_component}" has no file in ${lib.dir}`);
  for (const c of Object.values(lib.components)) {
    if (c.error) { out.push(`${c.file}: could not be read (${c.error})`); continue; }
    for (const id of c.inventory_ids) {
      const it = inv.find((i) => i.id === id);
      if (it && it.cad_component !== c.id) out.push(`${it._file}.yaml:${id}: listed in ${c.file} but has ${it.cad_component ? `cad_component "${it.cad_component}"` : "no cad_component"}`);
    }
  }
  return out;
}

export function validateAll(inv) {
  const errs = [];
  const ids = new Map();
  for (const it of inv) {
    const where = `${it._file}.yaml:${it.id ?? it.name ?? "?"}`;
    for (const e of itemErrors(it, it._file)) errs.push(`${where}: ${e}`);
    if (it.id && ids.has(it.id)) errs.push(`${where}: duplicate id (also in ${ids.get(it.id)})`);
    ids.set(it.id, it._file);
  }
  return errs;
}

// ---------- writing ----------
const FIELD_ORDER = ["id", "name", "category", "material", "color", "finish", "brand", "qty", "unit", "spools",
  "min_qty", "tags", "specs", "cad_component", "location", "in_use", "verified", "source", "notes"];

// Clean an item coming from the UI: drop empty values and internal fields, coerce numbers, stable key order.
export function cleanItem(raw, file) {
  raw = canonicalize(raw, file);
  const it = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_") || v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) { const a = v.map((x) => String(x).trim()).filter(Boolean); if (a.length) it[k] = a; continue; }
    if (typeof v === "object") {
      const o = Object.fromEntries(Object.entries(v).filter(([sk, sv]) => sk.trim() && sv !== "" && sv != null).map(([sk, sv]) => [sk.trim(), sv]));
      if (Object.keys(o).length) it[k] = o;
      continue;
    }
    it[k] = typeof v === "string" ? v.trim() : v;
  }
  for (const k of ["qty", "min_qty", "spools"]) if (it[k] !== undefined && !isNaN(Number(it[k]))) it[k] = Number(it[k]);
  if (it.verified === true) delete it.verified; // verified is the default
  if (it.unit === (file === "filament" ? "g" : "pcs")) delete it.unit; // default unit
  const ordered = {};
  for (const k of FIELD_ORDER) if (k in it) ordered[k] = it[k];
  for (const k of Object.keys(it)) if (!(k in ordered)) ordered[k] = it[k];
  return ordered;
}

// Store known vocabulary in canonical form (key), whatever language it was typed in.
// Unknown values (a custom color, a new category) are kept as typed.
export function canonicalize(raw, file) {
  const it = { ...raw };
  const cats = VOCAB.categories[file] ?? allCategories();
  const fix = (k, table) => { if (it[k]) it[k] = canon(table, it[k]) ?? it[k]; };
  fix("color", VOCAB.colors); fix("finish", VOCAB.finishes); fix("category", cats); fix("unit", VOCAB.units);
  if (it.specs && typeof it.specs === "object") {
    it.specs = Object.fromEntries(Object.entries(it.specs).map(([k, v]) => [canon(VOCAB.specKeys, k) ?? k, v]));
  }
  return it;
}

function readFile(file) {
  const p = join(INV_DIR, `${file}.yaml`);
  const text = existsSync(p) ? readFileSync(p, "utf8") : "";
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (/^\s*#/.test(lines[i]) || lines[i].trim() === "")) i++;
  const header = lines.slice(0, i).join("\n").replace(/\s+$/, "");
  const items = YAML.parse(text) ?? [];
  return { p, text, header, items, version: hash(text) };
}

function writeFile(p, header, items) {
  const doc = new YAML.Document(items);
  YAML.visit(doc, {
    Pair(_, pair) { if (["tags", "specs"].includes(pair.key?.value) && pair.value) pair.value.flow = true; },
  });
  if (YAML.isSeq(doc.contents)) doc.contents.items.forEach((n, i) => { if (i) n.spaceBefore = true; });
  const body = items.length ? doc.toString({ lineWidth: 0 }) : "[]\n";
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, (header ? `${header}\n\n` : "") + body);
  renameSync(tmp, p);
}

export class ConflictError extends Error {}
export class InputError extends Error {}

// Add, update (and move between files) or delete an item. `expect` = { file: version } the client saw.
export function saveItem({ originalId, file, item, expect = {} }) {
  if (!FILES.includes(file) && !existsSync(join(INV_DIR, `${file}.yaml`))) throw new InputError(`unknown file ${file}`);
  const clean = cleanItem(item, file);
  const errs = itemErrors(clean, file);
  if (errs.length) throw new InputError(errs.join("; "));

  const { items: all } = loadInventoryWithVersions();
  const prev = originalId ? all.find((i) => i.id === originalId) : null;
  if (originalId && !prev) throw new ConflictError(`item ${originalId} no longer exists`);
  if (all.some((i) => i.id === clean.id && i.id !== originalId)) throw new InputError(`id "${clean.id}" is already used`);

  const target = readFile(file);
  const touched = prev && prev._file !== file ? [prev._file, file] : [file];
  for (const f of touched) {
    const cur = f === file ? target : readFile(f);
    if (expect[f] && expect[f] !== cur.version) throw new ConflictError(`${f}.yaml was changed elsewhere`);
  }

  if (prev && prev._file !== file) {
    const src = readFile(prev._file);
    writeFile(src.p, src.header, src.items.filter((i) => i.id !== originalId));
    target.items.push(clean);
  } else if (prev) {
    const idx = target.items.findIndex((i) => i.id === originalId);
    target.items[idx] = clean;
  } else {
    target.items.push(clean);
  }
  writeFile(target.p, target.header, target.items);
  return clean;
}

export function deleteItem({ id, expect = {} }) {
  const { items: all } = loadInventoryWithVersions();
  const prev = all.find((i) => i.id === id);
  if (!prev) throw new ConflictError(`item ${id} no longer exists`);
  const src = readFile(prev._file);
  if (expect[prev._file] && expect[prev._file] !== src.version) throw new ConflictError(`${prev._file}.yaml was changed elsewhere`);
  writeFile(src.p, src.header, src.items.filter((i) => i.id !== id));
}

// ---------- projects ----------
const PROJECT_HEADER = "# Project: needs and planning. Edited in the maker-inventory app or by hand; format: README.md \"Project file\".";
const NEED_ORDER = ["name", "purpose", "id", "match", "qty", "unit", "optional", "note", "buy"];
const MATCH_ORDER = ["file", "category", "material", "color", "finish", "brand", "tags", "specs", "text"];
const orderKeys = (o, order) => { const r = {}; for (const k of order) if (k in o) r[k] = o[k]; for (const k of Object.keys(o)) if (!(k in r)) r[k] = o[k]; return r; };
const projPath = (file) => {
  if (!/^[a-z0-9_][a-z0-9_.-]*\.ya?ml$/i.test(file ?? "")) throw new InputError(`bad project file name: ${file}`);
  return join(PROJ_DIR, file);
};
export const projectFileName = (name) => `${(norm(name).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project").slice(0, 60)}.yaml`;

// Clean a need from the UI: drop empties, canonical vocab values in `match`, numbers as numbers.
function cleanNeed(raw) {
  const n = {};
  const str = (v) => (typeof v === "string" ? v.trim() : v);
  for (const k of ["name", "purpose", "id", "unit", "note"]) if (str(raw[k])) n[k] = str(raw[k]);
  if (raw.qty !== undefined && raw.qty !== "") n.qty = Number(raw.qty);
  if (raw.optional) n.optional = true;
  if (!n.id && raw.match && typeof raw.match === "object") {
    const m = {};
    for (const [k, v] of Object.entries(raw.match)) {
      if (k === "tags") { const a = [].concat(v ?? []).map(String).map((s) => s.trim()).filter(Boolean); if (a.length) m.tags = a; }
      else if (k === "specs") { const o = Object.fromEntries(Object.entries(v ?? {}).filter(([sk, sv]) => sk.trim() && String(sv).trim()).map(([sk, sv]) => [canon(VOCAB.specKeys, sk) ?? sk.trim(), String(sv).trim()])); if (Object.keys(o).length) m.specs = o; }
      else if (str(v)) m[k] = str(v);
    }
    const c = canonicalize(m, m.file);
    if (Object.keys(c).length) n.match = orderKeys(c, MATCH_ORDER);
  }
  if (n.unit) n.unit = canon(VOCAB.units, n.unit) ?? n.unit;
  if (raw.buy && typeof raw.buy === "object") {
    const b = Object.fromEntries(Object.entries(raw.buy).filter(([, v]) => str(v)).map(([k, v]) => [k, str(v)]));
    if (Object.keys(b).length) n.buy = b;
  }
  return orderKeys(n, NEED_ORDER);
}

export function projectErrors(p) {
  const errs = [];
  if (!String(p.name ?? "").trim()) errs.push("project needs a name");
  (p.needs ?? []).forEach((n, i) => {
    const where = `need ${i + 1}${n.name ? ` (${n.name})` : ""}`;
    if (!n.id && !n.match) errs.push(`${where}: pick an item or describe what matches`);
    if (n.qty !== undefined && (isNaN(n.qty) || n.qty <= 0)) errs.push(`${where}: qty must be a number > 0`);
  });
  return errs;
}

// ---------- project planning: status, to-dos, links, pictures ----------
export const PROJECT_STATUSES = ["idea", "planning", "building", "done", "paused"];
const PLAN_FIELDS = ["status", "todos", "links", "images"];
const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
// Pictures live in projects/media/<folder>/<file>; the project YAML stores that path relative to projects/.
const IMAGE_PATH = /^media\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp|gif)$/;
export function mediaFile(rel) {
  if (!IMAGE_PATH.test(rel ?? "") || rel.includes("..")) throw new InputError(`bad picture path: ${rel}`);
  return join(PROJ_DIR, rel);
}
const str = (v) => String(v ?? "").trim();

// Validate and tidy the planning fields that are present; leaves out empty lists.
function cleanPlan(raw) {
  const out = {};
  if (raw.status !== undefined && str(raw.status)) {
    if (!PROJECT_STATUSES.includes(str(raw.status))) throw new InputError(`status must be one of ${PROJECT_STATUSES.join(", ")}`);
    out.status = str(raw.status);
  }
  const list = (v, key) => [].concat(v ?? []).map((x) => (typeof x === "string" ? { [key]: x } : x ?? {})).filter((x) => str(x[key]));
  if (raw.todos !== undefined) out.todos = list(raw.todos, "text").map((t) => (t.done ? { text: str(t.text), done: true } : { text: str(t.text) }));
  if (raw.links !== undefined) out.links = list(raw.links, "url").map((l) => {
    if (!/^https?:\/\/\S+$/i.test(str(l.url))) throw new InputError(`link must start with http:// or https://: ${str(l.url)}`);
    return str(l.title) ? { title: str(l.title), url: str(l.url) } : { url: str(l.url) };
  });
  if (raw.images !== undefined) out.images = list(raw.images, "file").map((i) => {
    mediaFile(str(i.file));
    return str(i.caption) ? { file: str(i.file), caption: str(i.caption) } : { file: str(i.file) };
  });
  return out;
}

function readProject(file, expect) {
  const p = projPath(file);
  if (!existsSync(p)) throw new ConflictError(`project ${file} no longer exists`);
  const text = readFileSync(p, "utf8");
  if (expect && hash(text) !== expect) throw new ConflictError(`${file} was changed elsewhere`);
  return YAML.parse(text) ?? {};
}

function writeProjectFile(file, project) {
  const clean = { ...project };
  for (const k of ["todos", "links", "images"]) if (Array.isArray(clean[k]) && !clean[k].length) delete clean[k];
  if (!clean.status) delete clean.status;
  const doc = new YAML.Document(orderKeys(clean, ["name", "status", "notes", "todos", "links", "images", "needs"]));
  YAML.visit(doc, { Pair(_, pair) {
    const k = pair.key?.value;
    if (["match", "buy", "tags", "specs"].includes(k) && pair.value) pair.value.flow = true;
    if (["todos", "links", "images"].includes(k) && pair.value?.items) for (const m of pair.value.items) m.flow = true;
  } });
  const out = projPath(file);
  writeFileSync(`${out}.tmp`, `${PROJECT_HEADER}\n\n${doc.toString({ lineWidth: 0 })}`);
  renameSync(`${out}.tmp`, out);
}

// Save an uploaded picture (a data: URL from the app) and add it to the project.
export function addProjectImage({ file, data, caption, expect }) {
  const proj = readProject(file, expect);
  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(data ?? ""));
  if (!m || !IMAGE_TYPES[m[1]]) throw new InputError("pictures must be PNG, JPG, WebP or GIF");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > IMAGE_MAX_BYTES) throw new InputError("picture is larger than 8 MB");
  const folder = file.replace(/\.ya?ml$/i, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "") || "project";
  mkdirSync(join(PROJ_DIR, "media", folder), { recursive: true });
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const ext = IMAGE_TYPES[m[1]];
  let rel = `media/${folder}/${stamp}.${ext}`;
  for (let i = 2; existsSync(join(PROJ_DIR, rel)); i++) rel = `media/${folder}/${stamp}-${i}.${ext}`;
  writeFileSync(mediaFile(rel), bytes);
  writeProjectFile(file, { ...proj, ...cleanPlan({ images: [...(proj.images ?? []), { file: rel, caption }] }) });
  return rel;
}

// Remove a picture from the project and delete its file.
export function deleteProjectImage({ file, image, expect }) {
  const proj = readProject(file, expect);
  const p = mediaFile(image);
  const images = (proj.images ?? []).filter((i) => (typeof i === "string" ? i : i.file) !== image);
  writeProjectFile(file, { ...proj, ...cleanPlan({ images }) });
  if (existsSync(p)) unlinkSync(p);
  try { rmdirSync(dirname(p)); } catch { /* folder not empty */ }
}

// Create or update a project. Renaming the project renames its file (unless it is an example).
// Planning fields the caller leaves out (status, todos, links, images) keep their saved values,
// so the needs editor and an agent editing needs never wipe the to-do list or pictures.
export function saveProject({ originalFile, project, expect }) {
  const clean = { name: String(project.name ?? "").trim() };
  if (String(project.notes ?? "").trim()) clean.notes = String(project.notes).trim();
  clean.needs = (project.needs ?? []).map(cleanNeed);
  const errs = projectErrors(clean);
  if (errs.length) throw new InputError(errs.join("; "));
  mkdirSync(PROJ_DIR, { recursive: true });

  let file = originalFile;
  const saved = originalFile ? readProject(originalFile, expect) : {};
  Object.assign(clean, cleanPlan(Object.fromEntries(PLAN_FIELDS.map((k) => [k, project[k] !== undefined ? project[k] : saved[k]]))));
  const wanted = projectFileName(clean.name);
  if (!originalFile || (!originalFile.startsWith("_") && wanted !== originalFile)) {
    file = wanted;
    for (let i = 2; existsSync(join(PROJ_DIR, file)) && file !== originalFile; i++) file = wanted.replace(/\.yaml$/, `-${i}.yaml`);
  }
  writeProjectFile(file, clean);
  if (originalFile && originalFile !== file) unlinkSync(projPath(originalFile));
  return file;
}

// Find a project file from what a person or agent would type: file name (with or without .yaml),
// project name, or a unique part of either.
export function findProjectFile(query) {
  if (!existsSync(PROJ_DIR)) return null;
  const files = readdirSync(PROJ_DIR).filter((f) => /\.ya?ml$/.test(f));
  const q = norm(query).replace(/\.ya?ml$/, "");
  const named = files.map((f) => ({ f, base: f.replace(/\.ya?ml$/, "").toLowerCase(), name: norm((YAML.parse(readFileSync(join(PROJ_DIR, f), "utf8")) ?? {}).name) }));
  const exact = named.filter((x) => x.base === q || x.name === q);
  if (exact.length === 1) return exact[0].f;
  const part = named.filter((x) => x.base.includes(q) || x.name.includes(q));
  if (part.length === 1) return part[0].f;
  if (part.length > 1) throw new InputError(`"${query}" matches several projects: ${part.map((x) => x.f).join(", ")}`);
  return null;
}

// Apply a small change list to a project's planning (used by agents after a work session):
//   { status, notes_append, todos: { done, undo, remove, add, edit: [{ ref, text }] }, links: { add: [{ title, url }], remove },
//     needs: { purpose: [{ ref, text }] } }
// A ref is a 1-based number, the exact text, or a part of the text that matches only one entry.
// Returns what changed; with dryRun nothing is written.
export function updateProjectPlan({ file, patch, expect, dryRun = false }) {
  const proj = readProject(file, expect);
  const todos = (proj.todos ?? []).map((t) => (typeof t === "string" ? { text: t } : { ...t }));
  const links = (proj.links ?? []).map((l) => (typeof l === "string" ? { url: l } : { ...l }));
  const changes = [];
  const find = (list, ref, key, what) => {
    if (typeof ref === "number" || /^\d+$/.test(String(ref))) {
      const i = Number(ref) - 1;
      if (!list[i]) throw new InputError(`${what} ${ref} does not exist (there are ${list.length})`);
      return i;
    }
    const r = norm(ref);
    const exact = list.findIndex((x) => norm(x[key]) === r);
    if (exact >= 0) return exact;
    const hits = list.map((x, i) => [x, i]).filter(([x]) => norm(x[key]).includes(r) || (key === "url" && norm(x.title).includes(r)));
    if (hits.length === 1) return hits[0][1];
    throw new InputError(hits.length ? `"${ref}" matches ${hits.length} ${what}s; use the number` : `no ${what} matches "${ref}"`);
  };
  const p = patch ?? {};
  // Resolve every ref against the list as it was, so numbers don't shift while we work.
  const t = p.todos ?? {};
  for (const ref of t.done ?? []) { const i = find(todos, ref, "text", "to-do"); if (!todos[i].done) { todos[i].done = true; changes.push(`done: ${todos[i].text}`); } }
  for (const ref of t.undo ?? []) { const i = find(todos, ref, "text", "to-do"); if (todos[i].done) { delete todos[i].done; changes.push(`not done: ${todos[i].text}`); } }
  for (const { ref, text } of t.edit ?? []) { const i = find(todos, ref, "text", "to-do"); if (String(text ?? "").trim() && todos[i].text !== text.trim()) { changes.push(`edit: ${todos[i].text} -> ${text.trim()}`); todos[i].text = text.trim(); } }
  const dropTodos = new Set((t.remove ?? []).map((ref) => find(todos, ref, "text", "to-do")));
  for (const i of dropTodos) changes.push(`remove: ${todos[i].text}`);
  const keptTodos = todos.filter((_, i) => !dropTodos.has(i));
  for (const text of t.add ?? []) {
    const s = String(text ?? "").trim();
    if (!s) continue;
    if (keptTodos.some((x) => norm(x.text) === norm(s))) { changes.push(`already listed: ${s}`); continue; }
    keptTodos.push({ text: s }); changes.push(`add: ${s}`);
  }
  const l = p.links ?? {};
  const dropLinks = new Set((l.remove ?? []).map((ref) => find(links, ref, "url", "link")));
  for (const i of dropLinks) changes.push(`remove link: ${links[i].title || links[i].url}`);
  const keptLinks = links.filter((_, i) => !dropLinks.has(i));
  for (const link of l.add ?? []) {
    const add = typeof link === "string" ? { url: link } : link;
    if (keptLinks.some((x) => norm(x.url) === norm(add.url))) { changes.push(`link already there: ${add.url}`); continue; }
    keptLinks.push(add); changes.push(`add link: ${add.title ? add.title + " – " : ""}${add.url}`);
  }
  // What each part is for: needs.purpose [{ ref, text }], ref = need number or (part of) its name.
  const needs = (proj.needs ?? []).map((n) => ({ ...n }));
  for (const { ref, text } of p.needs?.purpose ?? []) {
    const i = find(needs.map((n) => ({ name: n.name ?? n.id ?? "" })), ref, "name", "need");
    const v = String(text ?? "").trim();
    if ((needs[i].purpose ?? "") !== v) { changes.push(`purpose: ${needs[i].name ?? needs[i].id} -> ${v || "(none)"}`); if (v) needs[i].purpose = v; else delete needs[i].purpose; }
  }
  let status = proj.status;
  if (p.status !== undefined && p.status !== status) { status = p.status || undefined; changes.push(`status: ${proj.status ?? "none"} -> ${p.status || "none"}`); }
  let notes = proj.notes;
  if (String(p.notes_append ?? "").trim()) { notes = [notes, String(p.notes_append).trim()].filter(Boolean).join("\n"); changes.push(`notes: + ${String(p.notes_append).trim()}`); }
  const real = changes.filter((c) => !/^(already listed|link already there)/.test(c));
  if (!dryRun && real.length) {
    // saveProject validates everything (status, http links) and refuses if the file changed meanwhile.
    const project = { name: proj.name, notes, needs, status: status ?? "", todos: keptTodos, links: keptLinks };
    saveProject({ originalFile: file, project, expect: expect ?? hash(readFileSync(projPath(file), "utf8")) });
  }
  return { file, changes, written: !dryRun && real.length > 0 };
}

// Deleting a project also deletes its pictures.
export function deleteProject({ file, expect }) {
  const proj = readProject(file, expect);
  unlinkSync(projPath(file));
  for (const i of proj.images ?? []) {
    try { const p = mediaFile(typeof i === "string" ? i : i.file); if (existsSync(p)) unlinkSync(p); rmdirSync(dirname(p)); } catch { /* keep going */ }
  }
}

export function copyExampleProject() {
  mkdirSync(PROJ_DIR, { recursive: true });
  const src = join(ROOT, "examples", "projects", "plant-watering.yaml");
  let file = "plant-watering.yaml";
  for (let i = 2; existsSync(join(PROJ_DIR, file)); i++) file = `plant-watering-${i}.yaml`;
  copyFileSync(src, join(PROJ_DIR, file));
  return file;
}

// ---------- stock changes ----------
// Apply several changes at once (e.g. "mark project as built"): [{ id, delta } | { id, set: { field: value } }].
export function adjustStock(changes) {
  if (!Array.isArray(changes) || !changes.length) throw new InputError("no changes");
  const { items } = loadInventoryWithVersions();
  const byFile = new Map();
  for (const ch of changes) {
    const it = items.find((i) => i.id === ch.id);
    if (!it) throw new ConflictError(`item ${ch.id} no longer exists`);
    if (!byFile.has(it._file)) byFile.set(it._file, readFile(it._file));
    const f = byFile.get(it._file);
    const target = f.items.find((i) => i.id === ch.id);
    if (ch.delta !== undefined) {
      if (isNaN(Number(ch.delta))) throw new InputError(`bad delta for ${ch.id}`);
      target.qty = Math.max(0, Math.round((Number(target.qty ?? 0) + Number(ch.delta)) * 1000) / 1000);
    }
    for (const [k, v] of Object.entries(ch.set ?? {})) {
      if (!["in_use", "location", "verified"].includes(k)) throw new InputError(`can't set ${k} here`);
      if (v === null || v === "") delete target[k]; else target[k] = v;
    }
  }
  for (const f of byFile.values()) writeFile(f.p, f.header, f.items);
}

// ---------- setup / admin ----------
export function initData() {
  mkdirSync(INV_DIR, { recursive: true });
  mkdirSync(PROJ_DIR, { recursive: true });
  const tdir = join(ROOT, "templates", "inventory");
  const created = [];
  for (const f of readdirSync(tdir)) {
    const dst = join(INV_DIR, f);
    if (!existsSync(dst)) { copyFileSync(join(tdir, f), dst); created.push(dst); }
  }
  return created;
}

// Claude Code skills shipped with the tool: the template in skill/ -> ~/.claude/skills/<name>/SKILL.md,
// with the tool and data folders filled in.
const SKILLS_DIR = join(homedir(), ".claude", "skills");
const SKILLS = [["inventory", "SKILL.md"], ["sync-project", "sync-project.md"]];
export const SKILL_PATH = join(SKILLS_DIR, "inventory", "SKILL.md");
export function installSkill() {
  const out = [];
  for (const [name, template] of SKILLS) {
    const path = join(SKILLS_DIR, name, "SKILL.md");
    mkdirSync(dirname(path), { recursive: true });
    const body = readFileSync(join(ROOT, "skill", template), "utf8")
      .replaceAll("{{TOOL_DIR}}", ROOT.replaceAll("\\", "/"))
      .replaceAll("{{DATA_DIR}}", DATA.replaceAll("\\", "/"));
    writeFileSync(path, body);
    out.push(path);
  }
  return out.join(", ");
}
// The sync reminder is a Claude Code Stop hook in ~/.claude/settings.json, next to any hooks the user
// already has. Installing merges it in (after a backup); removing takes out only this one.
export const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
const HOOK_SCRIPT = join(ROOT, "hooks", "sync-reminder.mjs");
const isOurHook = (h) => String(h?.command ?? "").includes("sync-reminder.mjs");
function readSettings() {
  if (!existsSync(CLAUDE_SETTINGS)) return {};
  try { return JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")); }
  catch (e) { throw new InputError(`${CLAUDE_SETTINGS} is not valid JSON (${e.message}); fix it first`); }
}
function writeSettings(s) {
  mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  if (existsSync(CLAUDE_SETTINGS)) copyFileSync(CLAUDE_SETTINGS, `${CLAUDE_SETTINGS}.bak-maker-inventory`);
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(s, null, 2) + "\n");
}
function withoutOurHook(s) {
  const stop = (s.hooks?.Stop ?? []).map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isOurHook(h)) })).filter((g) => g.hooks.length);
  const hooks = { ...(s.hooks ?? {}), Stop: stop };
  if (!stop.length) delete hooks.Stop;
  return { ...s, hooks };
}
export function hookStatus() {
  try { return (readSettings().hooks?.Stop ?? []).some((g) => (g.hooks ?? []).some(isOurHook)) ? "installed" : "missing"; }
  catch { return "missing"; }
}
export function installHook() {
  const s = withoutOurHook(readSettings());
  const env = process.env.MAKER_INVENTORY_DIR ? `MAKER_INVENTORY_DIR="${process.env.MAKER_INVENTORY_DIR.replaceAll("\\", "/")}" ` : "";
  const command = `${env}node "${HOOK_SCRIPT.replaceAll("\\", "/")}"`;
  s.hooks = { ...(s.hooks ?? {}), Stop: [...(s.hooks?.Stop ?? []), { hooks: [{ type: "command", command, timeout: 15 }] }] };
  writeSettings(s);
  return CLAUDE_SETTINGS;
}
export function uninstallHook() {
  const s = readSettings();
  if (hookStatus() === "installed") writeSettings(withoutOurHook(s));
  return CLAUDE_SETTINGS;
}
export function skillStatus() {
  const paths = SKILLS.map(([name]) => join(SKILLS_DIR, name, "SKILL.md"));
  if (!paths.every((p) => existsSync(p))) return "missing";
  return paths.every((p) => readFileSync(p, "utf8").includes(DATA.replaceAll("\\", "/"))) ? "installed" : "other";
}
