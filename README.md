# maker-inventory

A plain-text inventory for makers: filament, Arduino/electronics parts, screws and magnets,
consumables and tools. You keep it in YAML files. AI agents such as Claude Code read and update
those files, and answer **"do I have everything for this idea, and what do I need to buy?"**

- **YAML files you (or an agent) edit.** Easy to diff, work offline, no database.
- **`check`** compares a project's needs with your stock. It shows what you have, what is short
  and what is missing, writes a shopping list, and suggests substitutes you already own.
- **`overview.html`**, a visual overview generated from the files. It shows filament as color
  swatches with grams left, cards per part, items that need attention, and project status.
- **A Claude Code skill**, so agents in *any* project folder can check your stock.

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
inv.mjs, html.mjs    the CLI and the overview renderer
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
