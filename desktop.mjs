// Desktop app: `node inv.mjs desktop` opens the web app in its own window (Edge or Chrome in app
// mode: no tabs, no address bar, its own taskbar icon) and stops the server when the window closes.
// `node inv.mjs install-desktop` adds a Start menu shortcut that runs it without a console window.
// No extra dependencies: the window is the browser that ships with Windows.
import { existsSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { ROOT } from "./lib.mjs";

// Per-user app folder, outside the repo and the data folder: browser profile, icon, log.
export const APP_DIR = process.platform === "win32"
  ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "maker-inventory")
  : join(homedir(), ".maker-inventory");
const PROFILE = join(APP_DIR, "window-profile");
const LOG = join(APP_DIR, "desktop.log");
const ICON = join(APP_DIR, "icon.ico");
const ENV_FILE = join(APP_DIR, "desktop.env");
export const SHORTCUT = join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
  "Microsoft", "Windows", "Start Menu", "Programs", "Maker Inventory.lnk");

// The launcher has no console, so anything that goes wrong is written here.
function log(msg) {
  try { mkdirSync(APP_DIR, { recursive: true }); appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`); } catch { /* nowhere left to report */ }
}

function findBrowser() {
  const pf = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const win = [
    ...pf.map((d) => join(d, "Microsoft", "Edge", "Application", "msedge.exe")),
    ...pf.map((d) => join(d, "Google", "Chrome", "Application", "chrome.exe")),
  ];
  const other = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  return (process.platform === "win32" ? win : other).find((p) => existsSync(p));
}

// Is our own server already answering on this port (e.g. `node inv.mjs app` in a terminal)?
async function serverRunning(url) {
  try {
    const r = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(800) });
    return r.ok && typeof (await r.json()).version === "string";
  } catch { return false; }
}

export async function runDesktop({ port = 4310 } = {}) {
  const url = `http://localhost:${port}`;
  const browser = findBrowser();
  if (!browser) { log("no Edge or Chrome found"); console.error("Needs Microsoft Edge or Google Chrome for the window."); process.exit(1); }

  let server = null;
  if (!(await serverRunning(url))) {
    const { startServer } = await import("./server.mjs");
    server = startServer({ port, open: false, quiet: true });
    await new Promise((ok, fail) => { server.once("listening", ok); server.once("error", fail); }).catch((e) => {
      log(`server could not start on port ${port}: ${e.message}`);
      console.error(`Port ${port} is in use by another program.`); process.exit(1);
    });
  }

  // A profile of its own makes the window a separate browser process (so we see when it closes)
  // and keeps its size and position apart from your normal browsing.
  const first = !existsSync(PROFILE);
  const args = [`--app=${url}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check",
    "--disable-background-mode", ...(first ? ["--window-size=1280,860"] : [])];
  const started = Date.now();
  const win = spawn(browser, args, { stdio: "ignore" });
  win.on("error", (e) => { log(`window failed: ${e.message}`); process.exit(1); });
  win.on("exit", () => {
    // Exiting at once means the window opened in an already running copy of the app; that copy
    // owns the server, unless it was this process that started one.
    if (server && Date.now() - started < 3000) { log("window handed off to a running instance; keeping the server"); return; }
    if (server) server.close();
    process.exit(0);
  });
}

// ---------------------------------------------------------------- Start menu shortcut

export function desktopStatus() {
  return { supported: process.platform === "win32", installed: process.platform === "win32" && existsSync(SHORTCUT), path: SHORTCUT };
}

export function installDesktop() {
  if (process.platform !== "win32") throw new Error("The Start menu shortcut is Windows only. Run `node inv.mjs desktop` instead.");
  mkdirSync(APP_DIR, { recursive: true });
  writeFileSync(ICON, iconIco());
  // A shortcut can't set environment variables, so the data/CAD folder overrides go in an env file.
  const env = ["MAKER_INVENTORY_DIR", "MAKER_CAD_LIBRARY"].filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`);
  if (env.length) writeFileSync(ENV_FILE, env.join("\n") + "\n"); else rmSync(ENV_FILE, { force: true });
  // conhost --headless runs node without a console window.
  const args = ["--headless", `"${process.execPath}"`, ...(env.length ? [`"--env-file=${ENV_FILE}"`] : []), `"${join(ROOT, "inv.mjs")}"`, "desktop"].join(" ");
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  const ps = `$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(SHORTCUT)});` +
    `$s.TargetPath = ${q(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "conhost.exe"))};` +
    `$s.Arguments = ${q(args)}; $s.WorkingDirectory = ${q(ROOT)}; $s.IconLocation = ${q(ICON)};` +
    `$s.Description = 'maker-inventory: filament, parts and projects'; $s.Save()`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`could not create the shortcut: ${(r.stderr || r.error?.message || "").trim()}`);
  return SHORTCUT;
}

export function uninstallDesktop() {
  rmSync(SHORTCUT, { force: true });
  return SHORTCUT;
}

// ---------------------------------------------------------------- icon
// The same box-on-indigo mark as the page favicon, drawn at 256 px and wrapped as a PNG in an .ico.

function iconIco(size = 256) {
  const s = size / 24, px = Buffer.alloc(size * size * 4);
  const lines = [[19, 9, 12, 5], [12, 5, 5, 9], [5, 9, 12, 13], [12, 13, 19, 9], [5, 9, 5, 15], [5, 15, 12, 19], [12, 19, 19, 15], [19, 15, 19, 9], [12, 13, 12, 19]]
    .map((l) => l.map((v) => v * s));
  const half = (1.8 * s) / 2, r = 6 * s;
  const segDist = (x, y, [x1, y1, x2, y2]) => {
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x + 0.5, cy = y + 0.5;
    // rounded square: distance outside the corner circles
    const qx = Math.max(r - cx, cx - (size - r), 0), qy = Math.max(r - cy, cy - (size - r), 0);
    const bg = Math.max(0, Math.min(1, r - Math.hypot(qx, qy) + 0.5));
    const fg = Math.max(0, Math.min(1, half - Math.min(...lines.map((l) => segDist(cx, cy, l))) + 0.5));
    const i = (y * size + x) * 4;
    px[i] = Math.round(0x4f + (255 - 0x4f) * fg); px[i + 1] = Math.round(0x46 + (255 - 0x46) * fg); px[i + 2] = Math.round(0xe5 + (255 - 0xe5) * fg);
    px[i + 3] = Math.round(255 * bg);
  }
  const png = pngEncode(size, px);
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4); // ICONDIR: icon, 1 image
  head.writeUInt8(0, 6); head.writeUInt8(0, 7); // 0 = 256 px
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
}

function pngEncode(size, rgba) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
