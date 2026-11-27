#!/usr/bin/env node
// maker-inventory CLI. Run from anywhere:  node <path-to-repo>/inv.mjs <command>
//
//   init                            create your (git-ignored) inventory/ and projects/ from the templates
//   app [--port N] [--no-open]      start the web app (add / edit / delete items) on http://localhost:4310
//   desktop [--port N]              open the app in its own window; the server stops when you close it
//   install-desktop [--remove]      add (or remove) a Start menu shortcut for the desktop window (Windows)
//   check <project> [--json]        compare a project's needs with the inventory -> have / short / missing + shopping list
//   find <text...>                  search name, id, tags, specs, material, color
//   list [category|file]            list items (e.g. list servo, list filament)
//   low                             items below min_qty, and unverified items
//   adjust <id> <+n|-n> [--json]    change an item's stock (bought +n, used up -n); same safe write as the app
//   validate                        schema check (+ regenerates overview.html)
//   html                            regenerate overview.html, a read-only snapshot of the app
//   install-skill                   install the Claude Code skill to ~/.claude/skills/inventory
//   cad                             CAD component links: linked, unlinked electronics/hardware, broken
//   project [<project>] [--json]    list projects, or one project's status, to-dos, links and needs at a glance
//   project-update <project> <json|-> [--dry-run]   tick/add/edit to-dos, add links, set status (see README)
//   install-hook [--remove]         Claude Code hook that reminds the agent to run /sync-project after progress

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, DATA, INV_DIR, PROJ_DIR, norm, unitOf, inventoryExists, loadInventory, loadProjects, computeCheck, validateAll, initData, installSkill,
  loadCadLibrary, cadWarnings, CAD_FILES, adjustStock, findProjectFile, updateProjectPlan, installHook, uninstallHook } from "./lib.mjs";
import { renderApp } from "./html.mjs";

function requireInventory() {
  if (!inventoryExists()) {
    console.error(`No inventory at ${INV_DIR}. Run:  node ${join(ROOT, "inv.mjs")} init`);
    process.exit(2);
  }
  return loadInventory();
}

function resolveProject(p) {
  for (const c of [p, join(PROJ_DIR, p), join(PROJ_DIR, `${p}.yaml`), join(ROOT, "examples", "projects", p), join(ROOT, "examples", "projects", `${p}.yaml`)])
    if (existsSync(c)) return resolve(c);
  console.error(`Project not found: ${p}`); process.exit(2);
}

