/**
 * Block boundary detection.
 *
 * Strategy: We detect shell prompt patterns to determine where one command's
 * output ends and the next prompt begins. This is a heuristic — Phase 2 will
 * use shell integration (OSC 133) for precise markers.
 */

// Common prompt endings: $, #, >, ❯, %
const PROMPT_RE = /[\$#>❯%]\s*$/m;

export function looksLikePrompt(line: string): boolean {
  return PROMPT_RE.test(line.trimEnd());
}

/**
 * Parse OSC 133 sequences (shell integration protocol).
 * A = prompt start, B = command start, C = command output start, D = command finished
 */
export type OscMarker = "prompt_start" | "command_start" | "output_start" | "command_end";

const OSC_133_RE = /\x1b\]133;([ABCD])/;

export function parseOsc133(data: string): OscMarker | null {
  const m = data.match(OSC_133_RE);
  if (!m) return null;
  const map: Record<string, OscMarker> = {
    A: "prompt_start",
    B: "command_start",
    C: "output_start",
    D: "command_end",
  };
  return map[m[1]] ?? null;
}
