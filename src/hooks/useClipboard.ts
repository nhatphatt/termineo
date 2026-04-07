import { useEffect } from "react";

/**
 * Clipboard paste interceptor.
 * Detects image paste events and handles them separately from text.
 * Phase 2 will integrate with Tauri backend for SFTP upload.
 */
export function useClipboard(
  onTextPaste: (text: string) => void,
  onImagePaste: (blob: Blob) => void
) {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) onImagePaste(blob);
          return;
        }
      }

      // Text paste is handled by xterm.js natively, no need to intercept
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onTextPaste, onImagePaste]);
}
