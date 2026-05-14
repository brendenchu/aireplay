import type { Conversation } from "../src/types/conversation";
import type { MemoryFile } from "../src/types/memory";
import type { ProviderId } from "../src/types/provider";
import { cache } from "./cache";
import { PARSERS } from "./parsers";
import { compareLastMessageDesc } from "./parsers/_shared";

export interface ProviderSyncResult {
  conversations: number;
  memoryFiles: number;
  duration: number;
}

export interface SyncResult {
  providers: Record<string, ProviderSyncResult>;
  duration: number;
}

let inFlight: Promise<SyncResult> | null = null;

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

  for (const parser of PARSERS) {
    if (providerFilter && providerFilter !== parser.id) continue;
    if (!parser.available()) continue;

    const s = Date.now();
    const conversations = await parser.scanSessions();

    let memoryFiles: MemoryFile[] = [];
    if (parser.scanMemoryFiles) {
      const projectPaths = Array.from(
        new Set(conversations.map((c) => c.projectPath).filter((p): p is string => p !== null)),
      );
      memoryFiles = await parser.scanMemoryFiles(projectPaths);
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
    };
  }

  const merged = cache.get<Conversation[]>("conversations:list") ?? [];
  cache.set("conversations:list", [...merged].sort(compareLastMessageDesc));

  return { providers: results, duration: Date.now() - start };
}
