#!/usr/bin/env node
// maker-inventory CLI. Run from anywhere:  node <path-to-repo>/inv.mjs <command>
//
//   init                            create your (git-ignored) inventory/ and projects/ from the templates
//   check <project> [--json]        compare a project's needs with the inventory -> have / short / missing + shopping list
//   find <text...>                  search name, id, tags, specs, material, color
//   list [category|file]            list items (e.g. list servo, list filament)
//   low                             items below min_qty, and unverified items
//   validate                        schema check (+ regenerates overview.html)
//   html                            regenerate overview.html, the visual overview
//   install-skill                   install the Claude Code skill to ~/.claude/skills/inventory

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { renderHtml } from "./html.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
// Your data lives here. Default: next to the tool (git-ignored). Override with MAKER_INVENTORY_DIR.
const DATA = resolve(process.env.MAKER_INVENTORY_DIR ?? ROOT);
const INV_DIR = join(DATA, "inventory");
const PROJ_DIR = join(DATA, "projects");

const norm = (v) => String(v ?? "").trim().toLowerCase();

function loadInventory() {
  if (!existsSync(INV_DIR)) {
    console.error(`No inventory at ${INV_DIR}. Run:  node ${join(ROOT, "inv.mjs")} init`);
    process.exit(2);
  }
  const items = [];
  for (const f of readdirSync(INV_DIR).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const data = YAML.parse(readFileSync(join(INV_DIR, f), "utf8")) ?? [];
    if (!Array.isArray(data)) throw new Error(`${f}: top level must be a list`);
    for (const it of data) items.push({ ...it, _file: basename(f).replace(/\.ya?ml$/, "") });
  }
  return items;
}

const unitOf = (it) => it.unit ?? (it._file === "filament" ? "g" : "pcs");

// Does an inventory item satisfy a `match` object?
// Keys: category, material, color, finish, brand, file -> equal (case-insensitive)
//       tags -> item has all of them; text -> substring of name/id; specs -> each spec equal
function matches(it, m) {
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
    } else if (norm(it[k]) !== norm(want)) return false;
  }
  return true;
}

// Looser versions of a match, used to suggest substitutes when nothing fits.
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

function resolveProject(p) {
  for (const c of [p, join(PROJ_DIR, p), join(PROJ_DIR, `${p}.yaml`), join(ROOT, "examples", "projects", p), join(ROOT, "examples", "projects", `${p}.yaml`)])
    if (existsSync(c)) return resolve(c);
  console.error(`Project not found: ${p}`); process.exit(2);
}

function check(projectPath, asJson) {
  const inv = loadInventory();
  const proj = YAML.parse(readFileSync(projectPath, "utf8"));
  const rows = computeCheck(inv, proj);
  if (asJson) return console.log(JSON.stringify({ project: proj.name, rows }, null, 2));

  const icon = { OK: "✅", SHORT: "🟡", MISSING: "❌" };
  console.log(`# ${proj.name ?? basename(projectPath)} – inventory check\n`);
  console.log("| | Need | Qty | Have | From | Notes |");
  console.log("|---|---|---|---|---|---|");
  for (const r of rows) {
    const from = r.from.map((f) => `${f.id}${f.verified ? "" : " ⚠"}${f.location ? ` (${f.location})` : ""}`).join(", ");
    const notes = [r.optional && "optional", r.note, r.unverified && "⚠ not verified",
      ...r.from.filter((f) => f.in_use).map((f) => `in use in ${f.in_use} (must be taken out)`),
      ...r.alternatives.map((a) => `alt (${a.why}): ${a.name} ${a.qty} ${a.unit}`)].filter(Boolean).join("; ");
    console.log(`| ${icon[r.status]} | ${r.need} | ${r.qty} ${r.unit} | ${r.got} | ${from || "–"} | ${notes} |`);
  }
  const buy = rows.filter((r) => r.status !== "OK");
  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(`\n**${count("OK")} in stock, ${count("SHORT")} short, ${count("MISSING")} missing.**`);
  if (buy.length) {
    console.log("\n## Shopping list\n");
    for (const r of buy) {
      const extra = r.buy ? ` – ${Object.entries(r.buy).map(([k, v]) => `${k}: ${v}`).join(", ")}` : "";
      console.log(`- [ ] ${r.need}: ${r.qty - r.got} ${r.unit}${r.optional ? " (optional)" : ""}${extra}`);
    }
  }
  const unv = rows.filter((r) => r.unverified);
  if (unv.length) console.log(`\n⚠ ${unv.length} row(s) rely on unverified items – check the drawer before trusting them.`);
}

