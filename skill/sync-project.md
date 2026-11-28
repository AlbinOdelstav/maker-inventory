---
name: sync-project
description: Bring a maker project in the maker-inventory up to date - with what happened in this session and with the project's own files (latest version folder, README, BOM, build report, log), so to-dos left behind by earlier versions or other sessions get fixed too. Ticks off finished to-dos, adds next steps, records parts bought, used up or broken, adds links, updates status, needs and what each part is for. Shows the changes and their evidence first, then applies them. Use when the user runs /sync-project, says "uppdatera projektet", "synka läget", "update the project", "sync progress", "spara läget", or wraps up a work session on a project that is in the inventory.
model: sonnet
---

# /sync-project: write this session's progress into the project

Tool: `{{TOOL_DIR}}/inv.mjs` (run with `node`). Data: `{{DATA_DIR}}`. The app (`node {{TOOL_DIR}}/inv.mjs app`)
shows the same files and reloads by itself when they change. Answer in the user's language.

**Your stance: record what happened, not what was planned.** Every change must rest on evidence: the
user saying it in this session, a test that passed, or a file in the project folder that says so
(quote the file and line). When unsure, list it as a question instead of a change. Stock changes only
for things the user says were bought, used, broken, moved or counted (a shopping list or a plan is
not a purchase).

**This session is not the whole story.** Work on a project is often spread over many sessions, and
the session running this may have seen only one corner of it. The project's files are the record of
the rest: always reconcile the to-do list with them (step 2), even when this session did little.

## 1. Which project

`node {{TOOL_DIR}}/inv.mjs project` lists the projects. Pick the one the user named, else the one
this session worked on (folder name, project name, files touched). If two fit or none does, ask.
Then read its current state:

```sh
node {{TOOL_DIR}}/inv.mjs project <project> --json   # status, folder, numbered to-dos, links, needs
node {{TOOL_DIR}}/inv.mjs check <project> --json     # which needs are in stock, short, missing
```

The project's `folder` says where its files are. If it is empty, find the folder (paths in the
notes, this session's working folder, a folder named like the project) and propose setting it
(`"folder": "<path>"` in step 5), so the next sync and the sync reminder find it directly.

## 2. Reconcile with the project's files

Read the project's current state from its folder, whatever this session did:

- **The latest version.** If the folder has version folders (`v1` … `v15`), the highest one is
  current. Read its README (status, what was changed, "not checked" lists), its BOM, and the build
  report's verdict lines (PASS/FAIL, "known failure"). Skim the version folder names in between to
  see what each version did.
- **Logs and plans**: `LOG.md`, a cadkit `project.yaml` (phase, plan steps), an electronics or
  firmware README, `buttons/`-style side folders. Read the newest parts.

Then go through **every open to-do** and ask:

| The to-do … | Propose |
|---|---|
| names an older version than the current one ("v13: …" when v15 exists) | `remove` it if a later version finished or replaced it (not `done`: the list should never show an old vN, ticked or not), or `edit` it to the current version if the step still applies there |
| is done according to the files (a README says built, a BOM is written, a review passed, parts were chosen) | `done`, quoting the file; but `remove` instead when it names an old version |
| was replaced by a different approach (e.g. self-tapping screws dropped for bolts and nuts) | `remove` or `edit`, saying what replaced it |
| refers to files, quantities or parts the current BOM no longer has | `edit` to the current numbers |

