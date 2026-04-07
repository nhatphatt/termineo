/**
 * PTY Host — runs as Electron utilityProcess.
 * Uses process.parentPort for IPC with main process.
 */
const os = require("os");
const path = require("path");

// In packaged app, node-pty is in app.asar.unpacked
let pty;
try {
  pty = require("node-pty");
} catch {
  const unpackedPath = path.join(__dirname, "../node_modules/node-pty").replace("app.asar", "app.asar.unpacked");
  pty = require(unpackedPath);
}

/** @type {Map<string, import('node-pty').IPty>} */
const sessions = new Map();

function send(msg) {
  process.parentPort.postMessage(msg);
}

process.parentPort.on("message", (e) => {
  const msg = e.data;
  const { type, sessionId, data, cols, rows, shellPath, cwd } = msg;

  switch (type) {
    case "spawn": {
      if (sessions.has(sessionId)) {
        send({ type: "error", sessionId, error: "Session already exists" });
        return;
      }
      const defaultShell = os.platform() === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/bash");
      const shell = shellPath || defaultShell;
      const args = (shell.includes("powershell") || shell.includes("pwsh")) ? ["-NoLogo"] : [];

      const proc = pty.spawn(shell, args, {
        name: "xterm-256color",
        cols: cols || 80,
        rows: rows || 24,
        cwd: cwd || os.homedir(),
        env: process.env,
      });

      proc.onData((output) => {
        send({ type: "output", sessionId, data: output });
      });

      proc.onExit(({ exitCode }) => {
        sessions.delete(sessionId);
        send({ type: "exit", sessionId, exitCode });
      });

      sessions.set(sessionId, proc);
      send({ type: "spawned", sessionId });
      break;
    }

    case "write": {
      const proc = sessions.get(sessionId);
      if (proc) proc.write(data);
      break;
    }

    case "resize": {
      const proc = sessions.get(sessionId);
      if (proc) proc.resize(cols, rows);
      break;
    }

    case "kill": {
      const proc = sessions.get(sessionId);
      if (proc) {
        proc.kill();
        sessions.delete(sessionId);
      }
      break;
    }
  }
});

send({ type: "ready" });
