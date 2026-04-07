import { useEffect } from "react";
import { TabBar, WindowControls } from "./components/shared/TabBar";
import { SettingsPanel } from "./components/shared/SettingsPanel";
import { BlockList } from "./components/terminal/BlockList";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";

export default function App() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const tabPosition = useSettingsStore((s) => s.tabPosition);
  const colors = useSettingsStore((s) => s.terminalColors);

  useEffect(() => {
    if (sessions.length === 0) {
      createSession("Local Shell");
    }
  }, [sessions.length, createSession]);

  // Apply background color to body
  useEffect(() => {
    document.documentElement.style.setProperty("--bg-primary", colors.background);
  }, [colors.background]);

  const isHorizontal = tabPosition === "top" || tabPosition === "bottom";
  const flexDir = isHorizontal
    ? tabPosition === "top" ? "column" : "column-reverse"
    : tabPosition === "left" ? "row" : "row-reverse";

  return (
    <div className="app-container" style={{ flexDirection: flexDir as "column" }}>
      <WindowControls />
      <TabBar />
      <div className="terminal-area">
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              className={`terminal-pane ${isActive ? "terminal-pane-active" : "terminal-pane-hidden"}`}
            >
              <BlockList sessionId={s.id} visible={isActive} />
            </div>
          );
        })}
      </div>
      <SettingsPanel />
    </div>
  );
}