And the other way: steps the files say are next or open ("not checked", "print the nut coupon
first", "measure the motor current", parts still to buy) and that no to-do covers → `todos.add`.
Keep the user's own wording where a to-do is still right; don't rewrite for style.

## 3. Harvest the session

Go through the whole conversation, not only the last messages. Collect:

| What | Where it goes |
|---|---|
| A to-do that is now done (printed, tested, measured, decided, ordered) | tick it (`todos.done`) |
| A to-do that turned out wrong or got split | reword it (`todos.edit`) or remove it, but ask before removing one the user wrote |
| New next steps, open problems, things to measure, test, buy or decide | `todos.add`: short and actionable, one thing each, no duplicate of an existing line |
| The user bought or received parts | stock: `adjust <id> +n` for an existing row; a new row (specific variant, see the inventory skill) for a new part |
| Ordered but not arrived | a to-do ("Vänta på leverans: …"), not stock |
| Parts used up, broken, or built into this project | `adjust <id> -n`, or set `in_use` in the app/YAML |
| Web pages that mattered: datasheets, shop pages, guides, the CAD repo | `links.add` with a short title; only http(s) links you saw in the session |
| The phase changed (idea → planning → building → done, or paused) | `status` |
| The parts list changed (new design, new BOM) | update `needs` (see below); every new need gets a `purpose` |
| What a part is for became clear or changed (wiring, design, a decision: "the IRLZ44N switch one coil motor each") | `needs.purpose`: one or two plain sentences on exactly what it does in this build, where it sits and why this variant. Fill in needs that have none (marked "purpose not given" by `project`) when the session or the project's BOM/README says it |
| A decision that changes what to buy or build | `notes_append`, one dated line, only if it isn't obvious from the to-dos |
| Parts were printed ("printade 4 Cell_A", a print finished) | `prints.printed: [{ref, n}]`; ref = part name from `project`'s Printed parts list |
| A new build report with a PRINT LIST (new version, parts changed) | `node {{TOOL_DIR}}/inv.mjs prints-import <project> <report>`: updates quantities, keeps counts printed |
| A schematic, board layout or assembly drawing (.svg) was made or moved | `drawings.add: [{title, file}]`, then `drawings.map: [{drawing, label, need}]` for each component label in it that is a need (labels are texts in the SVG, e.g. "IRLZ44N", "1000 µF") |

Not here: measurements and debugging details belong in the project's own log (e.g. cadkit `/log`),
pictures are added in the app (drag them onto the Pictures panel).

When reconciling (step 2), also check: does the current version's build report differ from the
project's `print_report` (an older version folder)? Then propose re-importing from the current one.
Do the drawings point at files that still exist, and are new component labels unlinked?

## 4. Show the plan, then wait

One compact list, grouped (To do / Stock / Links / Status / Needs and purposes / Notes / Folder).
Each line says what changes and why: a few words from the session, or the file and line it rests on:

```
To do
  ✓ 8 "v13: bygg om och kör /cad-review"     - v15/README: "cadkit: all checks pass"
  ~ 9 "Skriv ut v13 testceller" -> "Skriv ut v15 testceller A + B"   - v15 is current; cells unchanged since v13
  - 11 "Skruva i M3×16 självgängande …"      - v15/BOM: no self-tapping screws any more
  + "Skriv ut mutterprovet först"             - v15/BOM §6 step 1
Stock
  + 24 × varuspiral YD 20 (new row)           - "köpte spiralerna på AliExpress"
Status  building (unchanged)
?  "Mät stallströmmen" - did you measure it? (not changed unless you say so)
```

If the reconciliation finds a lot (a list several versions behind), say so in one line first, so
the user sees why the list is long.

Ask once: apply all, or which numbers to skip. Nothing is written before the user answers.

## 5. Apply

- Planning, in one call (refs are to-do numbers from step 1, or a unique part of the text;
  `"folder": "<path>"` sets the project folder):

  ```sh
  node {{TOOL_DIR}}/inv.mjs project-update <project> - <<'EOF'
  {"todos": {"done": [8], "add": ["Skriv ut v13 testceller A + B"], "edit": [{"ref": 9, "text": "…"}], "remove": []},
   "links": {"add": [{"title": "Datasheet IRLZ44N", "url": "https://…"}]},
   "needs": {"purpose": [{"ref": 7, "text": "Slår av och på en spiralmotor var (12 st), styrs från Megans pinnar; logiknivå så 5 V räcker."}],
             "buy": [{"ref": "akryl", "where": "Clas Ohlson 34-1360", "est_price": "129 kr", "link": "https://…"}],
             "note": [{"ref": "spiral", "text": "Från Jula-kompostgallret; räkna hur många som räcker"}]},
   "status": "building", "notes_append": "2026-11-27: knappar Omron D2F valda"}
  EOF
  ```

  Need refs are the numbers in the Needs list from `project`, or a unique part of the need's name.
  `buy` sets where to buy a need, an estimated price and a shop link (http/https only; an empty
  value clears it); use it when the session found the right product page. `note` replaces a
  need's note.

  Add `--dry-run` first if the change list is long. It refuses if the file changed meanwhile:
  then read it again and redo the step.
- Stock: `node {{TOOL_DIR}}/inv.mjs adjust <id> +n` (or `-n`). New parts: re-read the inventory
  YAML file, add the row as the inventory skill describes, then `node {{TOOL_DIR}}/inv.mjs validate`.
- Needs: re-read the project file and edit only `needs` (the planning fields are kept when the
  needs change), or follow the bom skill's step 5. Then `validate`.
- Finish with `node {{TOOL_DIR}}/inv.mjs project <project>` and `check <project>`, and report in
  two or three lines what changed and how the needs moved (e.g. 12/38 → 15/38 in stock).

## Never

- Tick a to-do because it was planned, discussed or "should work"; done means done.
- Change stock from a shopping list, a BOM or a cart.
- Touch other projects, or delete the user's to-dos without asking.
- Invent links, or add a link you didn't see in the session.
- Commit the user's data (`inventory/`, `projects/` are git-ignored on purpose).
