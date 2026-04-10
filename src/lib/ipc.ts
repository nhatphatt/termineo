/**
 * IPC bridge — talks to Electron main process via contextBridge.
 */

export interface PtySpawnOptions {
  shellPath?: string;
  cwd?: string;
}

interface ElectronAPI {
  ptySpawn: (sessionId: string, options?: PtySpawnOptions) => Promise<{ ok?: boolean; error?: string }>;
  ptyWrite: (sessionId: string, data: string) => Promise<void>;
  ptyResize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  ptyKill: (sessionId: string) => Promise<void>;
  onPtyOutput: (callback: (payload: PtyOutputPayload) => void) => () => void;
  onPtyExit: (callback: (payload: PtyExitPayload) => void) => () => void;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowSetOpacity: (opacity: number) => Promise<void>;
  updaterDownload: () => Promise<void>;
  updaterInstall: () => Promise<void>;
  updaterCheck: () => Promise<void>;
  updaterGetVersion: () => Promise<string>;
  onUpdaterAvailable: (callback: (payload: { version: string; releaseNotes: string }) => void) => () => void;
  onUpdaterProgress: (callback: (payload: { percent: number; transferred: number; total: number }) => void) => () => void;
  onUpdaterDownloaded: (callback: () => void) => () => void;
  getAvailableShells: () => Promise<{ label: string; path: string }[]>;
  selectDirectory: () => Promise<string | null>;
  selectProgram: () => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ── PTY Commands ──

export async function ptySpawn(sessionId: string, options?: PtySpawnOptions): Promise<void> {
  const result = await window.electronAPI.ptySpawn(sessionId, options);
  if (result?.error) throw new Error(result.error);
}

export async function ptyWrite(sessionId: string, data: string): Promise<void> {
  await window.electronAPI.ptyWrite(sessionId, data);
}

export async function ptyResize(sessionId: string, cols: number, rows: number): Promise<void> {
  await window.electronAPI.ptyResize(sessionId, cols, rows);
}

export async function ptyKill(sessionId: string): Promise<void> {
  await window.electronAPI.ptyKill(sessionId);
}

// ── PTY Events ──

export interface PtyOutputPayload {
  session_id: string;
  data: string;
}

export interface PtyExitPayload {
  session_id: string;
  exit_code: number;
}

export function onPtyOutput(handler: (payload: PtyOutputPayload) => void): Promise<() => void> {
  const unlisten = window.electronAPI.onPtyOutput(handler);
  return Promise.resolve(unlisten);
}

export function onPtyExit(handler: (payload: PtyExitPayload) => void): Promise<() => void> {
  const unlisten = window.electronAPI.onPtyExit(handler);
  return Promise.resolve(unlisten);
}

// ── Window ──

export async function setWindowOpacity(opacity: number): Promise<void> {
  await window.electronAPI.windowSetOpacity(opacity);
}

// ── Utilities ──

export async function getAvailableShells(): Promise<{ label: string; path: string }[]> {
  return window.electronAPI.getAvailableShells();
}

export async function selectDirectory(): Promise<string | null> {
  return window.electronAPI.selectDirectory();
}

export async function selectProgram(): Promise<string | null> {
  return window.electronAPI.selectProgram();
}
