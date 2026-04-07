const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let ptyHost;

function startPtyHost() {
  ptyHost = utilityProcess.fork(path.join(__dirname, "pty-host.cjs"));

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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: "Termineo",
    backgroundColor: "#0d1117",
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── PTY IPC ──

ipcMain.handle("pty:spawn", (_event, sessionId, options) => {
  ptyHost.postMessage({ type: "spawn", sessionId, ...(options || {}) });
});

ipcMain.handle("pty:write", (_event, sessionId, data) => {
  ptyHost.postMessage({ type: "write", sessionId, data });
});

ipcMain.handle("pty:resize", (_event, sessionId, cols, rows) => {
  ptyHost.postMessage({ type: "resize", sessionId, cols, rows });
});

ipcMain.handle("pty:kill", (_event, sessionId) => {
  ptyHost.postMessage({ type: "kill", sessionId });
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

// ── Utilities ──

ipcMain.handle("util:getShells", () => {
  const shells = [];
  const candidates = [
    { label: "PowerShell", path: "powershell.exe" },
    { label: "CMD", path: "cmd.exe" },
    { label: "PowerShell 7", path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe" },
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

app.whenReady().then(() => {
  startPtyHost();
  createWindow();
});

app.on("window-all-closed", () => {
  if (ptyHost) ptyHost.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
