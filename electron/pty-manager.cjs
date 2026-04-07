const pty = require("node-pty");
const os = require("os");

class PtyManager {
  constructor() {
    /** @type {Map<string, import('node-pty').IPty>} */
    this.sessions = new Map();
  }

  /**
   * Spawn a new PTY session.
   * @param {string} sessionId
   * @param {(data: string) => void} onData
   * @param {(exitCode: number) => void} onExit
   */
  spawn(sessionId, onData, onExit) {
    if (this.sessions.has(sessionId)) {
      return { error: `Session ${sessionId} already exists` };
    }

    const shell =
      os.platform() === "win32"
        ? "powershell.exe"
        : process.env.SHELL || "/bin/bash";

    const args = os.platform() === "win32" ? ["-NoLogo"] : [];

    const ptyProcess = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: os.homedir(),
      env: process.env,
    });

    ptyProcess.onData((data) => {
      onData(data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.sessions.delete(sessionId);
      onExit(exitCode);
    });

    this.sessions.set(sessionId, ptyProcess);
    return { ok: true };
  }

  write(sessionId, data) {
    const proc = this.sessions.get(sessionId);
    if (proc) proc.write(data);
  }

  resize(sessionId, cols, rows) {
    const proc = this.sessions.get(sessionId);
    if (proc) proc.resize(cols, rows);
  }

  kill(sessionId) {
    const proc = this.sessions.get(sessionId);
    if (proc) {
      proc.kill();
      this.sessions.delete(sessionId);
    }
  }

  killAll() {
    for (const [id, proc] of this.sessions) {
      proc.kill();
    }
    this.sessions.clear();
  }
}

module.exports = { PtyManager };
