export const STORAGE_KEY = "unp-demo:theme";

export const DEFAULT_THEME = {
  color: "green",
  visual: "usual",
  customHex: "",
};

export const COLOR_THEMES = {
  green: {
    id: "green",
    label: "Green",
    primary: "#0a8f4a",
    primaryHover: "#087a40",
    primaryTint: "#e6f4ec",
  },
  blue: {
    id: "blue",
    label: "Blue",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primaryTint: "#dbeafe",
  },
  purple: {
    id: "purple",
    label: "Purple",
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    primaryTint: "#ede9fe",
  },
  red: {
    id: "red",
    label: "Red",
    primary: "#dc2626",
    primaryHover: "#b91c1c",
    primaryTint: "#fee2e2",
  },
  teal: {
    id: "teal",
    label: "Teal",
    primary: "#0d9488",
    primaryHover: "#0f766e",
    primaryTint: "#ccfbf1",
  },
  orange: {
    id: "orange",
    label: "Orange",
    primary: "#ea580c",
    primaryHover: "#c2410c",
    primaryTint: "#ffedd5",
  },
  charcoal: {
    id: "charcoal",
    label: "Charcoal",
    primary: "#18181b",
    primaryHover: "#27272a",
    primaryTint: "#e4e4e7",
  },
};

export const VISUAL_MODES = {
  usual: {
    id: "usual",
    label: "Usual",
    description: "Current solid cards and flat UI",
  },
  glass: {
    id: "glass",
    label: "Glassmorphism",
    description: "Frosted glass, blur, translucent panels",
  },
  clay: {
    id: "clay",
    label: "Claymorphism",
    description: "Soft 3D clay, inner shadows, chunky shapes",
  },
};

export function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return "10, 143, 74";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function mix(hex, target, amount) {
  const [r, g, b] = hexToRgb(hex).split(",").map(Number);
  const [tr, tg, tb] = target;
  const toHex = (v) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r + (tr - r) * amount)}${toHex(g + (tg - g) * amount)}${toHex(
    b + (tb - b) * amount
  )}`;
}

export function paletteFromHex(hex) {
  const primary = hex.startsWith("#") ? hex : `#${hex}`;
  return {
    id: "custom",
    label: "Custom",
    primary,
    primaryHover: mix(primary, [0, 0, 0], 0.14),
    primaryTint: mix(primary, [255, 255, 255], 0.86),
  };
}

export function resolvePalette(settings) {
  if (settings.color === "custom" && settings.customHex) {
    return paletteFromHex(settings.customHex);
  }
  return COLOR_THEMES[settings.color] || COLOR_THEMES.green;
}

export function applyCssTheme(settings) {
  const palette = resolvePalette(settings);
  const root = document.documentElement;
  const rgb = hexToRgb(palette.primary);

  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-hover", palette.primaryHover);
  root.style.setProperty("--primary-tint", palette.primaryTint);
  root.style.setProperty("--primary-rgb", rgb);

  // Keep existing --green* names working without rewriting all of app.css
  root.style.setProperty("--green", palette.primary);
  root.style.setProperty("--green-hover", palette.primaryHover);
  root.style.setProperty("--green-tint", palette.primaryTint);

  root.dataset.colorTheme = palette.id;
  root.dataset.visual = settings.visual || "usual";
}

export function loadThemeSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveThemeSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}