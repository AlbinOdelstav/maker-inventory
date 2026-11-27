// Desktop app: `node inv.mjs desktop` opens the web app in its own window (Edge or Chrome in app
// mode: no tabs, no address bar, its own taskbar icon) and stops the server when the window closes.
// `node inv.mjs install-desktop` adds a Start menu shortcut that runs it without a console window.
// No extra dependencies: the window is the browser that ships with Windows.
import { existsSync, mkdirSync, writeFileSync, appendFileSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
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
const ENV_FILE = join(APP_DIR, "desktop.env");
const ROAMING = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
export const SHORTCUT = join(ROAMING, "Microsoft", "Windows", "Start Menu", "Programs", "Maker Inventory.lnk");
// A taskbar pin is a copy of the shortcut; it keeps its own icon path, so it is updated too.
const PINNED = join(ROAMING, "Microsoft", "Internet Explorer", "Quick Launch", "User Pinned", "TaskBar", "Maker Inventory.lnk");

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
  // Twice: the window may take a moment to appear, and Edge sets its own ID as it starts.
  if (process.platform === "win32") { setTimeout(() => brandWindow(false), 1200); setTimeout(() => brandWindow(true), 4000); }
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
  const icon = ensureIcon();
  // A shortcut can't set environment variables, so the data/CAD folder overrides go in an env file.
  const env = ["MAKER_INVENTORY_DIR", "MAKER_CAD_LIBRARY"].filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`);
  if (env.length) writeFileSync(ENV_FILE, env.join("\n") + "\n"); else rmSync(ENV_FILE, { force: true });
  const { target, args } = launchCommand();
  const ps = `$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(SHORTCUT)});` +
    `$s.TargetPath = ${q(target)}; $s.Arguments = ${q(args)}; $s.WorkingDirectory = ${q(ROOT)}; $s.IconLocation = ${q(icon)};` +
    `$s.Description = 'maker-inventory: filament, parts and projects'; $s.Save()`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`could not create the shortcut: ${(r.stderr || r.error?.message || "").trim()}`);
  // The shortcut and the window share one taskbar identity (see brandWindow). An existing taskbar pin
  // is a copy of the shortcut with its own icon path and ID, so it is updated too.
  const pinned = existsSync(PINNED) ? `\n$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(PINNED)}); $s.IconLocation = ${q(icon)}; $s.Save(); [void][TaskbarId]::SetLink(${q(PINNED)}, ${q(APP_ID)})` : "";
  shellHelper(`[void][TaskbarId]::SetLink(${q(SHORTCUT)}, ${q(APP_ID)})${pinned}`, true);
  for (const f of readdirSync(APP_DIR)) if (/^icon(-[0-9a-f]+)?\.ico$/.test(f) && join(APP_DIR, f) !== icon) rmSync(join(APP_DIR, f), { force: true });
  rmSync(join(APP_DIR, "window-id.txt"), { force: true }); // from an earlier version
  spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "ie4uinit.exe"), ["-show"], { windowsHide: true });
  return SHORTCUT;
}

// conhost --headless runs node without a console window.
function launchCommand() {
  const target = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "conhost.exe");
  const args = ["--headless", `"${process.execPath}"`, ...(existsSync(ENV_FILE) ? [`"--env-file=${ENV_FILE}"`] : []), `"${join(ROOT, "inv.mjs")}"`, "desktop"].join(" ");
  return { target, args };
}

// Explorer caches icons by file path, so the icon file is named after its content: a changed icon
// gets a new path, otherwise the old (or a blank) picture stays on the Start menu and taskbar.
function ensureIcon() {
  mkdirSync(APP_DIR, { recursive: true });
  const ico = iconIco();
  const path = join(APP_DIR, `icon-${createHash("sha1").update(ico).digest("hex").slice(0, 8)}.ico`);
  if (!existsSync(path)) writeFileSync(path, ico);
  return path;
}

// ---------------------------------------------------------------- taskbar identity
// The window is Edge's, so by default Windows files it under an Edge ID: pinning it pins Edge, and a
// shortcut given that Edge ID shows a blank page icon (Windows looks the icon up as an Edge web app).
// Instead the app has an ID of its own. The Start menu shortcut carries it, and a moment after the
// window opens we put the same ID on the window, together with the command, name and icon Windows
// should use when it is pinned. Then the window counts as Maker Inventory: its name and icon on the
// taskbar, and a pin that starts the app (server and window), not plain Edge.
const APP_ID = "MakerInventory.Desktop";
const TASKBAR_CS = `
using System; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class TaskbarId {
  [StructLayout(LayoutKind.Sequential, Pack = 4)] struct PK { public Guid f; public uint p; }
  [StructLayout(LayoutKind.Explicit)] struct PV { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; [FieldOffset(16)] public IntPtr x; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPS { int GetCount(out uint c); int GetAt(uint i, out PK k); int GetValue(ref PK k, out PV v); int SetValue(ref PK k, ref PV v); int Commit(); }
  [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr h, ref Guid i, [MarshalAs(UnmanagedType.Interface)] out IPS s);
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern int SHGetPropertyStoreFromParsingName(string p, IntPtr b, int f, ref Guid i, [MarshalAs(UnmanagedType.Interface)] out IPS s);
  delegate bool EP(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EP f, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
  static Guid IID = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
  // System.AppUserModel: 2 RelaunchCommand, 3 RelaunchIconResource, 4 RelaunchDisplayNameResource, 5 ID
  static int Put(IPS s, uint key, string val) {
    var k = new PK { f = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), p = key };
    var v = new PV { vt = 31, p = Marshal.StringToCoTaskMemUni(val) };
    int hr = s.SetValue(ref k, ref v); Marshal.FreeCoTaskMem(v.p); return hr;
  }
  public static int Brand(int[] pids, string id, string cmd, string name, string icon) {
    var set = new HashSet<uint>(); foreach (var p in pids) set.Add((uint)p);
    int n = 0;
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (!set.Contains(pid) || !IsWindowVisible(h) || GetWindowTextLength(h) == 0) return true;
      IPS s; if (SHGetPropertyStoreForWindow(h, ref IID, out s) != 0) return true;
      // relaunch properties first: Windows reads them when the ID changes
      if (Put(s, 2, cmd) == 0 && Put(s, 3, icon) == 0 && Put(s, 4, name) == 0 && Put(s, 5, id) == 0) n++;
      return true;
    }, IntPtr.Zero);
    return n;
  }
  public static int SetLink(string path, string id) {
    IPS s; int hr = SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 2, ref IID, out s); if (hr != 0) return hr;
    hr = Put(s, 5, id); if (hr == 0) hr = s.Commit(); return hr;
  }
}`;
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
function shellHelper(cmd, sync = false) {
  const script = `Add-Type -TypeDefinition @'\n${TASKBAR_CS}\n'@\n${cmd}`;
  const args = ["-NoProfile", "-NonInteractive", "-Command", script];
  if (sync) return spawnSync("powershell.exe", args, { encoding: "utf8", windowsHide: true }).stdout?.trim() ?? "";
  return new Promise((ok) => {
    let out = "";
    const p = spawn("powershell.exe", args, { windowsHide: true });
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => ok(out.trim())); p.on("error", () => ok(""));
  });
}
// Put the app's taskbar identity on the window. Quiet unless it fails.
async function brandWindow(last) {
  try {
    const { target, args } = launchCommand();
    const profile = PROFILE.replaceAll("'", "''");
    const out = await shellHelper(
      `$p = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${profile}*' } | ForEach-Object { [int]$_.ProcessId })\n` +
      `[TaskbarId]::Brand($p, ${q(APP_ID)}, ${q(`"${target}" ${args}`)}, 'Maker Inventory', ${q(ensureIcon() + ",0")})`);
    if (Number(out) > 0 || !last) return;
    log(`taskbar identity: no window found (${out || "no output"})`);
  } catch (e) { log(`taskbar identity: ${e.message}`); }
}

