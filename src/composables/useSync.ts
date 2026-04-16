import { ref } from "vue";
import type { Provider } from "@/types/provider";

export function useSync() {
  const syncing = ref(false);
  const providers = ref<Provider[]>([]);
  const lastSynced = ref<string | null>(null);

  async function fetchStatus() {
    const res = await fetch("/api/sync/status");
    const data = await res.json();
    providers.value = data.providers ?? [];
    if (data.lastSynced) lastSynced.value = data.lastSynced;
  }

  async function sync(provider?: string) {
    syncing.value = true;
    const body = provider ? JSON.stringify({ provider }) : undefined;
    const headers = provider ? { "Content-Type": "application/json" } : undefined;

    const res = await fetch("/api/sync", { method: "POST", headers, body });
    const result = await res.json();
    lastSynced.value = new Date().toISOString();
    syncing.value = false;
    return result;
  }

  return { syncing, providers, lastSynced, fetchStatus, sync };
}
