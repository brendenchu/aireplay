<template>
  <div class="settings-page">
    <h1>Settings</h1>

    <section>
      <h2>Sync</h2>
      <p class="hint">Re-scan all provider data sources and rebuild the search index.</p>
      <button @click="sync" :disabled="syncing" class="sync-btn">
        {{ syncing ? 'Syncing…' : 'Sync Now' }}
      </button>
      <div v-if="syncResult" class="sync-result">
        <div v-for="(stats, provider) in syncResult.providers" :key="provider">
          <strong>{{ provider }}</strong>:
          {{ stats.conversations }} conversations,
          {{ stats.memoryFiles }} memory files
          ({{ stats.duration }}ms)
        </div>
      </div>
    </section>

    <section>
      <h2>Providers</h2>
      <div v-if="providers.length === 0" class="loading">Loading…</div>
      <div v-else class="provider-list">
        <div v-for="p in providers" :key="p.id" class="provider-row">
          <ProviderBadge :provider="p.id" />
          <span :class="{ available: p.available, unavailable: !p.available }">
            {{ p.available ? 'Available' : 'Not found' }}
          </span>
        </div>
      </div>
    </section>

    <section>
      <h2>About</h2>
      <p class="hint">aireplay v0.1 — local AI conversation browser. All data stays on your machine.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { Provider } from "@/types/provider";

const providers = ref<Provider[]>([]);
const syncing = ref(false);
interface SyncProviderStats {
  conversations: number;
  memoryFiles: number;
  duration: number;
}

const syncResult = ref<{ providers: Record<string, SyncProviderStats> } | null>(null);

onMounted(async () => {
  const res = await fetch("/api/sync/status");
  providers.value = (await res.json()).providers;
});

async function sync() {
  syncing.value = true;
  syncResult.value = null;

  const res = await fetch("/api/sync", { method: "POST" });
  syncResult.value = await res.json();
  syncing.value = false;

  // Refresh provider status
  const statusRes = await fetch("/api/sync/status");
  providers.value = (await statusRes.json()).providers;
}
</script>

<style scoped>
.settings-page h1 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

section {
  margin-bottom: 2rem;
}

section h2 {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.sync-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.sync-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.sync-result {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.provider-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.85rem;
}

.available {
  color: #4ade80;
}

.unavailable {
  color: var(--color-text-muted);
}

.loading {
  color: var(--color-text-muted);
  padding: 1rem 0;
}
</style>
