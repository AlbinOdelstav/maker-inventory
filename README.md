# maker-inventory

A plain-text inventory for makers: filament, Arduino/electronics parts, screws and magnets,
consumables and tools. You keep it in YAML files. AI agents such as Claude Code read and update
those files, and answer **"do I have everything for this idea, and what do I need to buy?"**

- **YAML files you (or an agent) edit.** Easy to diff, work offline, no database.
- **`check`** compares a project's needs with your stock. It shows what you have, what is short
  and what is missing, writes a shopping list, and suggests substitutes you already own.
- **A web app** (`node inv.mjs app`) where you can do everything yourself. Asking an agent is
  only a shortcut.
  - **Items:** a dashboard, sortable tables per section and filament color swatches. Add, edit
    and delete items in a side panel, and use +/- buttons for quick stock changes.
  - **Projects:** create and edit projects and list what each one needs. The app shows what you
    have and what to buy. You can add a bought part to stock straight from the shopping list,
    and **mark a project as built**, which either subtracts the parts or marks them as in use.
  - **Planning:** each project has a status (idea, planning, building, done, paused), a to-do
    list, links (CAD model, guides, shops) and pictures. Add pictures with a button, by dropping
    them on the page or by pasting with Ctrl+V.
  - **Settings:** language (English/Swedish), theme, a data check, a snapshot rebuild and
    installation of the agent skill.
- **A desktop window** (`node inv.mjs desktop`): the same app in a window of its own, started
  from the Start menu like any program. No new dependencies, because it uses Edge (or Chrome) in app mode.
- **`overview.html`**, a read-only snapshot of the same app that you can open without a server.
- **A Claude Code skill**, so agents in *any* project folder can check your stock.

## The app

```sh
node inv.mjs app              # opens http://localhost:4310
node inv.mjs app --port 5000 --no-open
```

The app writes straight to the YAML files, so you and your agents share one source of truth.
- **When an agent changes a file while the app is open**, the app reloads by itself.
- **When you save over a file that changed since you loaded it**, the app refuses and asks you to
  check and save again.
- **The server listens on `127.0.0.1` only.** It accepts JSON writes from its own page and
  nothing else.

Shortcuts: `/` search, `N` new item, `Ctrl+Enter` save, `Esc` close.

### As a desktop app (Windows)

```sh
node inv.mjs install-desktop          # adds "Maker Inventory" to the Start menu
node inv.mjs install-desktop --remove
node inv.mjs desktop                  # opens the window directly
```

The shortcut starts the server without a console window and opens the app in Edge's app mode,
with its own window and taskbar icon and no tabs or address bar. Right-click it in the Start menu to pin it
to the taskbar. When you close the window, the server stops too. If `node inv.mjs app` is already
running, the window uses that server and leaves it running. The window has its own browser profile, so it
remembers its size and position, in `%LOCALAPPDATA%maker-inventory` (with the icon and a
`desktop.log` for errors). You can also install it from **Settings → Desktop app**.

When the app saves, it rewrites the YAML file in a consistent layout. The comment block at the
top of each file is kept. Comments between items are not.

## Setup

Requires Node.js 18+.

```sh
git clone https://github.com/AlbinOdelstav/maker-inventory.git
cd maker-inventory
npm install
node inv.mjs init            # creates inventory/ and projects/ (git-ignored, your data)
node inv.mjs install-skill   # optional: Claude Code skill in ~/.claude/skills/inventory
```

Your data stays out of git: `inventory/`, `projects/`, `overview.html` and `CLAUDE.local.md`
are in `.gitignore`. To keep your data somewhere else (a private repo or a synced folder), set
`MAKER_INVENTORY_DIR` to that folder before running `init` and `install-skill`.

## Commands

```sh
node inv.mjs app                  # web app: browse, add, edit, delete
node inv.mjs desktop              # the app in its own window (server stops when it closes)
node inv.mjs install-desktop      # Start menu shortcut for that window (Windows; --remove to undo)
node inv.mjs check <project>      # have / short / missing + shopping list (markdown)
node inv.mjs check <project> --json
node inv.mjs find petg red        # search; all words must match
node inv.mjs list filament        # by file or category
node inv.mjs low                  # below min_qty + unverified items
node inv.mjs adjust uno +2         # stock change: bought +n, used up -n (same safe write as the app)
node inv.mjs validate             # after every change (also rebuilds overview.html)
node inv.mjs html                 # rebuild overview.html only
node inv.mjs cad                  # CAD dimension links: linked, broken, missing
```

`<project>` is a file in `projects/` (with or without `.yaml`), an example name such as
`plant-watering`, or a path.

## Layout

```
inventory/           your stock, one file per kind (created by init, git-ignored)
  filament.yaml      one row per material + color + finish + brand, qty in grams
  electronics.yaml   mcu, drivers, motors, servos, sensors, modules, power
  hardware.yaml      screws, nuts, inserts, magnets, springs, bearings
  consumables.yaml   wire, dupont, heat-shrink, glue, solder ...
  tools.yaml         printer, soldering iron, multimeter ...
projects/            what each project needs (git-ignored)
templates/inventory/ empty files with schema comments (copied by init)
examples/projects/   example project file
skill/SKILL.md       Claude Code skill template (installed by install-skill)
inv.mjs              the CLI
lib.mjs              shared logic: loading, matching, checks, validation, safe writes
server.mjs           the local web app server (JSON API on 127.0.0.1)
desktop.mjs          desktop window launcher and Start menu shortcut
html.mjs, web/       the app page (vanilla JS/CSS, no build step), live or as a snapshot
test/smoke.mjs       npm test
```

