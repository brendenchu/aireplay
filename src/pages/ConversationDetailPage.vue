<template>
  <div>
    <div v-if="loading" class="text-muted-foreground py-8">Loading conversation…</div>

    <template v-else-if="conversation">
      <PageHeader :title="conversation.title" back-to="/conversations">
        <div class="flex gap-4 text-xs text-muted-foreground items-center mt-1">
          <ProviderBadge :provider="conversation.provider" />
          <span v-if="conversation.projectName">{{ conversation.projectName }}</span>
          <span>{{ formatDate(conversation.startedAt, true) }}</span>
          <span>{{ conversation.messageCount }} messages</span>
        </div>
      </PageHeader>

      <div class="flex flex-col gap-4">
        <MessageBubble
          v-for="msg in visibleMessages"
          :key="msg.id"
          :message="msg"
        />
      </div>
    </template>

    <div v-else class="text-muted-foreground py-8">Conversation not found.</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import MessageBubble from "@/components/MessageBubble.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { ConversationDetail } from "@/types/conversation";
import { formatDate } from "@/utils/format";

const route = useRoute();
const conversation = ref<ConversationDetail | null>(null);
const loading = ref(true);

const visibleMessages = computed(() =>
  conversation.value?.messages.filter(
    (m) => m.content.trim() || m.toolCalls?.length,
  ) ?? [],
);

onMounted(async () => {
  const id = route.params.id as string;
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (res.ok) {
    conversation.value = await res.json();
  }
  loading.value = false;
});
</script>
