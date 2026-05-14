import type { Conversation } from "../src/types/conversation";
import type { MemoryFile } from "../src/types/memory";
import type { ProviderId } from "../src/types/provider";
import { cache } from "./cache";
import { PARSERS } from "./parsers";
import { compareLastMessageDesc } from "./parsers/_shared";
import { invalidateWorkspaceCache } from "./parsers/copilot";

export interface ProviderSyncResult {
  conversations: number;
  memoryFiles: number;
  duration: number;
  error?: string;
}

export interface SyncResult {
  providers: Record<string, ProviderSyncResult>;
  duration: number;
}

let inFlight: Promise<SyncResult> | null = null;
let lastSyncedAt: string | null = null;
const lastSyncedByProvider = new Map<string, string>();

export function getLastSyncedAt(): string | null {
  return lastSyncedAt;
}

export function getLastSyncedByProvider(): Map<string, string> {
  return lastSyncedByProvider;
}

/**
 * Run a full or provider-filtered sync. Concurrent callers — lazy bootstrap
 * from the API middleware and explicit `POST /sync` — share the same
 * in-flight promise so the cache only gets rebuilt once.
 */
export function runSync(providerFilter?: ProviderId): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = executeSync(providerFilter).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function executeSync(providerFilter?: ProviderId): Promise<SyncResult> {
  const start = Date.now();
  const results: Record<string, ProviderSyncResult> = {};

  cache.invalidate("conversations:list");
  cache.invalidate("memory:list");
  cache.invalidate("search:index");
  invalidateWorkspaceCache();

  for (const parser of PARSERS) {
    if (providerFilter && providerFilter !== parser.id) continue;
    if (!parser.available()) continue;

    const s = Date.now();
    let conversations: Conversation[] = [];
    let memoryFiles: MemoryFile[] = [];
    const errors: string[] = [];

    try {
      conversations = await parser.scanSessions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`scanSessions: ${message}`);
      console.error(`[sync] ${parser.id} scanSessions failed:`, err);
    }

    if (parser.scanMemoryFiles) {
      try {
        const projectPaths = Array.from(
          new Set(conversations.map((c) => c.projectPath).filter((p): p is string => p !== null)),
        );
        memoryFiles = await parser.scanMemoryFiles(projectPaths);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`scanMemoryFiles: ${message}`);
        console.error(`[sync] ${parser.id} scanMemoryFiles failed:`, err);
      }
    }

    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations]);
    if (memoryFiles.length > 0) {
      const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
      cache.set("memory:list", [...existingMem, ...memoryFiles]);
    }

    results[parser.id] = {
      conversations: conversations.length,
      memoryFiles: memoryFiles.length,
      duration: Date.now() - s,
      ...(errors.length > 0 ? { error: errors.join("; ") } : {}),
    };
    if (errors.length === 0) lastSyncedByProvider.set(parser.id, new Date().toISOString());
  }

  const merged = cache.get<Conversation[]>("conversations:list") ?? [];
  cache.set("conversations:list", [...merged].sort(compareLastMessageDesc));

  lastSyncedAt = new Date().toISOString();
  return { providers: results, duration: Date.now() - start };
}
