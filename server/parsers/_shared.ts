/**
 * Shared helpers used by every provider parser. Each provider keeps its own
 * file format knowledge; this module covers the pieces that were drifting
 * between parsers (line parsing, title truncation, content flattening, sort).
 */

import type { Conversation, ConversationDetail } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import type { ProviderId } from "../../src/types/provider";

/**
 * Each provider implements this so routes can iterate instead of hardcoding
 * a switch over provider id. `available` reflects whether the provider's
 * on-disk root exists; routes skip scanning when false.
 */
export interface SessionParser {
  id: ProviderId;
  displayName: string;
  available(): boolean;
  scanSessions(): Promise<Conversation[]>;
  parseSession(filePath: string): Promise<ConversationDetail | null>;
  scanMemoryFiles?: () => Promise<MemoryFile[]>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse JSONL text into typed entries. The optional mapper receives each
 * decoded line and returns the typed value (or null to skip). Without a
 * mapper, raw `unknown` values are returned for the caller to narrow.
 */
export function parseJsonlLines<T = unknown>(
  raw: string,
  mapper?: (value: unknown) => T | null,
): T[] {
  const out: T[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (mapper) {
      const mapped = mapper(parsed);
      if (mapped !== null) out.push(mapped);
    } else {
      out.push(parsed as T);
    }
  }
  return out;
}

export function truncateTitle(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * Flatten arbitrary message-content shapes into plain text. Tolerates the
 * union actually seen across providers: bare string; `{ text }`;
 * `{ content }`; arrays of any of those.
 */
export function flattenTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    if (typeof value.text === "string") return value.text;
    if (typeof value.content === "string") return value.content;
    return "";
  }
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (isRecord(part) && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function compareLastMessageDesc<T extends { lastMessageAt: string }>(a: T, b: T): number {
  return b.lastMessageAt.localeCompare(a.lastMessageAt);
}
