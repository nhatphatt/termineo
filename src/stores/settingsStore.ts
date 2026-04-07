import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabPosition = "top" | "bottom" | "left" | "right";
export type CursorStyle = "bar" | "block" | "underline";

export const FONT_OPTIONS = [
  "Cascadia Code",
  "JetBrains Mono",
  "Fira Code",
  "Consolas",
  "Courier New",
  "Monaco",
  "Menlo",
  "Source Code Pro",
  "IBM Plex Mono",
  "Ubuntu Mono",
] as const;

export const SHELL_OPTIONS = [
  { label: "PowerShell", value: "powershell.exe" },
  { label: "CMD", value: "cmd.exe" },
  { label: "Git Bash", value: "C:\\Program Files\\Git\\bin\\bash.exe" },
  { label: "WSL", value: "wsl.exe" },
  { label: "Custom", value: "" },
] as const;

export interface TerminalColors {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
}

export const DEFAULT_COLORS: TerminalColors = {
  background: "#0d1117",
  foreground: "#e6edf3",
  cursor: "#58a6ff",
  selectionBackground: "#264f78",
  black: "#484f58",
  red: "#ff7b72",
  green: "#3fb950",
  yellow: "#d29922",
  blue: "#58a6ff",
  magenta: "#bc8cff",
  cyan: "#39c5cf",
  white: "#b1bac4",
};

export const COLOR_PRESETS: Record<string, TerminalColors> = {
  "GitHub Dark": DEFAULT_COLORS,
  "Monokai": {
    background: "#272822",
    foreground: "#f8f8f2",
    cursor: "#f8f8f0",
    selectionBackground: "#49483e",
    black: "#272822",
    red: "#f92672",
    green: "#a6e22e",
    yellow: "#f4bf75",
    blue: "#66d9ef",
    magenta: "#ae81ff",
    cyan: "#a1efe4",
    white: "#f8f8f2",
  },
  "Dracula": {
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#f8f8f2",
    selectionBackground: "#44475a",
    black: "#21222c",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2",
  },
  "Nord": {
    background: "#2e3440",
    foreground: "#d8dee9",
    cursor: "#d8dee9",
    selectionBackground: "#434c5e",
    black: "#3b4252",
    red: "#bf616a",
    green: "#a3be8c",
    yellow: "#ebcb8b",
    blue: "#81a1c1",
    magenta: "#b48ead",
    cyan: "#88c0d0",
    white: "#e5e9f0",
  },
  "Solarized Dark": {
    background: "#002b36",
    foreground: "#839496",
    cursor: "#839496",
    selectionBackground: "#073642",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
  },
  "One Dark": {
    background: "#282c34",
    foreground: "#abb2bf",
    cursor: "#528bff",
    selectionBackground: "#3e4451",
    black: "#545862",
    red: "#e06c75",
    green: "#98c379",
    yellow: "#e5c07b",
    blue: "#61afef",
    magenta: "#c678dd",
    cyan: "#56b6c2",
    white: "#d7dae0",
  },
  "Catppuccin Mocha": {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    selectionBackground: "#45475a",
    black: "#45475a",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
    magenta: "#f5c2e7",
    cyan: "#94e2d5",
    white: "#bac2de",
  },
};

interface SettingsState {
  fontSize: number;
  fontFamily: string;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  tabPosition: TabPosition;
  terminalColors: TerminalColors;
  shellPath: string;
  opacity: number;
  scrollbackLines: number;
  defaultWorkingDir: string;
  showSettings: boolean;

  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setCursorStyle: (style: CursorStyle) => void;
  setCursorBlink: (blink: boolean) => void;
  setTabPosition: (pos: TabPosition) => void;
  setTerminalColors: (colors: TerminalColors) => void;
  setTerminalColor: <K extends keyof TerminalColors>(key: K, value: string) => void;
  setShellPath: (path: string) => void;
  setOpacity: (opacity: number) => void;
  setScrollbackLines: (lines: number) => void;
  setDefaultWorkingDir: (dir: string) => void;
  setShowSettings: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 14,
      fontFamily: "Cascadia Code",
      cursorStyle: "bar" as CursorStyle,
      cursorBlink: true,
      tabPosition: "top" as TabPosition,
      terminalColors: { ...DEFAULT_COLORS },
      shellPath: "powershell.exe",
      opacity: 100,
      scrollbackLines: 5000,
      defaultWorkingDir: "",
      showSettings: false,

      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),
      setCursorBlink: (cursorBlink) => set({ cursorBlink }),
      setTabPosition: (tabPosition) => set({ tabPosition }),
      setTerminalColors: (terminalColors) => set({ terminalColors }),
      setTerminalColor: (key, value) =>
        set((s) => ({ terminalColors: { ...s.terminalColors, [key]: value } })),
      setShellPath: (shellPath) => set({ shellPath }),
      setOpacity: (opacity) => set({ opacity }),
      setScrollbackLines: (scrollbackLines) => set({ scrollbackLines }),
      setDefaultWorkingDir: (defaultWorkingDir) => set({ defaultWorkingDir }),
      setShowSettings: (showSettings) => set({ showSettings }),
    }),
    { name: "termineo-settings" }
  )
);
