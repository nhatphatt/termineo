import { create } from "zustand";
import { ptyKill } from "../lib/ipc";

export interface Session {
  id: string;
  label: string;
  type: "local" | "ssh";
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  createSession: (label: string, type?: "local" | "ssh") => string;
  closeSession: (id: string) => void;
  setActive: (id: string) => void;
}

let nextId = 1;

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (label, type = "local") => {
    const id = `session-${nextId++}`;
    set((s) => ({
      sessions: [...s.sessions, { id, label, type }],
      activeSessionId: id,
    }));
    return id;
  },

  closeSession: (id) => {
    ptyKill(id).catch(() => {});
    set((s) => {
      const sessions = s.sessions.filter((x) => x.id !== id);
      return {
        sessions,
        activeSessionId:
          s.activeSessionId === id
            ? sessions[sessions.length - 1]?.id ?? null
            : s.activeSessionId,
      };
    });
  },

  setActive: (id) => set({ activeSessionId: id }),
}));
