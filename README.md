# maker-inventory

A plain-text inventory for makers: filament, Arduino/electronics parts, screws and magnets,
consumables and tools. You keep it in YAML files. AI agents such as Claude Code read and update
those files, and answer **"do I have everything for this idea, and what do I need to buy?"**

- **YAML files you (or an agent) edit.** Easy to diff, work offline, no database.
- **`check`** compares a project's needs with your stock. It shows what you have, what is short
  and what is missing, writes a shopping list, and suggests substitutes you already own.
- **A web app** (`node inv.mjs app`) to browse and edit the inventory yourself: a dashboard,
  sortable tables per section, filament color swatches, a side panel to add, edit and delete
  items, +/- buttons for quick stock changes, and project status with a shopping list.
  It is available in English and Swedish, with light and dark themes.
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
node inv.mjs check <project>      # have / short / missing + shopping list (markdown)
node inv.mjs check <project> --json
node inv.mjs find petg red        # search; all words must match
node inv.mjs list filament        # by file or category
node inv.mjs low                  # below min_qty + unverified items
node inv.mjs validate             # after every change (also rebuilds overview.html)
node inv.mjs html                 # rebuild overview.html only
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
| `min_qty` | – | warning threshold for `low` and the overview |
| `location` | – | where it is |
| `in_use` | – | built into a project (counts as owned, but flagged) |
| `verified` | – | `false` = not checked in the drawer yet |
| `source`, `notes` | – | free text |

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

`match` keys: `category`, `material`, `color`, `finish`, `brand` and `file` must be equal.
With `tags`, the item must have all of them. `text` is a substring of the name or id. With
`specs`, each spec must be equal. `check` never counts the same item for two needs.

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
