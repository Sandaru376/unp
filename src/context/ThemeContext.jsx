import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  applyCssTheme,
  DEFAULT_THEME,
  loadThemeSettings,
  saveThemeSettings,
} from "../themes/themes";

const ThemeContext = createContext(null);

if (typeof document !== "undefined") {
  applyCssTheme(loadThemeSettings());
}

export function ThemeProvider({ children }) {
  const store = useRef(loadThemeSettings());
  const [settings, setSettings] = useState(store.current);

  useEffect(() => {
    applyCssTheme(store.current);
  }, []);

  const api = useMemo(() => {
    const commit = (next) => {
      store.current = next;
      setSettings(next);
      saveThemeSettings(next);
      applyCssTheme(next);
    };

    return {
      settings,
      setColor: (color, customHex = "") =>
        commit({
          ...store.current,
          color,
          customHex: color === "custom" ? customHex : "",
        }),
      setVisual: (visual) => commit({ ...store.current, visual }),
      setCustomHex: (customHex) =>
        commit({ ...store.current, color: "custom", customHex }),
      resetTheme: () => commit({ ...DEFAULT_THEME }),
    };
  }, [settings]);

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}