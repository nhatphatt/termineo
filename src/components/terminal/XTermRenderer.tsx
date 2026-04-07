import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useSettingsStore } from "../../stores/settingsStore";

interface Props {
  onTerminalReady: (terminal: Terminal, fit: () => void) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function XTermRenderer({ onTerminalReady, onResize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const colors = useSettingsStore((s) => s.terminalColors);
  const cursorStyle = useSettingsStore((s) => s.cursorStyle);
  const cursorBlink = useSettingsStore((s) => s.cursorBlink);
  const scrollbackLines = useSettingsStore((s) => s.scrollbackLines);

  const doFit = useCallback(() => {
    const fit = fitAddonRef.current;
    const term = terminalRef.current;
    if (!fit || !term) return;
    try {
      fit.fit();
      onResizeRef.current?.(term.cols, term.rows);
    } catch {
      // not visible yet
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize,
      fontFamily: `${fontFamily}, monospace`,
      theme: { ...colors },
      cursorBlink,
      cursorStyle,
      scrollback: scrollbackLines,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      fitAddon.fit();
      onTerminalReady(terminal, doFit);
    });

    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(doFit);
    });
    ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-update colors
  useEffect(() => {
    const term = terminalRef.current;
    if (term) term.options.theme = { ...colors };
  }, [colors]);

  // Live-update font
  useEffect(() => {
    const term = terminalRef.current;
    if (term) {
      term.options.fontSize = fontSize;
      term.options.fontFamily = `${fontFamily}, monospace`;
      doFit();
    }
  }, [fontSize, fontFamily, doFit]);

  // Live-update cursor
  useEffect(() => {
    const term = terminalRef.current;
    if (term) {
      term.options.cursorStyle = cursorStyle;
      term.options.cursorBlink = cursorBlink;
    }
  }, [cursorStyle, cursorBlink]);

  // Live-update scrollback
  useEffect(() => {
    const term = terminalRef.current;
    if (term) term.options.scrollback = scrollbackLines;
  }, [scrollbackLines]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 200, padding: "8px 0 0 10px" }}
    />
  );
}
