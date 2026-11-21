// Smoke test: runs the CLI against a throwaway data dir. Run with `npm test`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "inv.mjs");
const dir = mkdtempSync(join(tmpdir(), "maker-inv-"));
const run = (...a) => execFileSync(process.execPath, [CLI, ...a], { env: { ...process.env, MAKER_INVENTORY_DIR: dir }, encoding: "utf8" });

try {
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
  const srv = spawn(process.execPath, [CLI, "app", "--no-open", "--port", "0"], { env: { ...process.env, MAKER_INVENTORY_DIR: dir } });
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
