import { useState, useCallback, useEffect } from "react";
import type { Terminal } from "@xterm/xterm";
import { XTermRenderer } from "./XTermRenderer";
import { usePty } from "../../hooks/usePty";

interface Props {
  sessionId: string;
  visible: boolean;
}

/**
 * BlockList manages the terminal view for a session.
 *
 * Phase 1 approach: Single xterm.js instance per session that receives all PTY output.
 * Block detection (splitting output into command blocks) will be layered on top
 * in Phase 1 Week 2 using OSC 133 markers or prompt heuristics.
 *
 * For now, this is a full-screen terminal that connects to the PTY backend.
 */
export function BlockList({ sessionId, visible }: Props) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [fitFn, setFitFn] = useState<(() => void) | null>(null);
  const { resize } = usePty(sessionId, terminal);

  const handleTerminalReady = useCallback(
    (term: Terminal, fit: () => void) => {
      setTerminal(term);
      setFitFn(() => fit);
    },
    []
  );

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      resize(cols, rows);
    },
    [resize]
  );

  // Re-fit when tab becomes visible
  useEffect(() => {
    if (visible && fitFn) {
      // Small delay to let layout settle after display change
      const id = requestAnimationFrame(() => fitFn());
      return () => cancelAnimationFrame(id);
    }
  }, [visible, fitFn]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <XTermRenderer
        onTerminalReady={handleTerminalReady}
        onResize={handleResize}
      />
    </div>
  );
}
