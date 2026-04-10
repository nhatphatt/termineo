import { useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useSettingsStore } from "../../stores/settingsStore";

function IconSplitRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconSplitDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function TabBar() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const setActive = useSessionStore((s) => s.setActive);
  const createSession = useSessionStore((s) => s.createSession);
  const closeSession = useSessionStore((s) => s.closeSession);
  const moveSession = useSessionStore((s) => s.moveSession);
  const splitActivePane = useSessionStore((s) => s.splitActivePane);
  const tabPosition = useSettingsStore((s) => s.tabPosition);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  const isVertical = tabPosition === "left" || tabPosition === "right";

  const dragFromId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; place: "before" | "after" } | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    dragFromId.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!dragFromId.current || dragFromId.current === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const place: "before" | "after" = isVertical
      ? e.clientY < rect.top + rect.height / 2 ? "before" : "after"
      : e.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setDropTarget({ id, place });
  };

  const handleDragLeave = (id: string) => {
    setDropTarget((cur) => (cur?.id === id ? null : cur));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    const fromId = dragFromId.current;
    dragFromId.current = null;
    const target = dropTarget;
    setDropTarget(null);
    if (!fromId || fromId === id) return;
    const place = target?.id === id ? target.place : "after";
    moveSession(fromId, id, place);
  };

  const handleDragEnd = () => {
    dragFromId.current = null;
    setDropTarget(null);
  };

  const handleSplitRight = () => {
    if (activeId) splitActivePane(activeId, "right");
  };
  const handleSplitDown = () => {
    if (activeId) splitActivePane(activeId, "down");
  };

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };
  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };
  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div className={`tab-bar tab-bar-${tabPosition}`}>
      <div className={`tab-list ${isVertical ? "tab-list-vertical" : "tab-list-horizontal"}`}>
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`tab ${s.id === activeId ? "tab-active" : ""} ${isVertical ? "tab-vertical" : ""} ${
              dropTarget?.id === s.id ? `tab-drop-${dropTarget.place}` : ""
            }`}
            onClick={() => setActive(s.id)}
            onKeyDown={(e) => e.key === "Enter" && setActive(s.id)}
            role="tab"
            tabIndex={0}
            aria-selected={s.id === activeId}
            title={s.label}
            draggable
            onDragStart={(e) => handleDragStart(e, s.id)}
            onDragOver={(e) => handleDragOver(e, s.id)}
            onDragLeave={() => handleDragLeave(s.id)}
            onDrop={(e) => handleDrop(e, s.id)}
            onDragEnd={handleDragEnd}
          >
            <span className="tab-label">{s.label}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeSession(s.id);
              }}
              aria-label={`Close ${s.label}`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className={`tab-new ${isVertical ? "tab-new-vertical" : ""}`}
          onClick={() => createSession("Shell")}
          aria-label="New tab"
        >
          +
        </button>
      </div>

      {/* Spacer + controls */}
      <div style={{ flex: 1 }} />
      <div className={`tab-actions ${isVertical ? "tab-actions-vertical" : ""}`}>
        <button
          className="tab-action-btn"
          onClick={handleSplitRight}
          title="Split right (Ctrl+Shift+E)"
          aria-label="Split right"
        >
          <IconSplitRight />
        </button>
        <button
          className="tab-action-btn"
          onClick={handleSplitDown}
          title="Split down (Ctrl+Shift+D)"
          aria-label="Split down"
        >
          <IconSplitDown />
        </button>
        <button
          className="tab-action-btn"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙
        </button>
        {tabPosition === "top" && (
          <div className="window-controls">
            <button onClick={handleMinimize} aria-label="Minimize" title="Minimize">─</button>
            <button onClick={handleMaximize} aria-label="Maximize" title="Maximize">□</button>
            <button className="win-close" onClick={handleClose} aria-label="Close" title="Close">×</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WindowControls() {
  const tabPosition = useSettingsStore((s) => s.tabPosition);
  if (tabPosition === "top") return null;

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };
  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };
  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div className="floating-window-controls">
      <button onClick={handleMinimize} title="Minimize">─</button>
      <button onClick={handleMaximize} title="Maximize">□</button>
      <button className="win-close" onClick={handleClose} title="Close">×</button>
    </div>
  );
}
