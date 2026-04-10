const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let ptyHost;

// In packaged app, asarUnpack puts files in app.asar.unpacked/
function resolveUnpacked(filePath) {
  const unpacked = filePath.replace("app.asar", "app.asar.unpacked");
  return fs.existsSync(unpacked) ? unpacked : filePath;
}

// ── Auto Updater ──

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    if (!mainWindow) return;
    mainWindow.webContents.send("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes || "",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    if (!mainWindow) return;
    mainWindow.webContents.send("updater:progress", {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    if (!mainWindow) return;
    mainWindow.webContents.send("updater:downloaded");
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err.message);
  });

  // Check for updates 3 seconds after launch, then every 30 minutes
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 30 * 60 * 1000);
}

// ── PTY Host ──

function startPtyHost() {
  const ptyHostPath = resolveUnpacked(path.join(__dirname, "pty-host.cjs"));

  ptyHost = spawn(process.execPath, [ptyHostPath], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  });

  ptyHost.on("message", (msg) => {
    if (!mainWindow) return;
    switch (msg.type) {
      case "output":
        mainWindow.webContents.send("pty:output", {
          session_id: msg.sessionId,
          data: msg.data,
        });
        break;
      case "exit":
        mainWindow.webContents.send("pty:exit", {
          session_id: msg.sessionId,
          exit_code: msg.exitCode,
        });
        break;
      case "error":
        console.error("PTY error:", msg.error);
        break;
      case "ready":
        console.log("PTY host ready");
        break;
    }
  });


  ptyHost.on("exit", (code) => {
    console.log("PTY host exited with code", code);
  });
}

function createWindow() {
  const rendererPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "dist", "index.html")
    : path.join(app.getAppPath(), "dist", "index.html");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: "Termineo",
    backgroundColor: "#0d1117",
    frame: false,
    transparent: false,
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      preload: resolveUnpacked(path.join(__dirname, "preload.cjs")),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Renderer failed to load:", { errorCode, errorDescription, validatedURL, rendererPath });
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process gone:", details);
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── PTY IPC ──

ipcMain.handle("pty:spawn", (_event, sessionId, options) => {
  ptyHost.send({ type: "spawn", sessionId, ...(options || {}) });
});

ipcMain.handle("pty:write", (_event, sessionId, data) => {
  ptyHost.send({ type: "write", sessionId, data });
});

ipcMain.handle("pty:resize", (_event, sessionId, cols, rows) => {
  ptyHost.send({ type: "resize", sessionId, cols, rows });
});

ipcMain.handle("pty:kill", (_event, sessionId) => {
  ptyHost.send({ type: "kill", sessionId });
});

// ── Window controls ──

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("window:setOpacity", (_event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(Math.max(0.3, Math.min(1, opacity / 100)));
  }
});

// ── Updater IPC ──

ipcMain.handle("updater:download", () => {
  autoUpdater.downloadUpdate().catch(() => {});
});

ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle("updater:check", () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.handle("updater:getVersion", () => {
  return app.getVersion();
});

// ── Utilities ──

ipcMain.handle("util:getShells", () => {
  const shells = [];
  const candidates = [
    { label: "PowerShell 7", path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe" },
    { label: "PowerShell", path: "powershell.exe" },
    { label: "CMD", path: "cmd.exe" },
    { label: "Git Bash", path: "C:\\Program Files\\Git\\bin\\bash.exe" },
    { label: "WSL", path: "wsl.exe" },
  ];
  for (const c of candidates) {
    if (c.path.includes("\\")) {
      if (fs.existsSync(c.path)) shells.push(c);
    } else {
      shells.push(c);
    }
  }
  return shells;
});

ipcMain.handle("util:selectDirectory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("util:selectProgram", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Programs", extensions: ["exe", "cmd", "bat", "ps1"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("util:openExternal", (_event, url) => {
  if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

app.whenReady().then(() => {
  startPtyHost();
  createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  if (ptyHost) ptyHost.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
