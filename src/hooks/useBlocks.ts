import { useCallback } from "react";
import { useBlockStore, type Block } from "../stores/blockStore";

/**
 * Hook for block management within a session.
 */
export function useBlocks(sessionId: string) {
  const blocks = useBlockStore((s) => s.blocks).filter((b) => b.sessionId === sessionId);
  const addBlock = useBlockStore((s) => s.addBlock);
  const finishBlock = useBlockStore((s) => s.finishBlock);
  const toggleCollapse = useBlockStore((s) => s.toggleCollapse);

  const createBlock = useCallback(
    (command: string) => addBlock(sessionId, command),
    [sessionId, addBlock]
  );

  return { blocks, createBlock, finishBlock, toggleCollapse };
}

export type { Block };
