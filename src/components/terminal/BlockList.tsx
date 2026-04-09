import { useState, useCallback, useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";
import { XTermRenderer } from "./XTermRenderer";
import { usePty } from "../../hooks/usePty";
import { useBlocks } from "../../hooks/useBlocks";
import { TerminalBlock } from "./TerminalBlock";

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
  const inputBufferRef = useRef("");
  const { resize } = usePty(sessionId, terminal);
  const { blocks, createBlock, finishBlock } = useBlocks(sessionId);

  const flushCommandHistory = useCallback(() => {
    const command = inputBufferRef.current.trim();
    inputBufferRef.current = "";
    if (!command) return;

    const blockId = createBlock(command);
    finishBlock(blockId, 0);
  }, [createBlock, finishBlock]);

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

  useEffect(() => {
    if (!terminal) return;

    const disposable = terminal.onData((data) => {
      for (const char of data) {
        switch (char) {
          case "\r":
            flushCommandHistory();
            break;
          case "\u007F":
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            break;
          case "\u0015":
            inputBufferRef.current = "";
            break;
          default:
            if (char >= " " && char !== "\u007F") {
              inputBufferRef.current += char;
            }
            break;
        }
      }
    });

    return () => disposable.dispose();
  }, [terminal, flushCommandHistory]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {blocks.length > 0 && (
        <div className="history-panel">
          {blocks.map((block) => (
            <TerminalBlock key={block.id} block={block} />
          ))}
        </div>
      )}
      <XTermRenderer
        onTerminalReady={handleTerminalReady}
        onResize={handleResize}
      />
      <style>{`
        .history-panel {
          max-height: 160px;
          overflow: auto;
          padding: 8px 8px 0;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}
