<template>
  <div class="sync-status" :class="{ syncing }">
    <button @click="sync" :disabled="syncing" class="sync-btn" title="Sync">
      <span class="icon">↻</span>
    </button>
    <span v-if="lastSynced" class="last-synced">{{ timeAgo(lastSynced) }}</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const syncing = ref(false);
const lastSynced = ref<string | null>(null);

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

async function sync() {
  syncing.value = true;
  await fetch("/api/sync", { method: "POST" });
  lastSynced.value = new Date().toISOString();
  syncing.value = false;
}

onMounted(async () => {
  const res = await fetch("/api/sync/status");
  const data = await res.json();
  if (data.lastSynced) lastSynced.value = data.lastSynced;
});
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  line-height: 1;
}

.sync-btn:hover {
  color: var(--color-accent);
}

.sync-btn:disabled {
  cursor: default;
}

.syncing .icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.last-synced {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
</style>
