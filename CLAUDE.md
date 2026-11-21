# CLAUDE.md – maker-inventory

A maker inventory (filament, electronics, hardware, consumables, tools) kept as YAML and
read/updated by agents. Schema and commands: README.md. Personal notes, if any, are in
`CLAUDE.local.md` (git-ignored).

## Product rule: manual first

Everything an agent can do here must also be doable by hand in the web app: creating, editing and
deleting items and projects, stock changes after a build or purchase, every setting, and every CLI
action (check, validate, snapshot, skill install). Asking an agent is a shortcut, never the only
way. When you add an agent-facing capability, add its UI in the same change.

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
- The user may also edit stock in the web app (`node inv.mjs app`). It writes the same YAML, so
  always re-read a file before editing it rather than relying on an earlier read.
- User data (`inventory/`, `projects/`, `overview.html`, `CLAUDE.local.md`) is git-ignored and
  must never be committed. Tool code lives in `inv.mjs`, `lib.mjs`, `server.mjs`, `html.mjs`,
  `web/`, `templates/` and `skill/`. Run `npm test` after changing it.
- UI strings live in `web/app.js` (`I18N`, English and Swedish). Add every new string to both.
