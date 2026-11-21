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
  console.log("smoke test passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
