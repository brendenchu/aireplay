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

    <div v-else-if="error?.isNotFound" class="text-muted-foreground py-8">
      Conversation not found.
    </div>

    <div v-else-if="error" class="py-8">
      <div class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div class="font-medium text-destructive mb-1">Couldn't load this conversation</div>
        <div class="text-muted-foreground mb-3">{{ error.message }}</div>
        <Button size="sm" variant="outline" @click="reload">Retry</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getConversation } from "@/api/client";
import MessageBubble from "@/components/MessageBubble.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/composables/useAsyncResource";
import { formatDate } from "@/utils/format";

const route = useRoute();

const {
  data: conversation,
  loading,
  error,
  load,
  reload,
} = useAsyncResource((signal) => getConversation(route.params.id as string, { signal }));

const visibleMessages = computed(
  () => conversation.value?.messages.filter((m) => m.content.trim() || m.toolCalls?.length) ?? [],
);

onMounted(load);
</script>
