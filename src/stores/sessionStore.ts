import { create } from "zustand";
import { ptyKill } from "../lib/ipc";

/**
 * Session store — hierarchy:
 *   Session (tab)
 *     └── root: PaneNode
 *           ├── PtyPane (leaf)       → one PTY + one xterm instance
 *           └── SplitPane (branch)   → horizontal/vertical split of children
 *
 * Each tab manages its own pane tree. Each PtyPane has a unique `id` which
 * doubles as the PTY session id used by the backend.
 */

export type PaneId = string;

export interface PtyPane {
  kind: "pty";
  id: PaneId;
}

export interface SplitPane {
  kind: "split";
  id: PaneId;
  direction: "row" | "column";
  children: PaneNode[];
  sizes: number[];
}

export type PaneNode = PtyPane | SplitPane;

export interface Session {
  id: string;
  label: string;
  type: "local" | "ssh";
  root: PaneNode;
  activePaneId: PaneId;
}

export type SplitDirection = "right" | "left" | "down" | "up";

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;

  createSession: (label: string, type?: "local" | "ssh") => string;
  closeSession: (id: string) => void;
  setActive: (id: string) => void;
  renameSession: (id: string, label: string) => void;
  moveSession: (fromId: string, toId: string, place: "before" | "after") => void;

  setActivePane: (sessionId: string, paneId: PaneId) => void;
  splitActivePane: (sessionId: string, direction: SplitDirection) => PaneId | null;
  closePane: (sessionId: string, paneId: PaneId) => void;
  setPaneSizes: (sessionId: string, splitId: PaneId, sizes: number[]) => void;
}

let sessionSeq = 1;
let paneSeq = 1;

function nextSessionId(): string {
  return `session-${sessionSeq++}`;
}

function nextPaneId(): PaneId {
  return `pane-${paneSeq++}`;
}

function createPtyPane(): PtyPane {
  return { kind: "pty", id: nextPaneId() };
}

/** Walk the tree and collect every PTY leaf id. */
function collectPtyIds(node: PaneNode): PaneId[] {
  if (node.kind === "pty") return [node.id];
  return node.children.flatMap(collectPtyIds);
}

/** Return first PTY leaf id (used when selecting a fallback active pane). */
function firstPtyId(node: PaneNode): PaneId {
  if (node.kind === "pty") return node.id;
  return firstPtyId(node.children[0]);
}

/**
 * Split a target pane leaf into a new split node containing the original
 * leaf and a fresh sibling pane. Returns the updated tree and the new
 * pane id to focus.
 */
function splitPaneAt(
  node: PaneNode,
  targetId: PaneId,
  direction: SplitDirection,
): { node: PaneNode; newPaneId: PaneId | null } {
  if (node.kind === "pty") {
    if (node.id !== targetId) return { node, newPaneId: null };

    const newLeaf = createPtyPane();
    const splitDir: "row" | "column" =
      direction === "left" || direction === "right" ? "row" : "column";
    const insertBefore = direction === "left" || direction === "up";

    const children: PaneNode[] = insertBefore
      ? [newLeaf, node]
      : [node, newLeaf];

    const split: SplitPane = {
      kind: "split",
      id: nextPaneId(),
      direction: splitDir,
      children,
      sizes: [50, 50],
    };

    return { node: split, newPaneId: newLeaf.id };
  }

  let newPaneId: PaneId | null = null;
  const children = node.children.map((child) => {
    if (newPaneId) return child;
    const result = splitPaneAt(child, targetId, direction);
    if (result.newPaneId) newPaneId = result.newPaneId;
    return result.node;
  });

  if (!newPaneId) return { node, newPaneId: null };

  return {
    node: { ...node, children },
    newPaneId,
  };
}

/**
 * Remove a pane leaf from the tree. If a split ends up with a single child,
 * collapse it into that child.
 */
function removePane(
  node: PaneNode,
  targetId: PaneId,
): { node: PaneNode | null; removedIds: PaneId[] } {
  if (node.kind === "pty") {
    if (node.id === targetId) {
      return { node: null, removedIds: [node.id] };
    }
    return { node, removedIds: [] };
  }

  let removedIds: PaneId[] = [];
  const nextChildren: PaneNode[] = [];
  const nextSizes: number[] = [];

  node.children.forEach((child, idx) => {
    const result = removePane(child, targetId);
    removedIds = removedIds.concat(result.removedIds);
    if (result.node) {
      nextChildren.push(result.node);
      nextSizes.push(node.sizes[idx] ?? 100 / node.children.length);
    }
  });

  if (nextChildren.length === 0) {
    return { node: null, removedIds };
  }
  if (nextChildren.length === 1) {
    return { node: nextChildren[0], removedIds };
  }

  const total = nextSizes.reduce((a, b) => a + b, 0) || 1;
  const normalized = nextSizes.map((s) => (s / total) * 100);

  return {
    node: { ...node, children: nextChildren, sizes: normalized },
    removedIds,
  };
}

