import { useTheme } from "../context/ThemeContext";
import { COLOR_THEMES, VISUAL_MODES } from "../themes/themes";

export default function ThemeSettingsSection() {
  const { settings, setColor, setVisual, setCustomHex, resetTheme } = useTheme();

  return (
    <div className="setup-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Theme Settings</h2>
          <p className="muted" style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
            Brand color applies everywhere. Visual mode restyles the whole app.
          </p>
        </div>
        <button className="btn o" type="button" onClick={resetTheme}>
          Reset to default
        </button>
      </div>

      <h3 style={{ margin: "8px 0 12px" }}>Brand color</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {Object.values(COLOR_THEMES).map((theme) => {
          const active = settings.color === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              className="card"
              onClick={() => setColor(theme.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                padding: 14,
                border: active ? `2px solid ${theme.primary}` : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: theme.primary }} />
                <span style={{ width: 28, height: 28, borderRadius: 8, background: theme.primaryHover }} />
                <span style={{ width: 28, height: 28, borderRadius: 8, background: theme.primaryTint }} />
              </div>
              <strong>{theme.label}</strong>
              {active && <span className="bd" style={{ marginLeft: 8 }}>Active</span>}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 14 }}>
        <label htmlFor="custom-hex" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Custom color
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            id="custom-hex"
            type="color"
            value={settings.customHex || "#0a8f4a"}
            onChange={(e) => setCustomHex(e.target.value)}
            style={{ width: 48, height: 36, border: "none", background: "transparent" }}
          />
          <input
            className="input"
            value={settings.customHex || ""}
            placeholder="#0a8f4a"
            onChange={(e) => setCustomHex(e.target.value)}
          />
        </div>
      </div>

      <h3 style={{ margin: "24px 0 12px" }}>Visual style</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {Object.values(VISUAL_MODES).map((mode) => {
          const active = settings.visual === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              className="card"
              onClick={() => setVisual(mode.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                padding: 16,
                border: active ? "2px solid var(--primary)" : "1px solid var(--border)",
              }}
            >
              <strong>{mode.label}</strong>
              {active && <span className="bd" style={{ marginLeft: 8 }}>Active</span>}
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}