// Shared vocabulary. Values are STORED in canonical form (the key, English) and SHOWN in the
// user's language. `aliases` lets input in any language (and old data) map to the key.
// Used by lib.mjs (matching, saving) and injected into the web app by html.mjs.

export const VOCAB = {
  colors: {
    black: { en: "black", sv: "svart", hex: "#1b1b1b" },
    white: { en: "white", sv: "vit", hex: "#f4f4f2" },
    gray: { en: "gray", sv: "grå", hex: "#8c8c8c", aliases: ["grey"] },
    silver: { en: "silver", sv: "silver", hex: "#c0c4c8" },
    red: { en: "red", sv: "röd", hex: "#d0352b" },
    blue: { en: "blue", sv: "blå", hex: "#2f63c9" },
    "light blue": { en: "light blue", sv: "ljusblå", hex: "#7fb6e8" },
    "dark blue": { en: "dark blue", sv: "mörkblå", hex: "#1f3a7a" },
    green: { en: "green", sv: "grön", hex: "#3a9a4c" },
    "light green": { en: "light green", sv: "ljusgrön", hex: "#8fd17a" },
    yellow: { en: "yellow", sv: "gul", hex: "#f2c62e" },
    orange: { en: "orange", sv: "orange", hex: "#ef8424" },
    purple: { en: "purple", sv: "lila", hex: "#7f4cc4" },
    pink: { en: "pink", sv: "rosa", hex: "#ec86ad" },
    brown: { en: "brown", sv: "brun", hex: "#7a4e2d" },
    beige: { en: "beige", sv: "beige", hex: "#d9c6a2" },
    gold: { en: "gold", sv: "guld", hex: "#c9a43c" },
    natural: { en: "natural", sv: "natur", hex: "#e9e2cf" },
    teal: { en: "teal", sv: "turkos", hex: "#2bb3b1", aliases: ["cyan"] },
    magenta: { en: "magenta", sv: "magenta", hex: "#c62f8e" },
    transparent: { en: "transparent", sv: "genomskinlig", hex: "transparent", aliases: ["clear", "transparant"] },
  },
  finishes: {
    basic: { en: "basic", sv: "bas" },
    matte: { en: "matte", sv: "matt" },
    silk: { en: "silk", sv: "silke" },
    translucent: { en: "translucent", sv: "halvgenomskinlig" },
    glow: { en: "glow in the dark", sv: "självlysande" },
    metallic: { en: "metallic", sv: "metallic" },
    marble: { en: "marble", sv: "marmor" },
    sparkle: { en: "sparkle", sv: "glitter" },
  },
  categories: {
    electronics: {
      mcu: { en: "microcontroller", sv: "mikrokontroller" }, driver: { en: "driver", sv: "drivkrets" },
      motor: { en: "motor", sv: "motor" }, servo: { en: "servo", sv: "servo" }, sensor: { en: "sensor", sv: "sensor" },
      display: { en: "display", sv: "display" }, power: { en: "power", sv: "ström" }, module: { en: "module", sv: "modul" },
      passive: { en: "passive", sv: "passiv komponent" }, connector: { en: "connector", sv: "kontakt" }, other: { en: "other", sv: "övrigt" },
    },
    hardware: {
      screw: { en: "screw", sv: "skruv" }, nut: { en: "nut", sv: "mutter" }, insert: { en: "heat-set insert", sv: "insatsmutter" },
      washer: { en: "washer", sv: "bricka" }, magnet: { en: "magnet", sv: "magnet" }, spring: { en: "spring", sv: "fjäder" },
      bearing: { en: "bearing", sv: "kullager" }, shaft: { en: "shaft", sv: "axel" }, other: { en: "other", sv: "övrigt" },
    },
    consumables: {
      wire: { en: "wire", sv: "kabel" }, cable: { en: "cable", sv: "sladd" }, "heat-shrink": { en: "heat-shrink", sv: "krympslang" },
      solder: { en: "solder", sv: "lödtenn" }, glue: { en: "glue", sv: "lim" }, tape: { en: "tape", sv: "tejp" },
      battery: { en: "battery", sv: "batteri" }, other: { en: "other", sv: "övrigt" },
    },
    tools: {
      printer: { en: "3D printer", sv: "3D-skrivare" }, soldering: { en: "soldering", sv: "lödning" }, measuring: { en: "measuring", sv: "mätning" },
      "hand-tool": { en: "hand tool", sv: "handverktyg" }, "power-tool": { en: "power tool", sv: "elverktyg" }, other: { en: "other", sv: "övrigt" },
    },
  },
  units: {
    pcs: { en: "pcs", sv: "st" }, g: { en: "g", sv: "g" }, m: { en: "m", sv: "m" }, ml: { en: "ml", sv: "ml" }, pack: { en: "pack", sv: "förp" },
  },
  specKeys: {
    voltage: { en: "voltage", sv: "spänning" }, io_voltage: { en: "I/O voltage", sv: "I/O-spänning" }, current: { en: "current", sv: "ström" },
    max_current: { en: "max current", sv: "maxström" }, torque: { en: "torque", sv: "vridmoment" }, channels: { en: "channels", sv: "kanaler" },
    interface: { en: "interface", sv: "gränssnitt" }, pins: { en: "pins", sv: "pinnar" }, shaft: { en: "shaft", sv: "axel" },
    thread: { en: "thread", sv: "gänga" }, length: { en: "length", sv: "längd" }, head: { en: "head", sv: "huvud" },
    d: { en: "diameter", sv: "diameter" }, h: { en: "height", sv: "höjd" }, grade: { en: "grade", sv: "klass" },
    wire: { en: "wire", sv: "tråd" }, od: { en: "outer diameter", sv: "ytterdiameter" }, free_length: { en: "free length", sv: "fri längd" },
    solid_length: { en: "solid length", sv: "blocklängd" }, k_est: { en: "spring rate (est.)", sv: "fjäderkonstant (uppsk.)" },
    diameter: { en: "diameter", sv: "diameter" }, build_volume: { en: "build volume", sv: "byggvolym" }, nozzle: { en: "nozzle", sv: "munstycke" },
  },
};

const n = (s) => String(s ?? "").trim().toLowerCase();

// Map any spelling (key, English or Swedish label, alias) to the canonical key, or null.
export function canon(table, value) {
  const v = n(value);
  if (!v) return null;
  for (const [key, e] of Object.entries(table)) {
    if (n(key) === v || n(e.en) === v || n(e.sv) === v || (e.aliases ?? []).some((a) => n(a) === v)) return key;
  }
  return null;
}
export const allCategories = () => Object.assign({}, ...Object.values(VOCAB.categories));
