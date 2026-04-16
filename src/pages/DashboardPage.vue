<template>
  <div class="dashboard">
    <h1>aireplay</h1>

    <div v-if="loading" class="loading">Syncing providers…</div>

    <template v-else>
      <section class="providers">
        <h2>Providers</h2>
        <div class="provider-grid">
          <div
            v-for="provider in providers"
            :key="provider.id"
            class="provider-card"
            :class="{ unavailable: !provider.available }"
          >
            <ProviderBadge :provider="provider.id" />
            <div class="provider-stats">
              <span>{{ provider.stats.conversations }} conversations</span>
              <span>{{ provider.stats.memoryFiles }} memory files</span>
            </div>
            <span v-if="!provider.available" class="badge">not found</span>
          </div>
        </div>
      </section>

      <section class="recent">
        <h2>Recent Conversations</h2>
        <div v-if="conversations.length === 0" class="empty">No conversations synced yet.</div>
        <div v-else class="conversation-list">
          <ConversationCard
            v-for="convo in conversations.slice(0, 10)"
            :key="convo.id"
            :conversation="convo"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ConversationCard from "@/components/ConversationCard.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { Conversation } from "@/types/conversation";
import type { Provider } from "@/types/provider";

const providers = ref<Provider[]>([]);
const conversations = ref<Conversation[]>([]);
const loading = ref(true);

onMounted(async () => {
  const [statusRes, convosRes] = await Promise.all([
    fetch("/api/sync/status"),
    fetch("/api/conversations?limit=10"),
  ]);

  providers.value = (await statusRes.json()).providers;
  conversations.value = (await convosRes.json()).data;
  loading.value = false;
});
</script>

<style scoped>
.dashboard h1 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard h2 {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.provider-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.provider-card.unavailable {
  opacity: 0.5;
}

.provider-stats {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.badge {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  background: var(--color-border);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  align-self: flex-start;
}

.conversation-list {
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
