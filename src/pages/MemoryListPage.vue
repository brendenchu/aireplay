<template>
  <div class="memory-list-page">
    <h1>Memory Files</h1>

    <div class="filters">
      <select v-model="providerFilter">
        <option value="">All providers</option>
        <option value="claude-code">Claude Code</option>
        <option value="gemini">Gemini CLI</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div v-if="files.length === 0" class="empty">No memory files found.</div>
      <div v-else class="list">
        <MemoryFileCard v-for="file in filtered" :key="file.id" :file="file" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import type { MemoryFile } from "@/types/memory";

const files = ref<MemoryFile[]>([]);
const loading = ref(true);
const providerFilter = ref("");

const filtered = computed(() => {
  if (!providerFilter.value) return files.value;
  return files.value.filter((f) => f.provider === providerFilter.value);
});

onMounted(async () => {
  const res = await fetch("/api/memory");
  files.value = (await res.json()).data;
  loading.value = false;
});
</script>

<style scoped>
.memory-list-page h1 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.filters {
  margin-bottom: 1rem;
}

.filters select {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
