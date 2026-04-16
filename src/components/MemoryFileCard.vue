<template>
  <RouterLink
    :to="`/memory/${encodeURIComponent(file.id)}/edit`"
    class="memory-file-card"
  >
    <div class="card-header">
      <ProviderBadge :provider="file.provider" :small="true" />
      <span class="size">{{ formatSize(file.sizeBytes) }}</span>
    </div>
    <div class="card-name">{{ file.name }}</div>
    <div class="card-meta">
      <span v-if="file.projectName">{{ file.projectName }}</span>
      <span class="path">{{ file.relativePath }}</span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { MemoryFile } from "@/types/memory";

defineProps<{ file: MemoryFile }>();

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
</script>

<style scoped>
.memory-file-card {
  display: block;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.memory-file-card:hover {
  border-color: var(--color-accent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.size {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card-name {
  font-weight: 500;
  font-family: var(--font-mono);
  margin-bottom: 0.25rem;
}

.card-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.path {
  font-family: var(--font-mono);
}
</style>
