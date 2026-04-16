<template>
  <div>
    <PageHeader title="Dashboard" />

    <div v-if="loading" class="text-muted-foreground py-8">Syncing providers…</div>
    <div v-else-if="error" class="text-destructive py-8">{{ error }}</div>

    <template v-else>
      <!-- Summary stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <Card v-for="stat in stats" :key="stat.label" size="sm" class="px-5">
          <CardContent class="p-0">
            <span class="text-3xl font-semibold leading-none">{{ stat.value }}</span>
            <span class="text-xs text-muted-foreground block mt-1">{{ stat.label }}</span>
          </CardContent>
        </Card>
      </div>

      <!-- Two-column grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Left: provider breakdown -->
        <Card class="px-5">
          <CardHeader class="p-0">
            <CardTitle class="text-sm text-muted-foreground">Providers</CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <div class="flex flex-col">
              <div
                v-for="(provider, idx) in providers"
                :key="provider.id"
                class="flex justify-between items-center py-2"
                :class="[
                  { 'opacity-45': !provider.available },
                  idx < providers.length - 1 ? 'border-b border-border' : '',
                ]"
              >
                <div class="flex items-center gap-2">
                  <ProviderBadge :provider="provider.id" />
                  <Badge v-if="!provider.available" variant="outline" class="text-[0.65rem] h-4">not found</Badge>
                </div>
                <div class="flex items-baseline gap-1 text-xs">
                  <span class="font-semibold">{{ provider.stats.conversations }}</span>
                  <span class="text-muted-foreground mr-2">convos</span>
                  <span class="font-semibold">{{ provider.stats.memoryFiles }}</span>
                  <span class="text-muted-foreground">files</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Right: recent conversations -->
        <Card class="px-5">
          <CardHeader class="p-0">
            <CardTitle class="text-sm text-muted-foreground">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <div v-if="conversations.length === 0" class="text-muted-foreground py-4">No conversations synced yet.</div>
            <div v-else class="flex flex-col gap-2">
              <ConversationCard
                v-for="convo in conversations.slice(0, 8)"
                :key="convo.id"
                :conversation="convo"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ConversationCard from "@/components/ConversationCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Conversation } from "@/types/conversation";
import type { Provider } from "@/types/provider";

const providers = ref<Provider[]>([]);
const conversations = ref<Conversation[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const totalConversations = computed(() =>
  providers.value.reduce((sum, p) => sum + p.stats.conversations, 0),
);
const totalMemoryFiles = computed(() =>
  providers.value.reduce((sum, p) => sum + p.stats.memoryFiles, 0),
);
const availableProviders = computed(() => providers.value.filter((p) => p.available).length);

const stats = computed(() => [
  { value: totalConversations.value, label: "Conversations" },
  { value: totalMemoryFiles.value, label: "Memory Files" },
  { value: availableProviders.value, label: "Providers" },
]);

onMounted(async () => {
  try {
    const [statusRes, convosRes] = await Promise.all([
      fetch("/api/sync/status"),
      fetch("/api/conversations?limit=10"),
    ]);

    providers.value = (await statusRes.json()).providers;
    conversations.value = (await convosRes.json()).data;
  } catch {
    error.value = "Failed to load dashboard data. Is the server running?";
  } finally {
    loading.value = false;
  }
});
</script>
