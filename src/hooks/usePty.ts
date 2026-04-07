import { useEffect, useRef, useCallback } from "react";
import { ptySpawn, ptyWrite, ptyResize, ptyKill, onPtyOutput, onPtyExit } from "../lib/ipc";
import { useSettingsStore } from "../stores/settingsStore";
import type { Terminal } from "@xterm/xterm";

export function usePty(sessionId: string, terminal: Terminal | null) {
  const spawnedRef = useRef(false);
  const shellPath = useSettingsStore((s) => s.shellPath);
  const defaultWorkingDir = useSettingsStore((s) => s.defaultWorkingDir);

  useEffect(() => {
    if (!sessionId || !terminal) return;

    const unlistenOutput = onPtyOutput((payload) => {
      if (payload.session_id === sessionId) {
        terminal.write(payload.data);
      }
    });

    const unlistenExit = onPtyExit((payload) => {
      if (payload.session_id === sessionId) {
        terminal.write(`\r\n[Process exited with code ${payload.exit_code}]\r\n`);
      }
    });

    const dataDisposable = terminal.onData((data) => {
      ptyWrite(sessionId, data).catch(() => {});
    });

    if (!spawnedRef.current) {
      spawnedRef.current = true;
      ptySpawn(sessionId, {
        shellPath: shellPath || undefined,
        cwd: defaultWorkingDir || undefined,
      }).catch((err) => {
        console.error("Failed to spawn PTY:", err);
        terminal.write(`\r\n[Error: ${err}]\r\n`);
      });
    }

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      dataDisposable.dispose();
    };
  }, [sessionId, terminal, shellPath, defaultWorkingDir]);

  useEffect(() => {
    return () => {
      if (spawnedRef.current) {
        ptyKill(sessionId).catch(() => {});
        spawnedRef.current = false;
      }
    };
  }, [sessionId]);

  const resize = useCallback(
    (cols: number, rows: number) => {
      ptyResize(sessionId, cols, rows).catch(() => {});
    },
    [sessionId]
  );

  return { resize };
}
