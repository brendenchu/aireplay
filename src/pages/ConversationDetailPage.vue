<template>
  <div class="conversation-detail">
    <div v-if="loading" class="loading">Loading conversation…</div>

    <template v-else-if="conversation">
      <header>
        <RouterLink to="/conversations" class="back">&larr; Back</RouterLink>
        <h1>{{ conversation.title }}</h1>
        <div class="meta">
          <ProviderBadge :provider="conversation.provider" />
          <span v-if="conversation.projectName">{{ conversation.projectName }}</span>
          <span>{{ formatDate(conversation.startedAt) }}</span>
          <span>{{ conversation.messageCount }} messages</span>
        </div>
      </header>

      <div class="messages">
        <MessageBubble
          v-for="msg in conversation.messages"
          :key="msg.id"
          :message="msg"
        />
      </div>
    </template>

    <div v-else class="empty">Conversation not found.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import MessageBubble from "@/components/MessageBubble.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { ConversationDetail } from "@/types/conversation";

const route = useRoute();
const conversation = ref<ConversationDetail | null>(null);
const loading = ref(true);

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  const id = route.params.id as string;
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (res.ok) {
    conversation.value = await res.json();
  }
  loading.value = false;
});
</script>

<style scoped>
.back {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.85rem;
}

.back:hover {
  color: var(--color-accent);
}

header {
  margin-bottom: 1.5rem;
}

header h1 {
  font-size: 1.3rem;
  margin: 0.5rem 0 0.5rem;
}

.meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  align-items: center;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
