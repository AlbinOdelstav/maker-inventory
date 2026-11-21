// Local web app server: `node inv.mjs app`. Listens on 127.0.0.1 only.
// The YAML files stay the source of truth; agents can edit them while the app is open
// (the app notices and reloads, and refuses to overwrite a file that changed under it).
import { createServer } from "node:http";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { DATA, PROJ_DIR, loadInventoryWithVersions, loadProjects, saveItem, deleteItem, ConflictError, InputError } from "./lib.mjs";
import { renderApp } from "./html.mjs";

function state() {
  const { items, versions } = loadInventoryWithVersions();
  return { items, versions, projects: loadProjects(items), version: versionOf(versions), dataDir: DATA, generatedAt: new Date().toISOString() };
}

function versionOf(versions) {
  const h = createHash("sha1").update(JSON.stringify(versions));
  if (existsSync(PROJ_DIR)) for (const f of readdirSync(PROJ_DIR).sort()) h.update(f).update(readFileSync(join(PROJ_DIR, f)));
  return h.digest("hex").slice(0, 12);
}

function refreshSnapshot() {
  try {
    const s = state();
    writeFileSync(join(DATA, "overview.html"), renderApp({ snapshot: { items: s.items, projects: s.projects, generatedAt: s.generatedAt } }));
  } catch { /* the snapshot is a convenience; never fail a save over it */ }
}

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > 1e6) throw new InputError("body too large"); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new InputError("invalid JSON"); }
}

export function startServer({ port = 4310, open = true, host = "127.0.0.1", quiet = false } = {}) {
  const server = createServer(async (req, res) => {
    try {
      // Only answer requests addressed to this machine (blocks DNS-rebinding).
      const hostHeader = (req.headers.host ?? "").replace(/:\d+$/, "");
      if (!["localhost", "127.0.0.1", "[::1]"].includes(hostHeader)) return send(res, 403, { error: "forbidden host" });

      const url = new URL(req.url, "http://localhost");
      const write = !["GET", "HEAD"].includes(req.method);
      if (write) {
        // Writes must be JSON from this origin (a cross-site form or fetch can't do both).
        if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return send(res, 415, { error: "JSON only" });
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: "cross-origin write refused" });
      }

      if (req.method === "GET" && url.pathname === "/") return send(res, 200, renderApp({ live: true }), "text/html; charset=utf-8");
      if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, state());
      if (req.method === "GET" && url.pathname === "/api/version") {
        const { versions } = loadInventoryWithVersions();
        return send(res, 200, { version: versionOf(versions) });
      }

      const m = url.pathname.match(/^\/api\/items(?:\/([^/]+))?$/);
      if (m) {
        const id = m[1] ? decodeURIComponent(m[1]) : null;
        const body = await readJson(req);
        if (req.method === "POST" && !id) {
          const item = saveItem({ file: body.file, item: body.item, expect: body.expect });
          refreshSnapshot();
          return send(res, 201, { item, state: state() });
        }
        if (req.method === "PUT" && id) {
          const item = saveItem({ originalId: id, file: body.file, item: body.item, expect: body.expect });
          refreshSnapshot();
          return send(res, 200, { item, state: state() });
        }
        if (req.method === "DELETE" && id) {
          deleteItem({ id, expect: body.expect });
          refreshSnapshot();
          return send(res, 200, { state: state() });
        }
      }
      send(res, 404, { error: "not found" });
    } catch (e) {
      if (e instanceof ConflictError) return send(res, 409, { error: e.message });
      if (e instanceof InputError) return send(res, 400, { error: e.message });
      console.error(e);
      send(res, 500, { error: String(e.message ?? e) });
    }
  });

  server.listen(port, host, () => {
    const url = `http://localhost:${server.address().port}`;
    if (!quiet) console.log(`maker-inventory running at ${url}  (data: ${DATA})\nCtrl+C to stop.`);
    if (open) {
      const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
        : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
      spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
    }
  });
  return server;
}
