<template>
  <RouterLink
    :to="`/conversations/${encodeURIComponent(conversation.id)}`"
    class="conversation-card"
  >
    <div class="card-header">
      <ProviderBadge :provider="conversation.provider" :small="true" />
      <span class="date">{{ formatDate(conversation.lastMessageAt || conversation.startedAt) }}</span>
    </div>
    <div class="card-title">{{ conversation.title }}</div>
    <div class="card-meta">
      <span v-if="conversation.projectName" class="project">{{ conversation.projectName }}</span>
      <span>{{ conversation.messageCount }} messages</span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { Conversation } from "@/types/conversation";

defineProps<{ conversation: Conversation }>();

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style scoped>
.conversation-card {
  display: block;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.conversation-card:hover {
  border-color: var(--color-accent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.project {
  font-family: var(--font-mono);
}
</style>
