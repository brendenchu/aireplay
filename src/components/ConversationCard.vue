<template>
  <RouterLink
    :to="`/conversations/${encodeURIComponent(conversation.id)}`"
    class="block no-underline"
  >
    <Card class="px-4 transition-colors hover:border-primary cursor-pointer border-l-2 border-l-blue-400/60" size="sm">
      <CardContent class="p-0">
        <div class="flex items-center justify-between mb-1">
          <ProviderBadge :provider="conversation.provider" :small="true" />
          <span class="text-xs text-muted-foreground">{{ formatDate(conversation.lastMessageAt || conversation.startedAt) }}</span>
        </div>
        <div class="font-medium truncate text-foreground">{{ conversation.title }}</div>
        <div class="flex gap-3 text-xs text-muted-foreground">
          <span v-if="conversation.projectName" class="font-mono">{{ conversation.projectName }}</span>
          <span>{{ conversation.messageCount }} messages</span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>

<script setup lang="ts">
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Card, CardContent } from "@/components/ui/card";
import type { Conversation } from "@/types/conversation";
import { formatDate } from "@/utils/format";

defineProps<{ conversation: Conversation }>();
</script>
