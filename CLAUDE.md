# CLAUDE.md – maker-inventory

A maker inventory (filament, electronics, hardware, consumables, tools) kept as YAML and
read/updated by agents. Schema and commands: README.md. Personal notes, if any, are in
`CLAUDE.local.md` (git-ignored).

## Rules for agents

- **The inventory files are the truth.** Never claim the user owns something that is not in
  `inventory/`. Items with `verified: false` are guesses: say so.
- Use `node inv.mjs check <project>` to compare needs instead of counting in your head. It makes
  sure two needs never use the same part.
- **Change stock only when the user says something was bought, used, broken, moved or counted.**
  A shopping list is not a purchase. Run `node inv.mjs validate` after every change. It also
  rebuilds `overview.html`; never edit that file by hand.
- Match on function, not only on name. A relay can be replaced by a MOSFET module, and an L298N
  can drive a small pump. Suggest such substitutes, but label them as substitutes.
- Add new items with the specific variant (voltage, shaft type, thread). Prefer one row too many
  over a merged row that loses the variant.
- Filament: one row per material + color + finish + brand, qty = grams left. Not per spool.
- User data (`inventory/`, `projects/`, `overview.html`, `CLAUDE.local.md`) is git-ignored and
  must never be committed. Tool changes go in `inv.mjs`, `html.mjs`, `templates/`, `skill/`.
