<template>
  <div>
    <PageHeader title="Dashboard">
      <template #actions>
        <Select v-model="providerFilter">
          <SelectTrigger class="w-48">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            <SelectItem v-for="(name, id) in PROVIDER_NAMES" :key="id" :value="id">{{ name }}</SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>

    <AsyncState :loading="loading" :error="error" loading-text="Syncing providers…" :on-retry="reload">
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

        <!-- Right: recent activity (conversations + memory files) -->
        <Card class="px-5">
          <CardHeader class="p-0">
            <CardTitle class="text-sm text-muted-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <div v-if="feed.length === 0" class="text-muted-foreground py-4">No activity yet.</div>
            <div v-else class="flex flex-col gap-2">
              <template v-for="item in feed.slice(0, 10)" :key="item.type + ':' + item.data.id">
                <ConversationCard v-if="item.type === 'conversation'" :conversation="item.data" />
                <MemoryFileCard v-else :file="item.data" />
              </template>
            </div>
          </CardContent>
        </Card>
      </div>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getSyncStatus, listConversations, listMemoryFiles } from "@/api/client";
import AsyncState from "@/components/AsyncState.vue";
import ConversationCard from "@/components/ConversationCard.vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncResource } from "@/composables/useAsyncResource";
import type { Conversation } from "@/types/conversation";
import type { MemoryFile } from "@/types/memory";
import type { ProviderFilter } from "@/types/provider";
import { PROVIDER_NAMES } from "@/types/provider";

type FeedItem =
  | { type: "conversation"; data: Conversation; date: string }
  | { type: "memory"; data: MemoryFile; date: string };

const providerFilter = ref<ProviderFilter>("all");

const { data, loading, error, load, reload } = useAsyncResource(async (signal) => {
  const [status, convos, memory] = await Promise.all([
    getSyncStatus({ signal }),
    listConversations({ limit: 200, signal }),
    listMemoryFiles({ signal }),
  ]);
  return { providers: status.providers, conversations: convos.data, memoryFiles: memory.data };
});

const providers = computed(() => data.value?.providers ?? []);
const conversations = computed(() => data.value?.conversations ?? []);
const memoryFiles = computed(() => data.value?.memoryFiles ?? []);

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

const feed = computed<FeedItem[]>(() => {
  const items: FeedItem[] = [];

  for (const c of conversations.value) {
    if (providerFilter.value !== "all" && c.provider !== providerFilter.value) continue;
    items.push({ type: "conversation", data: c, date: c.lastMessageAt || c.startedAt });
  }
  for (const m of memoryFiles.value) {
    if (providerFilter.value !== "all" && m.provider !== providerFilter.value) continue;
    items.push({ type: "memory", data: m, date: m.updatedAt });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
});

onMounted(load);
</script>