function check(projectPath, asJson) {
  const inv = requireInventory();
  const proj = YAML.parse(readFileSync(projectPath, "utf8"));
  const rows = computeCheck(inv, proj);
  if (asJson) return console.log(JSON.stringify({ project: proj.name, rows }, null, 2));

  const icon = { OK: "✅", SHORT: "🟡", MISSING: "❌" };
  console.log(`# ${proj.name ?? basename(projectPath)} – inventory check\n`);
  console.log("| | Need | Qty | Have | From | Notes |");
  console.log("|---|---|---|---|---|---|");
  for (const r of rows) {
    const from = r.from.map((f) => `${f.id}${f.verified ? "" : " ⚠"}${f.location ? ` (${f.location})` : ""}`).join(", ");
    const notes = [r.purpose && `for: ${r.purpose}`, r.optional && "optional", r.note, r.unverified && "⚠ not verified",
      ...r.from.filter((f) => f.in_use).map((f) => `in use in ${f.in_use} (must be taken out)`),
      ...r.alternatives.slice(0, 3).map((a) => `alt (${a.why}): ${a.name} ${a.qty} ${a.unit}${a.diff?.length ? ` [${a.diff.map((d) => `${d.key} ${d.have ?? "–"}`).join(", ")}]` : ""}`), r.alternatives.length > 3 && `+${r.alternatives.length - 3} more`].filter(Boolean).join("; ");
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
  const hay = (it) => norm([it.id, it.name, it.category, it.material, it.color, it.finish, it.brand, it._file,
    ...(it.tags ?? []), ...Object.entries(it.specs ?? {}).flat(), it.notes].join(" "));
  show(requireInventory().filter((it) => words.every((w) => hay(it).includes(norm(w)))));
}

function validate() {
  const inv = requireInventory();
  const errs = validateAll(inv);
  const warns = cadWarnings(inv);
  if (errs.length) { console.log(errs.join("\n")); process.exitCode = 1; }
  else { console.log(`OK: ${inv.length} items, no errors.`); writeHtml(); }
  if (warns.length) console.log(`\n⚠ CAD links (warnings, not errors):\n${warns.map((w) => `  ${w}`).join("\n")}`);
}

// Which stock rows link to a CAD dimension file, which could, and which links are broken.
function cad() {
  const inv = requireInventory();
  const lib = loadCadLibrary();
  console.log(`CAD library: ${lib.dir}${lib.exists ? "" : "  (folder not found; set MAKER_CAD_LIBRARY)"}`);
  console.log(`${Object.keys(lib.components).length} component file(s)`);
  // Can each value be checked? A value needs a source with a link (or its own url) unless it was measured.
  for (const c of Object.values(lib.components)) {
    if (c.error) { console.log(`  ${c.file}: unreadable (${c.error})`); continue; }
    const noSrc = c.dims.filter((d) => d.src !== "MEASURED" && !d.url && !(d.ref && c.sources[d.ref])).length;
    const noLink = Object.values(c.sources).filter((s) => !s.url).map((s) => s.key);
    console.log(`  ${c.file}: ${c.dims.length} dims` + (noSrc ? `, ${noSrc} without a source` : "") + (noLink.length ? `, source(s) without a link: ${noLink.join(", ")}` : ""));
  }
  console.log("");
  const linked = inv.filter((it) => it.cad_component && lib.components[it.cad_component]);
  const broken = inv.filter((it) => it.cad_component && !lib.components[it.cad_component]);
  const unlinked = inv.filter((it) => !it.cad_component && CAD_FILES.includes(it._file));
  const suggest = (it) => Object.values(lib.components).find((c) => c.inventory_ids.includes(it.id))?.id;
  console.log("## Linked");
  for (const it of linked) console.log(`${it.id.padEnd(30)} -> ${it.cad_component} (${lib.components[it.cad_component].dims.length} dims)`);
  if (!linked.length) console.log("(none)");
  if (broken.length) { console.log("\n## Broken (no such file)"); for (const it of broken) console.log(`${it.id.padEnd(30)} -> ${it.cad_component}`); }
  console.log(`\n## No CAD dimensions yet (${CAD_FILES.join(", ")})`);
  for (const it of unlinked) { const s = suggest(it); console.log(`${it.id.padEnd(30)} ${it.name}${s ? `   <- listed in ${s}.yaml: add cad_component: ${s}` : ""}`); }
  if (!unlinked.length) console.log("(none)");
}

function writeHtml() {
  const inv = requireInventory();
  const out = join(DATA, "overview.html");
  writeFileSync(out, renderApp({ snapshot: { items: inv, projects: loadProjects(inv), cad: loadCadLibrary(), generatedAt: new Date().toISOString() } }));
  console.log(`Overview: ${out}`);
}

// ---------- projects at a glance (for people and for the sync-project skill) ----------
function projectFileOrExit(q) {
  let f;
  try { f = findProjectFile(q); } catch (e) { console.error(e.message); process.exit(2); }
  if (!f) { console.error(`No project matches "${q}". Projects: ${loadProjects(loadInventory()).map((p) => p.file).join(", ") || "(none)"}`); process.exit(2); }
  return f;
}

function projectShow(q, asJson) {
  const projects = loadProjects(requireInventory());
  if (!q) {
    if (asJson) return console.log(JSON.stringify(projects.map((p) => ({ file: p.file, name: p.name, status: p.status ?? null }))));
    for (const p of projects) console.log(`${p.file.padEnd(32)} ${p.name}${p.status ? `  [${p.status}]` : ""}`);
    if (!projects.length) console.log("(no projects)");
    return;
  }
  const p = projects.find((x) => x.file === projectFileOrExit(q));
  const count = (s) => p.rows.filter((r) => r.status === s).length;
  if (asJson) {
    return console.log(JSON.stringify({ file: p.file, name: p.name, status: p.status ?? null, notes: p.notes ?? null, version: p.version,
      todos: p.todos.map((t, i) => ({ n: i + 1, text: t.text, done: !!t.done })), links: p.links.map((l, i) => ({ n: i + 1, ...l })),
      images: p.images.length, needs: { ok: count("OK"), short: count("SHORT"), missing: count("MISSING"),
        open: p.rows.filter((r) => r.status !== "OK").map((r) => ({ need: r.need, qty: r.qty, have: r.got, unit: r.unit, optional: r.optional })),
        list: p.rows.map((r, i) => ({ n: i + 1, need: r.need, status: r.status, qty: r.qty, have: r.got, unit: r.unit, purpose: r.purpose ?? null })) } }, null, 2));
  }
  console.log(`# ${p.name}  (${p.file})${p.status ? `  [${p.status}]` : ""}`);
  if (p.notes) console.log(`\n${p.notes}`);
  const done = p.todos.filter((t) => t.done).length;
  console.log(`\n## To do (${done}/${p.todos.length} done)`);
  p.todos.forEach((t, i) => console.log(`${String(i + 1).padStart(3)}. [${t.done ? "x" : " "}] ${t.text}`));
  if (!p.todos.length) console.log("(none)");
  console.log(`\n## Links`);
  p.links.forEach((l, i) => console.log(`${String(i + 1).padStart(3)}. ${l.title ? `${l.title} – ` : ""}${l.url}`));
  if (!p.links.length) console.log("(none)");
  console.log(`\n## Needs: ${count("OK")} in stock, ${count("SHORT")} short, ${count("MISSING")} missing (details: check ${p.file.replace(/\.ya?ml$/, "")})`);
  const mark = { OK: "ok ", SHORT: "½  ", MISSING: "-  " };
  p.rows.forEach((r, i) => console.log(`${String(i + 1).padStart(3)}. ${mark[r.status]}${r.need}${r.purpose ? `  – ${r.purpose}` : "  (purpose not given)"}`));
  if (p.images.length) console.log(`\n${p.images.length} picture(s)`);
}

async function projectUpdate(q, src, dryRun) {
  if (!q || !src) { console.error('usage: project-update <project> <json|-> [--dry-run]\n  e.g. project-update vending \'{"todos":{"done":[3],"add":["Order springs"]},"links":{"add":[{"title":"Datasheet","url":"https://…"}]}}\''); process.exit(2); }
  const file = projectFileOrExit(q);
  let text = src;
  if (src === "-") { text = ""; for await (const c of process.stdin) text += c; }
  else if (existsSync(src)) text = readFileSync(src, "utf8");
  let patch;
  try { patch = JSON.parse(text); } catch (e) { console.error(`not valid JSON: ${e.message}`); process.exit(2); }
  try {
    const r = updateProjectPlan({ file, patch, dryRun });
    console.log(r.changes.length ? r.changes.map((c) => `${dryRun ? "would " : ""}${c}`).join("\n") : "nothing to change");
    if (r.written) console.log(`saved ${file}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}

function init() {
  const created = initData();
  for (const f of created) console.log(`created: ${f}`);
  if (!created.length) console.log(`Inventory already set up in ${INV_DIR}`);
  console.log(`
Projects go in ${PROJ_DIR}. Example: ${join(ROOT, "examples", "projects")}`);
}

const [cmd, ...args] = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const pos = args.filter((a) => !a.startsWith("--"));
const flagVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

switch (cmd) {
  case "init": init(); break;
  case "app": case "serve": {
    if (!inventoryExists()) { initData(); console.log(`Created an empty inventory in ${INV_DIR}`); }
    const { startServer } = await import("./server.mjs");
    startServer({ port: Number(flagVal("--port") ?? process.env.PORT ?? 4310), open: !flags.includes("--no-open") });
    break;
  }
  case "desktop": {
    if (!inventoryExists()) initData();
    const { runDesktop } = await import("./desktop.mjs");
    await runDesktop({ port: Number(flagVal("--port") ?? process.env.PORT ?? 4310) });
    break;
  }
  case "install-desktop": {
    const { installDesktop, uninstallDesktop } = await import("./desktop.mjs");
    if (flags.includes("--remove")) console.log(`Removed: ${uninstallDesktop()}`);
    else console.log(`Shortcut: ${installDesktop()}
Find "Maker Inventory" in the Start menu; right-click it to pin it to the taskbar.`);
    break;
  }
  case "check":
    if (!pos[0]) { console.error("usage: check <project>"); process.exit(2); }
    check(resolveProject(pos[0]), flags.includes("--json"));
    break;
  case "find": find(pos); break;
  case "list": {
    const inv = requireInventory();
    show(pos[0] ? inv.filter((it) => it._file === norm(pos[0]) || norm(it.category) === norm(pos[0])) : inv);
    break;
  }
  case "adjust": {
    const [id, d] = [pos[0], args.find((a, i) => i > 0 && /^[+-]?\d+(\.\d+)?$/.test(a))];
    if (!id || d === undefined) { console.error("usage: adjust <id> <+n|-n>   e.g. adjust sg90-servo +2"); process.exit(2); }
    const inv = requireInventory();
    const it = inv.find((i) => i.id === id);
    if (!it) { console.error(`no item "${id}" (find it with: find <text>; a new part is added in the app or by the agent skill)`); process.exit(1); }
    try { adjustStock([{ id, delta: Number(d) }]); } catch (e) { console.error(e.message); process.exit(1); }
    const after = loadInventory().find((i) => i.id === id);
    if (flags.includes("--json")) console.log(JSON.stringify({ id, before: it.qty, after: after.qty, unit: unitOf(after) }));
    else console.log(`${id}: ${it.qty} -> ${after.qty} ${unitOf(after)}`);
    break;
  }
  case "low": {
    const inv = requireInventory();
    console.log("## Below min_qty"); show(inv.filter((it) => it.min_qty !== undefined && Number(it.qty) < Number(it.min_qty)));
    console.log("\n## Unverified"); show(inv.filter((it) => it.verified === false));
    break;
  }
  case "validate": validate(); break;
  case "html": writeHtml(); break;
  case "install-skill": console.log(`Installed: ${installSkill()}`); break;
  case "cad": cad(); break;
  case "install-hook":
    try { console.log(flags.includes("--remove") ? `Removed the sync reminder from ${uninstallHook()}` : `Sync reminder added to ${installHook()} (backup: settings.json.bak-maker-inventory). Restart Claude Code sessions to load it.`); }
    catch (e) { console.error(e.message); process.exit(1); }
    break;
  case "project": projectShow(pos[0], flags.includes("--json")); break;
  case "project-update": await projectUpdate(pos[0], pos[1], flags.includes("--dry-run")); break;
  default: {
    const src = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
    console.log(src.slice(1, src.findIndex((l, i) => i > 3 && !l.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  }
}
