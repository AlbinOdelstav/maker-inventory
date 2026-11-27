---
name: sync-project
description: Bring a maker project in the maker-inventory up to date with what happened in this session - tick off finished to-dos, add the next steps, record parts bought, used up or broken, add useful links, update the status and the parts list. Shows the changes and their evidence first, then applies them. Use when the user runs /sync-project, says "uppdatera projektet", "synka läget", "update the project", "sync progress", "spara läget", or wraps up a work session on a project that is in the inventory.
model: sonnet
---

# /sync-project: write this session's progress into the project

Tool: `{{TOOL_DIR}}/inv.mjs` (run with `node`). Data: `{{DATA_DIR}}`. The app (`node {{TOOL_DIR}}/inv.mjs app`)
shows the same files and reloads by itself when they change. Answer in the user's language.

**Your stance: record what happened, not what was planned.** Every change must rest on something in
this session: the user saying it, a test that passed, a file that was written. When unsure, list it
as a question instead of a change. Stock changes only for things the user says were bought, used,
broken, moved or counted (a shopping list or a plan is not a purchase).

## 1. Which project

`node {{TOOL_DIR}}/inv.mjs project` lists the projects. Pick the one the user named, else the one
this session worked on (folder name, project name, files touched). If two fit or none does, ask.
Then read its current state:

```sh
node {{TOOL_DIR}}/inv.mjs project <project> --json   # status, numbered to-dos, links, open needs
node {{TOOL_DIR}}/inv.mjs check <project> --json     # which needs are in stock, short, missing
```

If the project folder has its own records (e.g. a cadkit `project.yaml`, `LOG.md`, `BOM.md`, a
version README) and they changed in this session, read the changed parts too.

## 2. Harvest the session

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

Not here: measurements and debugging details belong in the project's own log (e.g. cadkit `/log`),
pictures are added in the app (drag them onto the Pictures panel).

## 3. Show the plan, then wait

One compact list, grouped (To do / Stock / Links / Status / Needs and purposes / Notes). Each line says what
changes and why, quoting or pointing at the session in a few words:

```
To do
  ✓ 8 "v13: bygg om och kör /cad-review"   - review passed, verdict READY
  + "Skriv ut v13 testceller A + B"          - next step you agreed on
Stock
  + 24 × varuspiral YD 20 (new row)          - "köpte spiralerna på AliExpress"
Status  building (unchanged)
?  "Mät stallströmmen" - did you measure it? (not changed unless you say so)
```

Ask once: apply all, or which numbers to skip. Nothing is written before the user answers.

## 4. Apply

- Planning, in one call (refs are to-do numbers from step 1, or a unique part of the text):

  ```sh
  node {{TOOL_DIR}}/inv.mjs project-update <project> - <<'EOF'
  {"todos": {"done": [8], "add": ["Skriv ut v13 testceller A + B"], "edit": [{"ref": 9, "text": "…"}], "remove": []},
   "links": {"add": [{"title": "Datasheet IRLZ44N", "url": "https://…"}]},
   "needs": {"purpose": [{"ref": 7, "text": "Slår av och på en spiralmotor var (12 st), styrs från Megans pinnar; logiknivå så 5 V räcker."}]},
   "status": "building", "notes_append": "2026-11-27: knappar Omron D2F valda"}
  EOF
  ```

  Need refs are the numbers in the Needs list from `project`, or a unique part of the need's name.

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
