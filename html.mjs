// Builds the app page. Live mode (served by server.mjs) loads data from the API;
// snapshot mode (overview.html) embeds the data and is read-only. Never edit overview.html by hand.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";
import { VOCAB } from "./vocab.mjs";

// Make JSON safe inside <script>: escape "<" and the two line separators JS strings can't hold.
const BS = String.fromCharCode(92);
const safeJson = (v) => JSON.stringify(v).split("<").join(BS + "u003c")
  .split(String.fromCharCode(0x2028)).join(BS + "u2028").split(String.fromCharCode(0x2029)).join(BS + "u2029");

// Read the page assets once, when the server (or CLI) starts, so the page always matches the
// server code that is running. Reading them per request mixed new app.js with an old server
// (e.g. an empty color list). After updating the tool, restart `node inv.mjs app`.
const css = readFileSync(join(ROOT, "web", "app.css"), "utf8");
const js = readFileSync(join(ROOT, "web", "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");

export function renderApp({ live = false, snapshot = null } = {}) {
  const boot = live ? { mode: "live", data: { items: [], projects: [] } } : { mode: "snapshot", data: snapshot ?? { items: [], projects: [] } };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>maker-inventory</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#4f46e5"/><path d="M19 9l-7-4-7 4 7 4 7-4zM5 9v6l7 4 7-4V9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>')}">
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>window.__BOOT__ = ${safeJson(boot)}; window.__VOCAB__ = ${safeJson(VOCAB)};</script>
<script>${js}</script>
</body>
</html>`;
}
