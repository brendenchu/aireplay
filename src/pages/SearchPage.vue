<template>
  <div class="search-page">
    <h1>Search</h1>

    <SearchBar v-model="query" @search="search" />

    <div class="filters">
      <select v-model="typeFilter">
        <option value="all">All</option>
        <option value="conversations">Conversations</option>
        <option value="memory">Memory</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Searching…</div>

    <template v-else-if="results.length > 0">
      <div class="results">
        <div v-for="result in results" :key="result.id" class="result-card">
          <RouterLink
            :to="result.type === 'conversation'
              ? `/conversations/${encodeURIComponent(result.id)}`
              : `/memory/${encodeURIComponent(result.id)}/edit`"
          >
            <div class="result-header">
              <span class="result-type">{{ result.type }}</span>
              <ProviderBadge :provider="result.provider" :small="true" />
            </div>
            <div class="result-title">{{ result.title }}</div>
            <div v-if="result.excerpt" class="result-excerpt">{{ result.excerpt }}</div>
          </RouterLink>
        </div>
      </div>
    </template>

    <div v-else-if="searched && !loading" class="empty">No results found.</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import SearchBar from "@/components/SearchBar.vue";
import type { SearchResult } from "@/types/search";

const query = ref("");
const typeFilter = ref("all");
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const searched = ref(false);

async function search() {
  if (!query.value.trim()) return;

  loading.value = true;
  searched.value = true;

  const params = new URLSearchParams({ q: query.value });
  if (typeFilter.value !== "all") params.set("type", typeFilter.value);

  const res = await fetch(`/api/search?${params}`);
  const json = await res.json();
  results.value = json.results ?? [];
  loading.value = false;
}
</script>

<style scoped>
.search-page h1 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.filters {
  margin: 0.75rem 0 1rem;
}

.filters select {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.result-card a {
  display: block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--color-text);
}

.result-card:hover {
  border-color: var(--color-accent);
}

.result-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.result-type {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  background: var(--color-border);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}

.result-title {
  font-weight: 500;
}

.result-excerpt {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
