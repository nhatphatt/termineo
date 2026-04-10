import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useSettingsStore } from "../../stores/settingsStore";

interface Props {
  onTerminalReady: (terminal: Terminal, fit: () => void) => void;
  onResize?: (cols: number, rows: number) => void;
  onContainerMouseDown?: () => void;
}

export function XTermRenderer({ onTerminalReady, onResize, onContainerMouseDown }: Props) {
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

    // Clickable links — click to open in default browser
    const webLinksAddon = new WebLinksAddon((_event, url) => {
      window.electronAPI?.openExternal(url);
    }, {
      urlRegex: /https?:\/\/[^\s"')\]}>]+/,
    });
    terminal.loadAddon(webLinksAddon);

    // Auto-copy on select (mouse up after selection)
    terminal.onSelectionChange(() => {
      const sel = terminal.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => {});
      }
    });

    // Right-click to paste
    const el = terminal.element;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.readText().then((text) => {
        if (text) terminal.paste(text);
      }).catch(() => {});
    };
    el?.addEventListener("contextmenu", handleContextMenu);

    // Clicking anywhere in the pane focuses the terminal
    const container = containerRef.current;
    const handlePointerDown = () => {
      onContainerMouseDown?.();
      terminal.focus();
    };
    container?.addEventListener("mousedown", handlePointerDown);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      fitAddon.fit();
      onTerminalReady(terminal, doFit);
    });

    const contextMenuCleanup = () => el?.removeEventListener("contextmenu", handleContextMenu);

    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(doFit);
    });
    ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      contextMenuCleanup();
      container?.removeEventListener("mousedown", handlePointerDown);
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
