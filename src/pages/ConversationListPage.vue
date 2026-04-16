<template>
  <div class="conversation-list-page">
    <h1>Conversations</h1>

    <div class="filters">
      <select v-model="providerFilter">
        <option value="">All providers</option>
        <option value="claude-code">Claude Code</option>
        <option value="copilot">VS Code Copilot</option>
        <option value="gemini">Gemini CLI</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div v-if="conversations.length === 0" class="empty">No conversations found.</div>
      <div v-else class="list">
        <ConversationCard
          v-for="convo in conversations"
          :key="convo.id"
          :conversation="convo"
        />
      </div>

      <div v-if="total > conversations.length" class="load-more">
        <button @click="loadMore">Load more</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import ConversationCard from "@/components/ConversationCard.vue";
import type { Conversation } from "@/types/conversation";

const conversations = ref<Conversation[]>([]);
const total = ref(0);
const loading = ref(true);
const providerFilter = ref("");
const offset = ref(0);
const limit = 50;

async function load(append = false) {
  loading.value = !append;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset.value),
  });
  if (providerFilter.value) params.set("provider", providerFilter.value);

  const res = await fetch(`/api/conversations?${params}`);
  const json = await res.json();

  if (append) {
    conversations.value.push(...json.data);
  } else {
    conversations.value = json.data;
  }
  total.value = json.total;
  loading.value = false;
}

function loadMore() {
  offset.value += limit;
  load(true);
}

watch(providerFilter, () => {
  offset.value = 0;
  load();
});

onMounted(() => load());
</script>

<style scoped>
.conversation-list-page h1 {
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

.load-more {
  margin-top: 1rem;
}

.load-more button {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.load-more button:hover {
  border-color: var(--color-accent);
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
