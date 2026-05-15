import type { ProviderStatus } from "./provider";

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

export interface SyncStatusResponse {
  lastSyncedAt: string | null;
  providers: ProviderStatus[];
}
