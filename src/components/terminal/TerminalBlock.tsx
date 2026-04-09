import type { Block } from "../../stores/blockStore";
import { useBlockStore } from "../../stores/blockStore";

interface Props {
  block: Block;
}

export function TerminalBlock({ block }: Props) {
  const toggleCollapse = useBlockStore((s) => s.toggleCollapse);

  const isError = block.exitCode !== null && block.exitCode !== 0;

  return (
    <div className={`terminal-block ${isError ? "block-error" : ""}`}>
      <div
        className="block-header"
        onClick={() => toggleCollapse(block.id)}
        onKeyDown={(e) => e.key === "Enter" && toggleCollapse(block.id)}
        role="button"
        tabIndex={0}
        >
          <span className="block-chevron">{block.collapsed ? "▶" : "▼"}</span>
          <span className="block-command">{block.command || "…"}</span>
          {block.exitCode !== null && (
            <span className="block-status">
              <span
                className={`status-code ${isError ? "status-error" : "status-ok"}`}
              >
                {block.exitCode}
              </span>
            </span>
          )}
        </div>

      <style>{`
        .terminal-block {
          border: 1px solid var(--border);
          border-radius: 6px;
          margin-bottom: 4px;
          overflow: hidden;
        }
        .block-error { border-color: var(--error); }
        .block-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          background: var(--bg-block);
          cursor: pointer;
          font-size: 12px;
          user-select: none;
        }
        .block-header:hover { background: var(--bg-secondary); }
        .block-chevron { font-size: 10px; color: var(--text-secondary); width: 12px; }
        .block-command { flex: 1; font-family: var(--font-mono); color: var(--accent); }
        .status-running { color: var(--accent); animation: pulse 1s infinite; }
        .status-ok { color: var(--success); }
        .status-error { color: var(--error); font-weight: bold; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
