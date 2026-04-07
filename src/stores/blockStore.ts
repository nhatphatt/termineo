import { create } from "zustand";

export interface Block {
  id: string;
  sessionId: string;
  command: string;
  exitCode: number | null;
  collapsed: boolean;
  startedAt: number;
  finishedAt: number | null;
}

interface BlockState {
  blocks: Block[];
  addBlock: (sessionId: string, command: string) => string;
  finishBlock: (blockId: string, exitCode: number) => void;
  toggleCollapse: (blockId: string) => void;
  getSessionBlocks: (sessionId: string) => Block[];
}

let blockSeq = 1;

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],

  addBlock: (sessionId, command) => {
    const id = `block-${blockSeq++}`;
    set((s) => ({
      blocks: [
        ...s.blocks,
        {
          id,
          sessionId,
          command,
          exitCode: null,
          collapsed: false,
          startedAt: Date.now(),
          finishedAt: null,
        },
      ],
    }));
    return id;
  },

  finishBlock: (blockId, exitCode) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId ? { ...b, exitCode, finishedAt: Date.now() } : b
      ),
    })),

  toggleCollapse: (blockId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId ? { ...b, collapsed: !b.collapsed } : b
      ),
    })),

  getSessionBlocks: (sessionId) =>
    get().blocks.filter((b) => b.sessionId === sessionId),
}));
