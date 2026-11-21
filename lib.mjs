// Shared logic for the CLI (inv.mjs) and the web app server (server.mjs).
import { readFileSync, readdirSync, existsSync, writeFileSync, renameSync } from "node:fs";
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
    const proj = YAML.parse(readFileSync(join(PROJ_DIR, f), "utf8")) ?? {};
    return { file: f, name: proj.name ?? f, example: f.startsWith("_"), rows: computeCheck(inv, proj) };
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
    const alternatives = [];
    if (status !== "OK" && need.match) {
      const seen = new Set(cands.map((c) => c.id));
      for (const [why, m] of relaxations(need.match)) {
        for (const it of inv.filter((i) => matches(i, m) && !seen.has(i.id))) {
          seen.add(it.id);
          alternatives.push({ why, id: it.id, name: it.name, qty: it.qty, unit: unitOf(it) });
        }
      }
    }
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