function updateSplitSizes(
  node: PaneNode,
  splitId: PaneId,
  sizes: number[],
): PaneNode {
  if (node.kind === "pty") return node;
  if (node.id === splitId) {
    if (sizes.length !== node.children.length) return node;
    return { ...node, sizes };
  }
  return {
    ...node,
    children: node.children.map((c) => updateSplitSizes(c, splitId, sizes)),
  };
}

function findSession(
  sessions: Session[],
  id: string,
): { session: Session; index: number } | null {
  const index = sessions.findIndex((s) => s.id === id);
  if (index < 0) return null;
  return { session: sessions[index], index };
}

function replaceSession(
  sessions: Session[],
  index: number,
  next: Session,
): Session[] {
  const copy = sessions.slice();
  copy[index] = next;
  return copy;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (label, type = "local") => {
    const id = nextSessionId();
    const pane = createPtyPane();
    const session: Session = {
      id,
      label,
      type,
      root: pane,
      activePaneId: pane.id,
    };
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: id,
    }));
    return id;
  },

  closeSession: (id) => {
    set((s) => {
      const found = findSession(s.sessions, id);
      if (!found) return s;

      collectPtyIds(found.session.root).forEach((ptyId) => {
        ptyKill(ptyId).catch(() => {});
      });

      const sessions = s.sessions.filter((x) => x.id !== id);
      const activeSessionId =
        s.activeSessionId === id
          ? sessions[sessions.length - 1]?.id ?? null
          : s.activeSessionId;

      return { sessions, activeSessionId };
    });
  },

  setActive: (id) => set({ activeSessionId: id }),

  renameSession: (id, label) =>
    set((s) => {
      const found = findSession(s.sessions, id);
      if (!found) return s;
      return {
        sessions: replaceSession(s.sessions, found.index, {
          ...found.session,
          label,
        }),
      };
    }),

  moveSession: (fromId, toId, place) =>
    set((s) => {
      if (fromId === toId) return s;
      const fromIdx = s.sessions.findIndex((x) => x.id === fromId);
      const toIdx = s.sessions.findIndex((x) => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return s;

      const next = s.sessions.slice();
      const [moved] = next.splice(fromIdx, 1);
      const adjustedTo = next.findIndex((x) => x.id === toId);
      const insertAt = place === "before" ? adjustedTo : adjustedTo + 1;
      next.splice(insertAt, 0, moved);
      return { sessions: next };
    }),

  setActivePane: (sessionId, paneId) =>
    set((s) => {
      const found = findSession(s.sessions, sessionId);
      if (!found) return s;
      if (found.session.activePaneId === paneId) return s;
      return {
        sessions: replaceSession(s.sessions, found.index, {
          ...found.session,
          activePaneId: paneId,
        }),
      };
    }),

  splitActivePane: (sessionId, direction) => {
    let newPaneId: PaneId | null = null;
    set((s) => {
      const found = findSession(s.sessions, sessionId);
      if (!found) return s;

      const result = splitPaneAt(
        found.session.root,
        found.session.activePaneId,
        direction,
      );
      if (!result.newPaneId) return s;

      newPaneId = result.newPaneId;
      return {
        sessions: replaceSession(s.sessions, found.index, {
          ...found.session,
          root: result.node,
          activePaneId: result.newPaneId,
        }),
      };
    });
    return newPaneId;
  },

  closePane: (sessionId, paneId) =>
    set((s) => {
      const found = findSession(s.sessions, sessionId);
      if (!found) return s;

      const { node, removedIds } = removePane(found.session.root, paneId);
      removedIds.forEach((id) => {
        ptyKill(id).catch(() => {});
      });

      if (!node) {
        // no panes left → close the whole tab
        const sessions = s.sessions.filter((x) => x.id !== sessionId);
        const activeSessionId =
          s.activeSessionId === sessionId
            ? sessions[sessions.length - 1]?.id ?? null
            : s.activeSessionId;
        return { sessions, activeSessionId };
      }

      const nextActive = removedIds.includes(found.session.activePaneId)
        ? firstPtyId(node)
        : found.session.activePaneId;

      return {
        sessions: replaceSession(s.sessions, found.index, {
          ...found.session,
          root: node,
          activePaneId: nextActive,
        }),
      };
    }),

  setPaneSizes: (sessionId, splitId, sizes) =>
    set((s) => {
      const found = findSession(s.sessions, sessionId);
      if (!found) return s;
      const nextRoot = updateSplitSizes(found.session.root, splitId, sizes);
      if (nextRoot === found.session.root) return s;
      return {
        sessions: replaceSession(s.sessions, found.index, {
          ...found.session,
          root: nextRoot,
        }),
      };
    }),
}));
