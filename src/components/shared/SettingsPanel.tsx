import { useEffect, useState } from "react";
import {
  useSettingsStore,
  COLOR_PRESETS,
  FONT_OPTIONS,
  type TerminalColors,
  type CursorStyle,
} from "../../stores/settingsStore";
import { setWindowOpacity, getAvailableShells, selectDirectory } from "../../lib/ipc";

const COLOR_LABELS: Record<keyof TerminalColors, string> = {
  background: "Background",
  foreground: "Text",
  cursor: "Cursor",
  selectionBackground: "Selection",
  black: "Black",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
  magenta: "Magenta",
  cyan: "Cyan",
  white: "White",
};

const CURSOR_OPTIONS: { value: CursorStyle; label: string }[] = [
  { value: "bar", label: "│ Bar" },
  { value: "block", label: "█ Block" },
  { value: "underline", label: "▁ Underline" },
];

export function SettingsPanel() {
  const showSettings = useSettingsStore((s) => s.showSettings);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const cursorStyle = useSettingsStore((s) => s.cursorStyle);
  const setCursorStyle = useSettingsStore((s) => s.setCursorStyle);
  const cursorBlink = useSettingsStore((s) => s.cursorBlink);
  const setCursorBlink = useSettingsStore((s) => s.setCursorBlink);
  const shellPath = useSettingsStore((s) => s.shellPath);
  const setShellPath = useSettingsStore((s) => s.setShellPath);
  const opacity = useSettingsStore((s) => s.opacity);
  const setOpacity = useSettingsStore((s) => s.setOpacity);
  const scrollbackLines = useSettingsStore((s) => s.scrollbackLines);
  const setScrollbackLines = useSettingsStore((s) => s.setScrollbackLines);
  const defaultWorkingDir = useSettingsStore((s) => s.defaultWorkingDir);
  const setDefaultWorkingDir = useSettingsStore((s) => s.setDefaultWorkingDir);
  const colors = useSettingsStore((s) => s.terminalColors);
  const setTerminalColors = useSettingsStore((s) => s.setTerminalColors);
  const setTerminalColor = useSettingsStore((s) => s.setTerminalColor);

  const [shells, setShells] = useState<{ label: string; path: string }[]>([]);
  const [customShell, setCustomShell] = useState("");

  // Detect available shells on mount
  useEffect(() => {
    if (showSettings) {
      getAvailableShells().then(setShells).catch(() => {});
    }
  }, [showSettings]);

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    setWindowOpacity(val).catch(() => {});
  };

  const handleSelectDir = async () => {
    const dir = await selectDirectory().catch(() => null);
    if (dir) setDefaultWorkingDir(dir);
  };

  const isKnownShell = shells.some((s) => s.path === shellPath);

  return (
    <div className={`settings-sidebar ${showSettings ? "settings-open" : "settings-closed"}`}>
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
      </div>

      <div className="settings-body">

        {/* ── Font ── */}
        <section className="settings-section">
          <h3>Font</h3>
          <div className="setting-row">
            <label className="setting-label">Family</label>
            <select
              className="setting-select"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <label className="setting-label">Size</label>
            <div className="stepper">
              <button onClick={() => setFontSize(Math.max(8, fontSize - 1))}>−</button>
              <span className="stepper-value">{fontSize}px</span>
              <button onClick={() => setFontSize(Math.min(32, fontSize + 1))}>+</button>
            </div>
          </div>
        </section>

        {/* ── Cursor ── */}
        <section className="settings-section">
          <h3>Cursor</h3>
          <div className="setting-row">
            <label className="setting-label">Style</label>
            <div className="btn-group">
              {CURSOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`btn-option ${cursorStyle === opt.value ? "btn-option-active" : ""}`}
                  onClick={() => setCursorStyle(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <label className="setting-label">Blink</label>
            <button
              className={`toggle ${cursorBlink ? "toggle-on" : ""}`}
              onClick={() => setCursorBlink(!cursorBlink)}
            >
              <div className="toggle-knob" />
            </button>
          </div>
        </section>

        {/* ── Shell ── */}
        <section className="settings-section">
          <h3>Shell</h3>
          <div className="setting-row">
            <label className="setting-label">Program</label>
            <select
              className="setting-select"
              value={isKnownShell ? shellPath : "__custom__"}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setShellPath(customShell);
                } else {
                  setShellPath(e.target.value);
                }
              }}
            >
              {shells.map((s) => (
                <option key={s.path} value={s.path}>{s.label}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
          </div>
          {!isKnownShell && (
            <div className="setting-row">
              <label className="setting-label">Path</label>
              <input
                type="text"
                className="setting-input"
                value={shellPath}
                placeholder="C:\\path\\to\\shell.exe"
                onChange={(e) => {
                  setCustomShell(e.target.value);
                  setShellPath(e.target.value);
                }}
              />
            </div>
          )}
        </section>

        {/* ── Window Opacity ── */}
        <section className="settings-section">
          <h3>Window Opacity</h3>
          <div className="setting-row">
            <input
              type="range"
              className="setting-range"
              min={30}
              max={100}
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
            />
            <span className="range-value">{opacity}%</span>
          </div>
        </section>

        {/* ── Scrollback ── */}
        <section className="settings-section">
          <h3>Scrollback Lines</h3>
          <div className="setting-row">
            <input
              type="range"
              className="setting-range"
              min={100}
              max={50000}
              step={100}
              value={scrollbackLines}
              onChange={(e) => setScrollbackLines(Number(e.target.value))}
            />
            <span className="range-value">{scrollbackLines.toLocaleString()}</span>
          </div>
        </section>

        {/* ── Default Working Directory ── */}
        <section className="settings-section">
          <h3>Default Working Directory</h3>
          <div className="setting-row">
            <input
              type="text"
              className="setting-input setting-input-wide"
              value={defaultWorkingDir}
              placeholder="(home directory)"
              onChange={(e) => setDefaultWorkingDir(e.target.value)}
            />
            <button className="btn-browse" onClick={handleSelectDir}>Browse</button>
          </div>
        </section>

        {/* ── Color Presets ── */}
        <section className="settings-section">
          <h3>Color Theme</h3>
          <div className="preset-grid">
            {Object.entries(COLOR_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                className={`preset-btn ${colors.background === preset.background && colors.foreground === preset.foreground ? "preset-active" : ""}`}
                onClick={() => setTerminalColors({ ...preset })}
              >
                <div className="preset-preview">
                  <div className="preset-colors">
                    {[preset.background, preset.red, preset.green, preset.blue, preset.yellow, preset.magenta].map((c, i) => (
                      <div key={i} className="preset-swatch" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <span className="preset-name">{name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Custom Colors ── */}
        <section className="settings-section">
          <h3>Custom Colors</h3>
          <div className="color-grid">
            {(Object.keys(COLOR_LABELS) as (keyof TerminalColors)[]).map((key) => (
              <label key={key} className="color-item">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setTerminalColor(key, e.target.value)}
                  className="color-input"
                />
                <span className="color-label">{COLOR_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .settings-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 340px;
          z-index: 90;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.2s ease-out;
          box-shadow: -4px 0 24px rgba(0,0,0,0.3);
        }
        .settings-open { transform: translateX(0); }
        .settings-closed { transform: translateX(100%); pointer-events: none; }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .settings-header h2 { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .settings-close {
          background: none; border: none; color: var(--text-secondary);
          font-size: 18px; cursor: pointer; width: 26px; height: 26px;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .settings-close:hover { background: var(--bg-block); color: var(--text-primary); }

        .settings-body {
          padding: 14px 16px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .settings-section h3 {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--text-secondary); margin-bottom: 8px; font-weight: 500;
        }

        .setting-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .setting-label {
          font-size: 12px;
          color: var(--text-secondary);
          min-width: 50px;
          flex-shrink: 0;
        }

        /* Select */
        .setting-select {
          flex: 1;
          background: var(--bg-block);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          padding: 5px 8px;
          outline: none;
          cursor: pointer;
        }
        .setting-select:focus { border-color: var(--accent); }
        .setting-select option { background: var(--bg-secondary); color: var(--text-primary); }

        /* Input */
        .setting-input {
          flex: 1;
          background: var(--bg-block);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          padding: 5px 8px;
          outline: none;
        }
        .setting-input:focus { border-color: var(--accent); }
        .setting-input::placeholder { color: var(--text-secondary); opacity: 0.5; }
        .setting-input-wide { min-width: 0; }

        /* Stepper */
        .stepper { display: flex; align-items: center; gap: 8px; }
        .stepper button {
          width: 26px; height: 26px; border-radius: 6px;
          border: 1px solid var(--border); background: var(--bg-block);
          color: var(--text-primary); font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .stepper button:hover { border-color: var(--accent); }
        .stepper-value { font-size: 12px; color: var(--text-primary); min-width: 36px; text-align: center; }

        /* Button group */
        .btn-group { display: flex; gap: 4px; flex: 1; }
        .btn-option {
          flex: 1; padding: 4px 6px; font-size: 11px; font-family: inherit;
          background: var(--bg-block); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text-secondary); cursor: pointer;
          text-align: center; transition: all 0.12s;
        }
        .btn-option:hover { color: var(--text-primary); border-color: var(--text-secondary); }
        .btn-option-active {
          border-color: var(--accent) !important;
          color: var(--accent) !important;
          background: rgba(88,166,255,0.1);
        }

        /* Toggle */
        .toggle {
          width: 36px; height: 20px; border-radius: 10px;
          background: var(--border); border: none; cursor: pointer;
          position: relative; transition: background 0.15s; flex-shrink: 0;
        }
        .toggle-on { background: var(--accent); }
        .toggle-knob {
          width: 16px; height: 16px; border-radius: 50%;
          background: white; position: absolute; top: 2px; left: 2px;
          transition: transform 0.15s;
        }
        .toggle-on .toggle-knob { transform: translateX(16px); }

        /* Range */
        .setting-range {
          flex: 1; height: 4px; -webkit-appearance: none; appearance: none;
          background: var(--border); border-radius: 2px; outline: none;
        }
        .setting-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: var(--accent); cursor: pointer;
          border: 2px solid var(--bg-secondary);
        }
        .range-value {
          font-size: 11px; color: var(--text-secondary);
          min-width: 48px; text-align: right; flex-shrink: 0;
        }

        /* Browse button */
        .btn-browse {
          padding: 5px 10px; font-size: 11px; font-family: inherit;
          background: var(--bg-block); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text-secondary); cursor: pointer;
          white-space: nowrap; flex-shrink: 0;
        }
        .btn-browse:hover { border-color: var(--accent); color: var(--text-primary); }

        /* Preset Grid */
        .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .preset-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 6px; background: var(--bg-block); border: 2px solid transparent;
          border-radius: 6px; cursor: pointer; transition: all 0.12s;
        }
        .preset-btn:hover { border-color: var(--border); }
        .preset-active { border-color: var(--accent) !important; }
        .preset-preview { width: 100%; }
        .preset-colors { display: flex; gap: 1px; border-radius: 3px; overflow: hidden; }
        .preset-swatch { flex: 1; height: 16px; }
        .preset-name { font-size: 10px; color: var(--text-secondary); font-family: inherit; }
        .preset-active .preset-name { color: var(--accent); }

        /* Color Grid */
        .color-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .color-item { display: flex; align-items: center; gap: 5px; cursor: pointer; }
        .color-input {
          -webkit-appearance: none; appearance: none;
          width: 24px; height: 24px; border: 2px solid var(--border);
          border-radius: 5px; cursor: pointer; padding: 0; background: none; flex-shrink: 0;
        }
        .color-input::-webkit-color-swatch-wrapper { padding: 2px; }
        .color-input::-webkit-color-swatch { border: none; border-radius: 2px; }
        .color-input:hover { border-color: var(--accent); }
        .color-label { font-size: 10px; color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
