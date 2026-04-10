import { useState, useCallback, useEffect } from "react";
import type { Terminal } from "@xterm/xterm";
import { XTermRenderer } from "./XTermRenderer";
import { usePty } from "../../hooks/usePty";

interface Props {
  sessionId: string;
  visible: boolean;
  focused?: boolean;
  onFocusRequest?: () => void;
}

/**
 * BlockList hosts the xterm instance for a pane and wires it up to the PTY.
 * Block detection will be added later via OSC 133 markers.
 */
export function BlockList({ sessionId, visible, focused, onFocusRequest }: Props) {
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

  // Focus the terminal when this pane becomes the active one
  useEffect(() => {
    if (focused && visible && terminal) {
      const id = requestAnimationFrame(() => terminal.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [focused, visible, terminal]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <XTermRenderer
        onTerminalReady={handleTerminalReady}
        onResize={handleResize}
        onContainerMouseDown={onFocusRequest}
      />
    </div>
  );
}
