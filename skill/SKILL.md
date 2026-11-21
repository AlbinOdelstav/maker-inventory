---
name: inventory
description: Check the user's home maker inventory (filament by material/color/grams, Arduino and electronics parts, screws/magnets/springs, consumables, tools) against what a project or idea needs, and update it when they buy or use things. Use when they ask "do I have everything for this?", "what do I need to buy?", "do I have X at home?", "can I build this with what I have?", say they bought / used up / broke something, or when a bill of materials is finished and should be checked against stock.
---

# Inventory: do I have it, or do I need to buy it?

Tool: `{{TOOL_DIR}}/inv.mjs` (run with `node`). Data: `{{DATA_DIR}}/inventory/*.yaml`,
projects in `{{DATA_DIR}}/projects/`. Read `{{TOOL_DIR}}/README.md` for the schema.
Answer in the user's language.

## "Do I have everything for this idea?"

1. Turn the idea into **needs**: functions first (what must sense, move, power, hold), then the
   concrete part per function, quantities, voltages, filament material + color + grams (from the
   slicer or a rough volume estimate, +10 %). If a bill of materials exists, use its rows.
2. Write them to `{{DATA_DIR}}/projects/<kebab-name>.yaml`
   (format: `{{TOOL_DIR}}/examples/projects/plant-watering.yaml`).
   Prefer `match:` on category/tags/specs over exact `id:` so substitutes are found.
3. Run `node {{TOOL_DIR}}/inv.mjs check <kebab-name>`, then `node {{TOOL_DIR}}/inv.mjs html`.
4. Answer briefly:
   - what they already have (and which rows rest on `verified: false` or `in_use` items),
   - what is short or missing, as a checkbox shopping list with quantities,
   - **substitutes they already own** (the script lists near matches; also think functionally:
     an L298N instead of a relay for a pump, a TT motor instead of an N20),
   - anything that is a design question rather than a purchase.

## Updating stock

Only when the user says something was bought, used, broken, moved or counted. Edit the YAML
(new item: specific variant, tags, specs; filament: grams, one row per material + color + finish + brand),
set `verified: true` on items they confirm, then run `node {{TOOL_DIR}}/inv.mjs validate`
(it also rebuilds `overview.html`). After a print or build, subtract the filament grams and parts
used, or set `in_use: <project>`.

The user can also edit stock in the web app (`node {{TOOL_DIR}}/inv.mjs app`, http://localhost:4310),
so re-read a YAML file right before you edit it. If they want to look at or edit the inventory
themselves, point them to the app.

## Never

- Claim they own something that is not in the files.
- Change stock because a shopping list was written.
- Merge variants into one row (dual-shaft vs single-shaft motor, PLA basic vs matte).
