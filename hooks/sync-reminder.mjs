#!/usr/bin/env node
// Claude Code Stop hook: when a session has made progress on a project that is tracked in
// maker-inventory, ask Claude (once in a while) to run the sync-project skill, which shows the
// proposed changes and asks before writing anything. Installed by `node inv.mjs install-hook`.
//
// It stays quiet when the session isn't in a project's folder, when nothing that looks like
// progress happened since the last sync or reminder, when sync-project already ran, and within
// 30 minutes of its last reminder. It never fails a session: any error means "say nothing".
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";

const QUIET_MS = 30 * 60 * 1000;
const PURCHASE = /\b(köpt|köpte|köper|beställ\w*|har fått|kom idag|levererad\w*|bought|ordered|purchased|arrived|got the)\b/i;
const DONE = /\b(klar|klart|färdig\w*|utskriven|utskrivna|printade|skrev ut|testat|fungerar|funkar|monterat|lött|mätt|done|finished|printed|tested|works|soldered|assembled|measured)\b/i;

async function main() {
  let input = "";
  for await (const c of process.stdin) input += c;
  const ev = JSON.parse(input || "{}");
  if (ev.stop_hook_active || !ev.transcript_path || !ev.cwd) return;

  const lib = await import("../lib.mjs");
  if (!existsSync(lib.PROJ_DIR)) return;
  const project = matchProject(lib, ev.cwd);
  if (!project) return;

  const stateDir = join(tmpdir(), "maker-inventory-hook");
  const stateFile = join(stateDir, `${String(ev.session_id ?? "session").replace(/[^\w-]/g, "")}.json`);
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { line: 0, nudged: 0 };
  const lines = readFileSync(ev.transcript_path, "utf8").split("\n").filter(Boolean);
  const fresh = lines.slice(state.line);
  const save = (s) => { mkdirSync(stateDir, { recursive: true }); writeFileSync(stateFile, JSON.stringify(s)); };

  let edits = 0, purchase = false, done = false, synced = false;
  for (const raw of fresh) {
    let e; try { e = JSON.parse(raw); } catch { continue; }
    const content = e.message?.content;
    const parts = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : [];
    for (const p of parts) {
      if (p.type === "tool_use") {
        if (["Write", "Edit", "NotebookEdit"].includes(p.name)) edits++;
        if (p.name === "Skill" && /sync-project/.test(JSON.stringify(p.input ?? {}))) synced = true;
        if (/inv\.mjs["']?\s+project-update/.test(JSON.stringify(p.input ?? {}))) synced = true;
      }
      if (e.type === "user" && p.type === "text" && typeof p.text === "string" && !p.text.startsWith("<")) {
        if (/\/sync-project\b/.test(p.text)) synced = true;
        if (PURCHASE.test(p.text)) purchase = true;
        if (DONE.test(p.text)) done = true;
      }
    }
  }
  if (synced) return save({ ...state, line: lines.length });
  if (!(purchase || done || edits >= 3)) return;
  if (Date.now() - (state.nudged ?? 0) < QUIET_MS) return;

  save({ line: lines.length, nudged: Date.now() });
  const why = [purchase && "parts bought or ordered", done && "steps reported done", edits >= 3 && `${edits} file edits`].filter(Boolean).join(", ");
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `maker-inventory: this session worked on the project "${project.name}" (${project.file}) and shows progress since the last sync (${why}). ` +
      "Run the sync-project skill now: show the proposed changes to its to-dos, stock, links and status, and ask before writing anything. " +
      "If nothing here changes the project, say so in one short line and stop.",
  }));
}

// A session belongs to a project when it runs inside the project's `folder`; failing that, when one
// of its folder names is the project's file name or name (…/Cad/vending-machine/v15 ->
// vending-machine.yaml), or the project's notes mention the folder.
function matchProject(lib, cwd) {
  const segs = cwd.toLowerCase().split(/[\\/]+/).filter(Boolean);
  const cwdNorm = cwd.toLowerCase().replaceAll("\\", "/");
  if (cwdNorm.startsWith(lib.ROOT.toLowerCase().replaceAll("\\", "/"))) return null; // working on the tool itself
  const slug = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const projects = lib.loadProjects([]).filter((p) => !p.example);
  const inFolder = projects.filter((p) => p.folder && (cwdNorm + "/").startsWith(p.folder.toLowerCase().replaceAll("\\", "/").replace(/\/?$/, "/")));
  if (inFolder.length) return inFolder.sort((a, b) => b.folder.length - a.folder.length)[0];
  for (const p of projects) {
    const keys = [slug(p.file.replace(/\.ya?ml$/, "")), slug(p.name)].filter((k) => k.length > 2);
    if (segs.some((s) => keys.includes(slug(s)))) return p;
    const notes = String(p.notes ?? "").toLowerCase().replaceAll("\\", "/");
    if (notes && notes.includes(cwdNorm + "/")) return p;
  }
  return null;
}

main().catch(() => {}).finally(() => process.exit(0));