## Item schema

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | kebab-case, unique, never changes (projects refer to it) |
| `name` | yes | as specific as possible; the variant matters |
| `qty` | yes | count, or grams for filament |
| `unit` | – | `pcs` (default), `g` (default for filament), `m`, `ml`, `pack` |
| `category` | recommended | see the comment at the top of each template |
| `material`, `color`, `finish`, `brand` | filament | color as a name or `#hex` |
| `tags` | recommended | keywords: voltage, protocol, form factor (`5v`, `i2c`, `micro-servo`) |
| `specs` | – | free key/value, e.g. `{ thread: M3, length: 12 }` |
| `cad_component` | – | id of a file in the CAD component library (see below), e.g. `arduino-uno-r3` |
| `min_qty` | – | warning threshold for `low` and the overview |
| `location` | – | where it is |
| `in_use` | – | built into a project (counts as owned, but flagged) |
| `verified` | – | `false` = not checked in the drawer yet |
| `source`, `notes` | – | free text |

## CAD dimensions

If you design enclosures around bought parts, you can keep a library of their dimensions: one YAML
file per part type, where every dimension has a value, a source and an uncertainty. The inventory
does not copy those numbers. An item only links to its file with `cad_component: <id>`, and the
app shows the dimensions read-only on the item.

- The library folder is looked up in this order:
  1. the `MAKER_CAD_LIBRARY` environment variable,
  2. a `cad_library: <path>` line in `~/.cadkit/config.yaml`,
  3. the newest installed cadkit plugin,
     `~/.claude/plugins/cache/cadkit/cadkit/<version>/skills/cad-validation/cadkit/library/components/`,
  4. the old pre-plugin location `~/.claude/skills/cad-validation/cadkit/library/components/`.
- A file is `<id>.yaml`:

  ```yaml
  name: Arduino Uno R3
  inventory_ids: [arduino-uno]       # items that should link here
  frame: "Origin = board corner by the USB jack, X along the long edge"   # what x/y/z mean
  unit: mm                           # default
  sources:
    eagle: { title: "Official board file", url: "https://example.com/board.brd", read: 2026-11-23 }
  groups: { pcb: { en: Circuit board, sv: Kretskort } }
  dims:
    pcb_l: { v: 68.58, src: DRAWING, unc: 0.2, ref: eagle, note: "board outline",
             label: { en: Length, sv: Längd }, group: pcb }
    usb_h: { v: 11.0, src: COMMUNITY, unc: 0.6, url: "https://example.com/forum-post" }
  confirm: ["hole spacing"]          # what to measure on your own part if a check asks
  ```

  `src` is one of MEASURED, DRAWING, DATASHEET, STEP, DISTRIBUTOR, COMMUNITY, SCALED or ASSUMED.
  It says what kind of source a value has; `ref` (a key in `sources`) or `url` says which one.
  The app links to it, and marks values that are not MEASURED and have no source to check.
  A source can also be a plain string; a link inside it is found. Only http(s) links are shown.
  `label` and `group` (a string, or `{ en, sv }`) are what the app shows. Without them it reads
  script-style names itself: `pcb_l` is "Circuit board → Length", `h1_x` is "Hole 1 → X position",
  `usb_x0` is "USB jack → Starts at X". Other keys in the file are kept for CAD tools and ignored.
- `node inv.mjs cad` lists linked items, broken links, and electronics/hardware items with no
  CAD dimensions yet. `validate` warns about broken links and about library files that list an
  item which doesn't link back. In the app, see **Settings → CAD library** and the
  **No CAD dimensions** tab under Needs attention.

## Project file

```yaml
name: Automatic plant watering
needs:
  - name: Microcontroller
    match: { category: mcu, tags: [5v] }   # any matching item
    qty: 1
  - id: sg90-servo                          # exactly this item
    qty: 2
    optional: true
  - name: Enclosure
    match: { material: PETG, color: green }
    qty: 180
    unit: g
    buy: { where: local shop, est_price: 20 USD }
```

Planning fields are optional:

```yaml
status: building          # idea | planning | building | done | paused
todos:
  - { text: Print the enclosure, done: true }
  - { text: Solder the pump driver }
links:
  - { title: CAD model, url: https://example.com/model }
images:
  - { file: media/plant-watering/20261121193000.jpg, caption: First test fit }
```

Pictures are stored in `projects/media/<project>/` (git-ignored with the rest of `projects/`).
The app adds and removes them; deleting a project deletes its pictures. Saving a project
without these fields keeps the ones already in the file.

`match` keys: `category`, `material`, `color`, `finish`, `brand` and `file` must be equal.
With `tags`, the item must have all of them. `text` is a substring of the name or id. With
`specs`, each spec must be equal. `check` never counts the same item for two needs.

You rarely need to write this by hand. The app's project editor writes the same format, with
Swedish or English input stored as canonical values.

## Workflow with an agent

1. **New idea.** The agent writes `projects/<name>.yaml` from the design, BOM or slicer grams,
   runs `check`, and replies with what you have, what is missing, and a shopping list.
2. **Bought or got something.** Tell the agent ("bought 10× M3×12 and a spool of white PETG").
   It edits the YAML and runs `validate`.
3. **Finished a build or print.** Subtract what was used (filament grams, screws), or set `in_use`.
4. **Unverified items.** Check items with `verified: false` in the drawer, then set them to
   `true` or remove them.

## License

MIT
