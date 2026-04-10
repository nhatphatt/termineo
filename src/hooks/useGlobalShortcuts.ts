import { useEffect } from "react";
import { useSessionStore } from "../stores/sessionStore";

/**
 * Global keyboard shortcuts for tabs and panes.
 *
 *   Ctrl+Shift+T       New tab
 *   Ctrl+Shift+W       Close active pane (or tab if last pane)
 *   Ctrl+Shift+E       Split active pane right
 *   Ctrl+Shift+D       Split active pane down
 *   Ctrl+Tab           Next tab
 *   Ctrl+Shift+Tab     Previous tab
 *   Ctrl+PageUp        Previous tab
 *   Ctrl+PageDown      Next tab
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      if (!ctrl) return;

      const store = useSessionStore.getState();
      const sessions = store.sessions;
      const activeId = store.activeSessionId;
      if (!activeId && sessions.length === 0) return;

      const key = e.key;

      // Ctrl+Shift+T → new tab
      if (shift && (key === "T" || key === "t")) {
        e.preventDefault();
        store.createSession("Shell");
        return;
      }

      // Ctrl+Shift+W → close active pane
      if (shift && (key === "W" || key === "w")) {
        if (!activeId) return;
        const tab = sessions.find((s) => s.id === activeId);
        if (!tab) return;
        e.preventDefault();
        store.closePane(activeId, tab.activePaneId);
        return;
      }

      // Ctrl+Shift+E → split right
      if (shift && (key === "E" || key === "e")) {
        if (!activeId) return;
        e.preventDefault();
        store.splitActivePane(activeId, "right");
        return;
      }

      // Ctrl+Shift+D → split down
      if (shift && (key === "D" || key === "d")) {
        if (!activeId) return;
        e.preventDefault();
        store.splitActivePane(activeId, "down");
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab → next / prev tab
      if (key === "Tab") {
        if (sessions.length === 0) return;
        e.preventDefault();
        const idx = sessions.findIndex((s) => s.id === activeId);
        const next = shift
          ? (idx - 1 + sessions.length) % sessions.length
          : (idx + 1) % sessions.length;
        store.setActive(sessions[next].id);
        return;
      }

      if (key === "PageUp" || key === "PageDown") {
        if (sessions.length === 0) return;
        e.preventDefault();
        const idx = sessions.findIndex((s) => s.id === activeId);
        const dir = key === "PageUp" ? -1 : 1;
        const next = (idx + dir + sessions.length) % sessions.length;
        store.setActive(sessions[next].id);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
