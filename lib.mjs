// Shared logic for the CLI (inv.mjs) and the web app server (server.mjs).
import { readFileSync, readdirSync, existsSync, writeFileSync, renameSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
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
      unverified: from.some((f) => !f.verified), optional: !!need.optional, buy: need.buy, note: need.note });
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
  return errs;
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
  "min_qty", "tags", "specs", "location", "in_use", "verified", "source", "notes"];

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
const PROJECT_HEADER = "# Project needs. Edited in the maker-inventory app or by hand; format: README.md \"Project file\".";
const NEED_ORDER = ["name", "id", "match", "qty", "unit", "optional", "note", "buy"];
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
  for (const k of ["name", "id", "unit", "note"]) if (str(raw[k])) n[k] = str(raw[k]);
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

// Create or update a project. Renaming the project renames its file (unless it is an example).
export function saveProject({ originalFile, project, expect }) {
  const clean = { name: String(project.name ?? "").trim() };
  if (String(project.notes ?? "").trim()) clean.notes = String(project.notes).trim();
  clean.needs = (project.needs ?? []).map(cleanNeed);
  const errs = projectErrors(clean);
  if (errs.length) throw new InputError(errs.join("; "));
  mkdirSync(PROJ_DIR, { recursive: true });

  let file = originalFile;
  if (originalFile) {
    const p = projPath(originalFile);
    if (!existsSync(p)) throw new ConflictError(`project ${originalFile} no longer exists`);
    if (expect && hash(readFileSync(p, "utf8")) !== expect) throw new ConflictError(`${originalFile} was changed elsewhere`);
  }
  const wanted = projectFileName(clean.name);
  if (!originalFile || (!originalFile.startsWith("_") && wanted !== originalFile)) {
    file = wanted;
    for (let i = 2; existsSync(join(PROJ_DIR, file)) && file !== originalFile; i++) file = wanted.replace(/\.yaml$/, `-${i}.yaml`);
  }
  const doc = new YAML.Document(clean);
  YAML.visit(doc, { Pair(_, pair) { if (["match", "buy", "tags", "specs"].includes(pair.key?.value) && pair.value) pair.value.flow = true; } });
  const out = projPath(file);
  writeFileSync(`${out}.tmp`, `${PROJECT_HEADER}\n\n${doc.toString({ lineWidth: 0 })}`);
  renameSync(`${out}.tmp`, out);
  if (originalFile && originalFile !== file) unlinkSync(projPath(originalFile));
  return file;
}

export function deleteProject({ file, expect }) {
  const p = projPath(file);
  if (!existsSync(p)) throw new ConflictError(`project ${file} no longer exists`);
  if (expect && hash(readFileSync(p, "utf8")) !== expect) throw new ConflictError(`${file} was changed elsewhere`);
  unlinkSync(p);
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

export const SKILL_PATH = join(homedir(), ".claude", "skills", "inventory", "SKILL.md");
export function installSkill() {
  mkdirSync(dirname(SKILL_PATH), { recursive: true });
  const body = readFileSync(join(ROOT, "skill", "SKILL.md"), "utf8")
    .replaceAll("{{TOOL_DIR}}", ROOT.replaceAll("\\", "/"))
    .replaceAll("{{DATA_DIR}}", DATA.replaceAll("\\", "/"));
  writeFileSync(SKILL_PATH, body);
  return SKILL_PATH;
}
export function skillStatus() {
  if (!existsSync(SKILL_PATH)) return "missing";
  return readFileSync(SKILL_PATH, "utf8").includes(DATA.replaceAll("\\", "/")) ? "installed" : "other";
}
