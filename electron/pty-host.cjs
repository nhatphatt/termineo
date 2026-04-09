/**
 * PTY Host — runs as a child process with ELECTRON_RUN_AS_NODE=1.
 * Communicates with main process via process.send / process.on('message').
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

// In packaged app, node-pty is in app.asar.unpacked
let pty;
try {
  pty = require("node-pty");
} catch {
  const unpackedPath = path.join(__dirname, "..", "node_modules", "node-pty")
    .replace("app.asar", "app.asar.unpacked");
  pty = require(unpackedPath);
}

/** @type {Map<string, import('node-pty').IPty>} */
const sessions = new Map();

function appendToEnvPath(env, extraPath) {
  if (!extraPath) return;
  if (env.PATH && !env.PATH.includes(extraPath)) {
    env.PATH = `${extraPath};${env.PATH}`;
  } else if (env.Path && !env.Path.includes(extraPath)) {
    env.Path = `${extraPath};${env.Path}`;
  } else if (!env.PATH && !env.Path) {
    env.PATH = extraPath;
  }
}

function resolveStarshipPath() {
  const candidates = [
    path.join(os.homedir(), ".starship", "bin", "starship.exe"),
    path.join(__dirname, "..", "bin", "starship.exe").replace("app.asar", "app.asar.unpacked"),
    path.join(path.dirname(process.execPath), "resources", "bin", "starship.exe"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getShellLaunchOptions(shell) {
  const env = { ...process.env };
  const starshipPath = resolveStarshipPath();
  const starshipBin = starshipPath ? path.dirname(starshipPath) : path.join(os.homedir(), ".starship", "bin");

  appendToEnvPath(env, starshipBin);
  env.STARSHIP_CONFIG = path.join(os.homedir(), ".config", "starship.toml");

  if (shell.includes("powershell") || shell.includes("pwsh")) {
    const powershellStarship = starshipPath
      ? starshipPath.replace(/'/g, "''")
      : "starship";

    const initCommand = `if (Get-Command '${powershellStarship}' -ErrorAction SilentlyContinue) { Invoke-Expression (& '${powershellStarship}' init powershell) }`;

    return {
      env,
      args: ["-NoLogo", "-NoExit", "-Command", initCommand],
    };
  }

  return {
    env,
    args: [],
  };
}

process.on("message", (msg) => {
  const { type, sessionId, data, cols, rows, shellPath, cwd } = msg;

  switch (type) {
    case "spawn": {
      if (sessions.has(sessionId)) {
        process.send({ type: "error", sessionId, error: "Session already exists" });
        return;
      }
      const defaultShell = os.platform() === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/bash");
      const shell = shellPath || defaultShell;
      const { args, env } = getShellLaunchOptions(shell);

      try {
        const proc = pty.spawn(shell, args, {
          name: "xterm-256color",
          cols: cols || 80,
          rows: rows || 24,
          cwd: cwd || os.homedir(),
          env,
        });

        proc.onData((output) => {
          process.send({ type: "output", sessionId, data: output });
        });

        proc.onExit(({ exitCode }) => {
          sessions.delete(sessionId);
          process.send({ type: "exit", sessionId, exitCode });
        });

        sessions.set(sessionId, proc);
        process.send({ type: "spawned", sessionId });
      } catch (err) {
        process.send({ type: "error", sessionId, error: err.message });
      }
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

process.send({ type: "ready" });
