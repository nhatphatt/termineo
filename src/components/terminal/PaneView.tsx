import { Fragment, useCallback, useEffect, useRef } from "react";
import type { PaneNode, SplitPane } from "../../stores/sessionStore";
import { useSessionStore } from "../../stores/sessionStore";
import { BlockList } from "./BlockList";

interface Props {
  sessionId: string;
  node: PaneNode;
  visible: boolean;
}

/**
 * Recursive pane renderer.
 *
 *   PtyPane   → BlockList (single terminal)
 *   SplitPane → flex container of children with draggable dividers
 */
export function PaneView({ sessionId, node, visible }: Props) {
  if (node.kind === "pty") {
    return <PtyPaneView sessionId={sessionId} paneId={node.id} visible={visible} showHeader={false} />;
  }
  return <SplitPaneView sessionId={sessionId} node={node} visible={visible} />;
}

function PtyPaneView({
  sessionId,
  paneId,
  visible,
  showHeader,
}: {
  sessionId: string;
  paneId: string;
  visible: boolean;
  showHeader: boolean;
}) {
  const activePaneId = useSessionStore((s) => {
    const tab = s.sessions.find((x) => x.id === sessionId);
    return tab?.activePaneId ?? null;
  });
  const setActivePane = useSessionStore((s) => s.setActivePane);
  const closePane = useSessionStore((s) => s.closePane);

  const isActive = activePaneId === paneId;

  const focusPane = () => setActivePane(sessionId, paneId);

  return (
    <div
      className={`pty-pane ${isActive ? "pty-pane-active" : ""}`}
      onMouseDownCapture={focusPane}
      onFocus={focusPane}
    >
      {showHeader && (
        <div className="pane-header">
          <span className="pane-header-label">{paneId}</span>
          <button
            className="pane-header-close"
            onClick={(e) => {
              e.stopPropagation();
              closePane(sessionId, paneId);
            }}
            title="Close pane (Ctrl+Shift+W)"
            aria-label="Close pane"
          >
            ×
          </button>
        </div>
      )}
      <div className="pane-body">
        <BlockList
          sessionId={paneId}
          visible={visible}
          focused={isActive}
          onFocusRequest={focusPane}
        />
      </div>
    </div>
  );
}

function SplitPaneView({
  sessionId,
  node,
  visible,
}: {
  sessionId: string;
  node: SplitPane;
  visible: boolean;
}) {
  const setPaneSizes = useSessionStore((s) => s.setPaneSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizesRef = useRef<number[]>(node.sizes);
  sizesRef.current = node.sizes;

  const handleDragStart = useCallback(
    (event: React.MouseEvent, index: number) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const horizontal = node.direction === "row";
      const total = horizontal ? rect.width : rect.height;
      const startPos = horizontal ? event.clientX : event.clientY;
      const startSizes = sizesRef.current.slice();

      const onMove = (e: MouseEvent) => {
        const currentPos = horizontal ? e.clientX : e.clientY;
        const deltaPx = currentPos - startPos;
        const deltaPct = (deltaPx / total) * 100;

        const next = startSizes.slice();
        const minPct = 8;
        const a = next[index] + deltaPct;
        const b = next[index + 1] - deltaPct;
        if (a < minPct || b < minPct) return;
        next[index] = a;
        next[index + 1] = b;
        setPaneSizes(sessionId, node.id, next);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = horizontal ? "col-resize" : "row-resize";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [node.direction, node.id, sessionId, setPaneSizes],
  );

  // Nudge the window to fire a resize event so xterm fits after a split change
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(id);
  }, [node.sizes, node.children.length, node.direction]);

  const flexDirection = node.direction === "row" ? "row" : "column";

  return (
    <div
      ref={containerRef}
      className="split-pane"
      style={{ display: "flex", flexDirection, width: "100%", height: "100%" }}
    >
      {node.children.map((child, idx) => (
        <Fragment key={getNodeId(child)}>
          <div
            style={{
              flexBasis: `${node.sizes[idx] ?? 100 / node.children.length}%`,
              flexGrow: 0,
              flexShrink: 0,
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {child.kind === "pty" ? (
              <PtyPaneView
                sessionId={sessionId}
                paneId={child.id}
                visible={visible}
                showHeader
              />
            ) : (
              <PaneView sessionId={sessionId} node={child} visible={visible} />
            )}
          </div>
          {idx < node.children.length - 1 && (
            <div
              className={`pane-divider pane-divider-${node.direction}`}
              onMouseDown={(e) => handleDragStart(e, idx)}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function getNodeId(node: PaneNode): string {
  return node.id;
}
