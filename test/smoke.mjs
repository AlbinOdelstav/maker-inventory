// Smoke test: runs the CLI against a throwaway data dir. Run with `npm test`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "inv.mjs");
const dir = mkdtempSync(join(tmpdir(), "maker-inv-"));
const cadDir = join(dir, "cadlib");
const ENV = { ...process.env, MAKER_INVENTORY_DIR: dir, MAKER_CAD_LIBRARY: cadDir };
const run = (...a) => execFileSync(process.execPath, [CLI, ...a], { env: ENV, encoding: "utf8" });

try {
  // Alternatives: same thread and closest length first, other threads dropped.
  {
    const { computeCheck } = await import("../lib.mjs");
    const scr = (t, l) => ({ id: `${t}x${l}`, name: `${t}x${l}`, category: "screw", qty: 5, specs: { thread: t, length: l } });
    const inv = [scr("M3", 30), scr("M3", 15), scr("M4", 16), scr("M3", 20), scr("M3", 6), scr("M5", 16)];
    const [row] = computeCheck(inv, { needs: [{ name: "M3x16", match: { category: "screw", specs: { thread: "M3", length: 16 } }, qty: 4 }] });
    assert.deepEqual(row.alternatives.map((a) => a.id), ["M3x15", "M3x20", "M3x6", "M3x30"]);
    assert.deepEqual(row.alternatives[0].diff, [{ key: "length", want: "16", have: "15" }]);
  }

  run("init");
  assert.ok(existsSync(join(dir, "inventory", "filament.yaml")));

  writeFileSync(join(dir, "inventory", "electronics.yaml"), `
- { id: uno, name: Arduino Uno, category: mcu, qty: 1, tags: [5v] }
- { id: l298n, name: L298N, category: driver, qty: 1, tags: [dc-motor], verified: false }
- { id: sg90, name: SG90, category: servo, qty: 1, tags: [micro-servo], in_use: other-build }
`);
  writeFileSync(join(dir, "inventory", "filament.yaml"), `
- { id: petg-black, name: PETG black, material: PETG, color: black, qty: 500 }
`);
  assert.match(run("validate"), /OK: 4 items/);
  assert.ok(existsSync(join(dir, "overview.html")));

  const res = JSON.parse(run("check", "plant-watering", "--json"));
  const by = Object.fromEntries(res.rows.map((r) => [r.need, r]));
  assert.equal(by["Microcontroller"].status, "OK");
  assert.equal(by["Motor driver for the pump"].unverified, true);
  assert.equal(by["Small 5V water pump"].status, "MISSING");
  assert.equal(by["Enclosure in green PETG"].status, "MISSING");
  assert.equal(by["Enclosure in green PETG"].alternatives[0].id, "petg-black");
  assert.equal(by["Servo to turn the nozzle"].from[0].in_use, "other-build");

  // the same item is never allocated to two needs
  writeFileSync(join(dir, "projects", "twice.yaml"), `name: twice\nneeds:\n  - { id: uno, qty: 1 }\n  - { id: uno, qty: 1 }\n`);
  const twice = JSON.parse(run("check", "twice", "--json")).rows.map((r) => r.status);
  assert.deepEqual(twice, ["OK", "MISSING"]);

  // a bad file fails validation
  writeFileSync(join(dir, "inventory", "tools.yaml"), `- { id: Bad Id, qty: -1 }\n`);
  assert.throws(() => run("validate"));

  assert.ok(!readFileSync(join(dir, "overview.html"), "utf8").includes("</script><script>"));
  writeFileSync(join(dir, "inventory", "tools.yaml"), "# header kept\n\n[]\n");

  // web app API (server runs in a child process with the same throwaway data dir)
  const { spawn } = await import("node:child_process");
  const srv = spawn(process.execPath, [CLI, "app", "--no-open", "--port", "0"], { env: ENV });
  const base = await new Promise((ok, fail) => {
    srv.stdout.on("data", (d) => { const m = String(d).match(/http:\/\/localhost:\d+/); if (m) ok(m[0]); });
    srv.on("exit", () => fail(new Error("server exited"))); setTimeout(() => fail(new Error("server timeout")), 5000);
  });
  try {
    const call = (method, path, body, headers = { "content-type": "application/json" }) =>
      fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const st = await (await call("GET", "/api/state")).json();
    assert.equal(st.items.length, 4);
    assert.ok((await (await call("GET", "/")).text()).includes('"mode":"live"'));

    let r = await call("POST", "/api/items", { file: "tools", item: { id: "multimeter", name: "Multimeter", qty: 1, tags: ["measuring"] }, expect: { tools: st.versions.tools } });
    assert.equal(r.status, 201);
    const tools = readFileSync(join(dir, "inventory", "tools.yaml"), "utf8");
    assert.match(tools, /^# header kept/);
    assert.match(tools, /tags: \[ measuring \]/);

    // Swedish input is stored in canonical (English) form, and matching understands both languages
    r = await call("POST", "/api/items", { file: "filament", item: { id: "petg-green", name: "PETG grön", material: "PETG", color: "Grön", finish: "matt", qty: 300 } });
    assert.equal(r.status, 201);
    const fil = readFileSync(join(dir, "inventory", "filament.yaml"), "utf8");
    assert.match(fil, /color: green/); assert.match(fil, /finish: matte/); assert.doesNotMatch(fil, /unit: g/);
    r = await call("POST", "/api/items", { file: "hardware", item: { id: "m3", name: "M3", category: "skruv", qty: 5, unit: "st", specs: { "gänga": "M3" } } });
    assert.match(readFileSync(join(dir, "inventory", "hardware.yaml"), "utf8"), /category: screw\n  qty: 5\n  specs: \{ thread: M3 \}/);
    const green = JSON.parse(run("check", "plant-watering", "--json")).rows.find((x) => x.need === "Enclosure in green PETG");
    assert.equal(green.status, "OK", "green PETG found via canonical color");
    for (const id of ["petg-green", "m3"]) assert.equal((await call("DELETE", "/api/items/" + id, {})).status, 200);

    // projects: create (Swedish input), check, rename, build, delete
    r = await call("POST", "/api/projects", { project: { name: "Lampa v1", notes: "test", needs: [
      { name: "Kort", id: "uno", qty: 1 },
      { name: "Hölje", match: { file: "filament", material: "PETG", color: "svart", tags: [], specs: {} }, qty: 100, unit: "g" },
      { name: "Skruv", match: { category: "skruv", specs: { "gänga": "M3" } }, qty: 4, unit: "st", buy: { where: "", est_price: "" } },
    ] } });
    assert.equal(r.status, 201);
    let pj = await r.json();
    assert.equal(pj.file, "lampa-v1.yaml");
    const ptxt = readFileSync(join(dir, "projects", "lampa-v1.yaml"), "utf8");
    assert.match(ptxt, /color: black/); assert.match(ptxt, /category: screw/); assert.match(ptxt, /thread: M3/); assert.doesNotMatch(ptxt, /buy:/);
    let proj = pj.state.projects.find((p) => p.file === "lampa-v1.yaml");
    assert.deepEqual(proj.rows.map((x) => x.status), ["OK", "OK", "MISSING"]);
    assert.equal(JSON.parse(run("check", "lampa-v1", "--json")).rows[1].status, "OK", "CLI reads app-made projects");
    r = await call("PUT", "/api/projects/lampa-v1.yaml", { project: { name: "Lampa v2", needs: proj.needs }, expect: "stale" });
    assert.equal(r.status, 409);
    r = await call("PUT", "/api/projects/lampa-v1.yaml", { project: { name: "Lampa v2", needs: proj.needs }, expect: proj.version });
    pj = await r.json(); assert.equal(pj.file, "lampa-v2.yaml");
    assert.ok(!existsSync(join(dir, "projects", "lampa-v1.yaml")), "renamed file");
    r = await call("POST", "/api/projects", { project: { name: "", needs: [{ name: "x" }] } });
    assert.equal(r.status, 400, "name + need description required");
    r = await call("POST", "/api/stock/adjust", { changes: [{ id: "petg-black", delta: -100 }, { id: "uno", set: { in_use: "Lampa v2" } }] });
    assert.equal(r.status, 200);
    const after = (await r.json()).state.items;
    assert.equal(after.find((i) => i.id === "petg-black").qty, 400);
    assert.equal(after.find((i) => i.id === "uno").in_use, "Lampa v2");
    r = await call("POST", "/api/stock/adjust", { changes: [{ id: "uno", set: { qty: 99 } }] });
    assert.equal(r.status, 400, "adjust can't set arbitrary fields");
    // Planning: status, to-dos, links, pictures.
    let p2 = pj.state.projects.find((p) => p.file === "lampa-v2.yaml");
    r = await call("PUT", "/api/projects/lampa-v2.yaml", { project: { name: p2.name, needs: p2.needs, status: "building",
      todos: [{ text: "Print the base" }, { text: "Solder", done: true }, { text: " " }], links: [{ title: "CAD", url: "https://example.com/cad" }] }, expect: p2.version });
    assert.equal(r.status, 200);
    p2 = (await r.json()).state.projects.find((p) => p.file === "lampa-v2.yaml");
    assert.equal(p2.status, "building");
    assert.deepEqual(p2.todos, [{ text: "Print the base" }, { text: "Solder", done: true }], "empty to-dos dropped");
    r = await call("PUT", "/api/projects/lampa-v2.yaml", { project: { name: p2.name, needs: p2.needs }, expect: p2.version });
    p2 = (await r.json()).state.projects.find((p) => p.file === "lampa-v2.yaml");
    assert.equal(p2.todos.length, 2, "saving needs alone keeps the to-dos");
    assert.equal(p2.links[0].url, "https://example.com/cad");
    r = await call("PUT", "/api/projects/lampa-v2.yaml", { project: { name: p2.name, needs: p2.needs, links: [{ url: "javascript:alert(1)" }] }, expect: p2.version });
    assert.equal(r.status, 400, "only http(s) links");
    r = await call("PUT", "/api/projects/lampa-v2.yaml", { project: { name: p2.name, needs: p2.needs, status: "someday" }, expect: p2.version });
    assert.equal(r.status, 400, "known statuses only");
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    r = await call("POST", "/api/projects/lampa-v2.yaml/images", { data: png, caption: "first", expect: p2.version });
    assert.equal(r.status, 201);
    const up = await r.json();
    assert.match(up.image, /^media\/lampa-v2\/\d{14}\.png$/);
    p2 = up.state.projects.find((p) => p.file === "lampa-v2.yaml");
    assert.deepEqual(p2.images, [{ file: up.image, caption: "first" }]);
    r = await fetch(base + "/projects/" + up.image);
    assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal((await fetch(base + "/projects/media/..%2F..%2Finventory%2Ftools.yaml")).status, 400, "no traversal via media");
    r = await call("POST", "/api/projects/lampa-v2.yaml/images", { data: "data:text/html;base64,PGgxPg==", expect: p2.version });
    assert.equal(r.status, 400, "pictures only");
    r = await call("DELETE", "/api/projects/lampa-v2.yaml/images", { image: up.image, expect: p2.version });
    assert.equal(r.status, 200);
    assert.ok(!existsSync(join(dir, "projects", up.image)), "picture file deleted");
    assert.equal((await r.json()).state.projects.find((p) => p.file === "lampa-v2.yaml").images.length, 0);

    // CLI for agents: project overview and project-update (what /sync-project uses).
    assert.match(run("project"), /lampa-v2\.yaml\s+Lampa v2\s+\[building\]/);
    const pj1 = JSON.parse(run("project", "lampa", "--json"));
    assert.deepEqual(pj1.todos.map((x) => [x.n, x.done]), [[1, false], [2, true]]);
    const upd = (json, ...extra) => run("project-update", "lampa", json, ...extra);
    assert.match(upd(JSON.stringify({ todos: { done: [1], add: ["Paint it"] } }), "--dry-run"), /would done: Print the base\nwould add: Paint it/);
    assert.equal(JSON.parse(run("project", "lampa", "--json")).todos.length, 2, "dry run writes nothing");
    const out1 = upd(JSON.stringify({ todos: { done: ["print"], undo: [2], add: ["Paint it", "paint it"], edit: [{ ref: 2, text: "Solder the LEDs" }] },
      links: { add: [{ title: "Guide", url: "https://example.com/guide" }, "https://example.com/cad"] }, status: "done", notes_append: "2026-11-27: white LEDs" }));
    assert.match(out1, /done: Print the base/); assert.match(out1, /add: Paint it/); assert.match(out1, /already listed: paint it/);
    assert.match(out1, /link already there: https:\/\/example.com\/cad/); assert.match(out1, /status: building -> done/);
    const pj2 = JSON.parse(run("project", "lampa", "--json"));
    assert.deepEqual(pj2.todos.map((x) => [x.text, x.done]), [["Print the base", true], ["Solder the LEDs", false], ["Paint it", false]]);
    assert.equal(pj2.links.length, 2); assert.equal(pj2.status, "done"); assert.equal(pj2.notes, "2026-11-27: white LEDs");
    assert.equal(pj2.needs.ok + pj2.needs.short + pj2.needs.missing, proj.needs.length, "needs are kept");
    upd(JSON.stringify({ todos: { remove: ["paint"] }, links: { remove: ["guide"] }, status: "" }));
    const pj3 = JSON.parse(run("project", "lampa", "--json"));
    assert.equal(pj3.todos.length, 2); assert.equal(pj3.links.length, 1); assert.equal(pj3.status, null);
    const fails = (json) => { try { upd(json); return false; } catch { return true; } };
    assert.ok(fails(JSON.stringify({ todos: { done: [9] } })), "unknown to-do number");
    assert.ok(fails(JSON.stringify({ links: { add: ["javascript:alert(1)"] } })), "http(s) links only");
    assert.ok(fails(JSON.stringify({ status: "someday" })), "known statuses only");

    // The sync reminder hook: settings.json is merged, never overwritten, and the hook only speaks
    // for sessions in a project's folder that made progress.
    const home = join(dir, "home");
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settingsFile = join(home, ".claude", "settings.json");
    writeFileSync(settingsFile, JSON.stringify({ model: "x", hooks: { Stop: [{ hooks: [{ type: "command", command: "notify" }] }] } }));
    const runHome = (...a) => execFileSync(process.execPath, [CLI, ...a], { env: { ...ENV, USERPROFILE: home, HOME: home }, encoding: "utf8" });
    runHome("install-hook"); runHome("install-hook");
    let settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(settings.model, "x", "other settings kept");
    assert.deepEqual(settings.hooks.Stop.map((g) => g.hooks[0].command.includes("sync-reminder") ? "ours" : g.hooks[0].command), ["notify", "ours"], "installed once, next to the existing hook");
    assert.ok(existsSync(settingsFile + ".bak-maker-inventory"), "backup written");
    runHome("install-hook", "--remove");
    settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.deepEqual(settings.hooks.Stop.map((g) => g.hooks[0].command), ["notify"], "remove leaves other hooks alone");
    const hookScript = join(dirname(CLI), "hooks", "sync-reminder.mjs");
    const transcript = join(dir, "t.jsonl");
    writeFileSync(transcript, JSON.stringify({ type: "user", message: { content: "köpte lysdioderna idag" } }) + "\n");
    const run1 = Date.now(); // the hook remembers sessions in the temp folder; keep test sessions unique
    const hook = (cwd, sid) => execFileSync(process.execPath, [hookScript], { env: ENV, encoding: "utf8", input: JSON.stringify({ session_id: `${sid}-${run1}`, transcript_path: transcript, cwd }) });
    assert.match(JSON.parse(hook(join(dir, "cad", "lampa-v2", "v3"), "s1")).reason, /sync-project/, "reminds in the project's folder");
    assert.equal(hook(join(dir, "cad", "lampa-v2", "v3"), "s1"), "", "not again within 30 minutes");
    assert.equal(hook(join(dir, "elsewhere"), "s2"), "", "quiet outside project folders");

    r = await call("POST", "/api/projects", { example: true });
    assert.equal((await r.json()).file, "plant-watering.yaml");
    for (const f of ["lampa-v2.yaml", "plant-watering.yaml"]) assert.equal((await call("DELETE", "/api/projects/" + f, {})).status, 200);
    assert.equal((await call("DELETE", "/api/projects/..%2Finventory%2Ftools.yaml", {})).status, 400, "no path traversal");
    assert.equal((await (await call("POST", "/api/admin/validate", {})).json()).errors.length, 0);

    // CAD component links: the inventory only stores the id; dimensions are read from the library.
    mkdirSync(cadDir, { recursive: true });
    writeFileSync(join(cadDir, "uno-r3.yaml"), "id: uno-r3\nname: Uno R3\ninventory_ids: [uno, sg90]\nsources:\n  eagle: \"board file, https://example.com/uno.brd, read 2026-11-23\"\n  ds: {title: Datasheet, url: https://example.com/ds.pdf, read: 2026-11-23}\n  bad: {title: Evil, url: \"javascript:alert(1)\"}\nconfirm: [hole spacing]\nframe: origin at a corner\ngroups: { holes: Fästhål }\ndims:\n  pcb_l: {v: 68.58, src: DRAWING, unc: 0.2, ref: eagle}\n  pcb_t: 1.6\n  hole_d: {v: 3.2, label: {en: Hole diameter, sv: Håldiameter}, group: holes, url: https://example.com/hole}\n");
    writeFileSync(join(cadDir, "broken.yaml"), "dims: [unclosed\n");
    let cs = await (await call("GET", "/api/state")).json();
    const uno = cs.items.find((i) => i.id === "uno");
    r = await call("PUT", "/api/items/uno", { file: "electronics", item: { ...uno, cad_component: "uno-r3" }, expect: { electronics: cs.versions.electronics } });
    assert.equal(r.status, 200);
    cs = (await r.json()).state;
    assert.match(readFileSync(join(dir, "inventory", "electronics.yaml"), "utf8"), /cad_component: uno-r3/);
    assert.deepEqual(cs.cad.components["uno-r3"].dims[0], { name: "pcb_l", v: 68.58, src: "DRAWING", unc: 0.2, ref: "eagle", url: null, note: null, label: null, group: null });
    const srcs = cs.cad.components["uno-r3"].sources;
    assert.equal(srcs.eagle.url, "https://example.com/uno.brd", "a link inside a plain-text source is found");
    assert.deepEqual(srcs.ds, { key: "ds", title: "Datasheet", url: "https://example.com/ds.pdf", read: "2026-11-23" });
    assert.equal(srcs.bad.url, null, "only http(s) links");
    assert.equal(cs.cad.components["uno-r3"].dims[2].url, "https://example.com/hole", "a value can link to its own source");
    assert.equal(cs.cad.components["uno-r3"].dims[1].v, 1.6, "bare numbers are values without a source");
    assert.deepEqual(cs.cad.components["uno-r3"].dims[2].label, { en: "Hole diameter", sv: "Håldiameter" }, "labels pass through in both languages");
    assert.equal(cs.cad.components["uno-r3"].dims[2].group, "holes");
    assert.equal(cs.cad.components["uno-r3"].groups.holes, "Fästhål");
    assert.equal(cs.cad.components["uno-r3"].frame, "origin at a corner");
    assert.ok(cs.cad.components.broken.error, "a bad library file is reported, not fatal");
    assert.ok(cs.admin.cadWarnings.some((w) => /sg90: listed in uno-r3.yaml/.test(w)), "library names an item that does not link back");
    r = await call("PUT", "/api/items/uno", { file: "electronics", item: { ...uno, cad_component: "Not An Id!" }, expect: { electronics: cs.versions.electronics } });
    assert.equal(r.status, 400, "cad_component must look like an id");
    writeFileSync(join(cadDir, "extra.yaml"), "dims: {}\n");
    assert.notEqual((await (await call("GET", "/api/version")).json()).version, cs.version, "library changes reload the page");
    const sgItem = cs.items.find((i) => i.id === "sg90");
    r = await call("PUT", "/api/items/sg90", { file: "electronics", item: { ...sgItem, cad_component: "nope" }, expect: { electronics: cs.versions.electronics } });
    assert.equal(r.status, 200);
    const vout = run("validate");
    assert.match(vout, /OK: /, "broken links are warnings, not errors");
    assert.match(vout, /sg90: cad_component "nope" has no file/);
    const cadOut = run("cad");
    assert.match(cadOut, /uno\s+-> uno-r3 \(3 dims\)/);
    assert.match(cadOut, /## Broken[\s\S]*sg90\s+-> nope/);
    assert.match(cadOut, /## No CAD dimensions yet[\s\S]*l298n/);

    r = await call("POST", "/api/items", { file: "tools", item: { id: "multimeter", name: "dup", qty: 1 } });
    assert.equal(r.status, 400, "duplicate id refused");
    r = await call("PUT", "/api/items/uno", { file: "electronics", item: { id: "uno", name: "Uno", qty: 3 }, expect: { electronics: "stale" } });
    assert.equal(r.status, 409, "stale version refused");
    r = await call("PUT", "/api/items/multimeter", { file: "hardware", item: { id: "multimeter", name: "Multimeter", qty: 2 } });
    assert.equal(r.status, 200, "move between files");
    assert.match(readFileSync(join(dir, "inventory", "hardware.yaml"), "utf8"), /multimeter/);
    assert.doesNotMatch(readFileSync(join(dir, "inventory", "tools.yaml"), "utf8"), /multimeter/);
    r = await call("DELETE", "/api/items/multimeter", {}, { "content-type": "text/plain" });
    assert.equal(r.status, 415, "non-JSON write refused");
    r = await call("DELETE", "/api/items/multimeter", {}, { "content-type": "application/json", origin: "http://evil.example" });
    assert.equal(r.status, 403, "cross-origin write refused");
    r = await call("DELETE", "/api/items/multimeter", {});
    assert.equal(r.status, 200);
    assert.match(run("validate"), /OK: 4 items/);
  } finally { srv.kill(); }
  console.log("smoke test passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