export function uninstallDesktop() {
  rmSync(SHORTCUT, { force: true });
  return SHORTCUT;
}

// ---------------------------------------------------------------- icon
// The same box-on-indigo mark as the page favicon, drawn at every size Windows asks for. A lone
// 256 px PNG shows in the Start menu but turns into a blank page on the taskbar, so the small sizes
// are classic 32-bit BMP entries and only 256 px is PNG.

const ICON_SIZES = [16, 20, 24, 32, 40, 48, 64, 256];

function iconIco() {
  const images = ICON_SIZES.map((size) => {
    const px = drawIcon(size);
    return { size, data: size >= 256 ? pngEncode(size, px) : bmpDib(size, px) };
  });
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4); // ICONDIR
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i; // ICONDIRENTRY
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((im) => im.data)]);
}

// A 32-bit icon image: BITMAPINFOHEADER (height doubled for the mask), bottom-up BGRA rows, then an
// all-zero AND mask (the alpha channel already says what is transparent).
function bmpDib(size, rgba) {
  const maskRow = Math.ceil(size / 32) * 4;
  const hdr = Buffer.alloc(40);
  hdr.writeUInt32LE(40, 0); hdr.writeInt32LE(size, 4); hdr.writeInt32LE(size * 2, 8);
  hdr.writeUInt16LE(1, 12); hdr.writeUInt16LE(32, 14); hdr.writeUInt32LE(size * size * 4 + maskRow * size, 20);
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = (y * size + x) * 4, d = ((size - 1 - y) * size + x) * 4;
    px[d] = rgba[s + 2]; px[d + 1] = rgba[s + 1]; px[d + 2] = rgba[s]; px[d + 3] = rgba[s + 3];
  }
  return Buffer.concat([hdr, px, Buffer.alloc(maskRow * size)]);
}

function drawIcon(size) {
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
  return px;
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