function show(items) {
  if (!items.length) return console.log("(no matches)");
  for (const it of items) {
    const bits = [it.material, it.color, it.finish].filter(Boolean).join(" ");
    console.log(`${String(it.id).padEnd(30)} ${String(it.qty ?? "?").padStart(6)} ${unitOf(it).padEnd(3)} ${it.name}${bits && !String(it.name).includes(bits) ? ` [${bits}]` : ""}` +
      `${it.verified === false ? "  ⚠ unverified" : ""}${it.location ? `  @ ${it.location}` : ""}`);
  }
}

function find(words) {
  const inv = loadInventory();
  const hay = (it) => norm([it.id, it.name, it.category, it.material, it.color, it.finish, it.brand, it._file,
    ...(it.tags ?? []), ...Object.entries(it.specs ?? {}).flat(), it.notes].join(" "));
  show(inv.filter((it) => words.every((w) => hay(it).includes(norm(w)))));
}

function validate() {
  const inv = loadInventory();
  const errs = [];
  const ids = new Map();
  for (const it of inv) {
    const where = `${it._file}.yaml:${it.id ?? it.name ?? "?"}`;
    if (!it.id) errs.push(`${where}: missing id`);
    else if (!/^[a-z0-9][a-z0-9.-]*$/.test(it.id)) errs.push(`${where}: id must be kebab-case`);
    if (ids.has(it.id)) errs.push(`${where}: duplicate id (also in ${ids.get(it.id)})`);
    ids.set(it.id, it._file);
    if (!it.name) errs.push(`${where}: missing name`);
    if (it.qty === undefined || isNaN(Number(it.qty)) || Number(it.qty) < 0) errs.push(`${where}: qty must be a number >= 0`);
    if (it._file === "filament" && (!it.material || !it.color)) errs.push(`${where}: filament needs material and color`);
  }
  if (errs.length) { console.log(errs.join("\n")); process.exitCode = 1; }
  else { console.log(`OK: ${inv.length} items, no errors.`); writeHtml(); }
}

function writeHtml() {
  const inv = loadInventory();
  const projects = existsSync(PROJ_DIR) ? readdirSync(PROJ_DIR).filter((f) => /\.ya?ml$/.test(f)).sort().map((f) => {
    const proj = YAML.parse(readFileSync(join(PROJ_DIR, f), "utf8"));
    return { file: f, name: proj.name ?? f, example: f.startsWith("_"), rows: computeCheck(inv, proj) };
  }).sort((a, b) => a.example - b.example) : [];
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const out = join(DATA, "overview.html");
  writeFileSync(out, renderHtml(inv, projects, stamp));
  console.log(`Overview: ${out}`);
}

function init() {
  mkdirSync(INV_DIR, { recursive: true });
  mkdirSync(PROJ_DIR, { recursive: true });
  const tdir = join(ROOT, "templates", "inventory");
  for (const f of readdirSync(tdir)) {
    const dst = join(INV_DIR, f);
    if (existsSync(dst)) console.log(`exists, kept: ${dst}`);
    else { copyFileSync(join(tdir, f), dst); console.log(`created: ${dst}`); }
  }
  console.log(`\nProjects go in ${PROJ_DIR}. Example: ${join(ROOT, "examples", "projects")}`);
}

function installSkill() {
  const dst = join(homedir(), ".claude", "skills", "inventory");
  mkdirSync(dst, { recursive: true });
  const body = readFileSync(join(ROOT, "skill", "SKILL.md"), "utf8")
    .replaceAll("{{TOOL_DIR}}", ROOT.replaceAll("\\", "/"))
    .replaceAll("{{DATA_DIR}}", DATA.replaceAll("\\", "/"));
  writeFileSync(join(dst, "SKILL.md"), body);
  console.log(`Installed: ${join(dst, "SKILL.md")}`);
}

const [cmd, ...args] = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const pos = args.filter((a) => !a.startsWith("--"));

switch (cmd) {
  case "init": init(); break;
  case "check":
    if (!pos[0]) { console.error("usage: check <project>"); process.exit(2); }
    check(resolveProject(pos[0]), flags.includes("--json"));
    break;
  case "find": find(pos); break;
  case "list": {
    const inv = loadInventory();
    show(pos[0] ? inv.filter((it) => it._file === norm(pos[0]) || norm(it.category) === norm(pos[0])) : inv);
    break;
  }
  case "low": {
    const inv = loadInventory();
    console.log("## Below min_qty"); show(inv.filter((it) => it.min_qty !== undefined && Number(it.qty) < Number(it.min_qty)));
    console.log("\n## Unverified"); show(inv.filter((it) => it.verified === false));
    break;
  }
  case "validate": validate(); break;
  case "html": writeHtml(); break;
  case "install-skill": installSkill(); break;
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 12).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
}
