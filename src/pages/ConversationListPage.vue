<template>
  <div>
    <PageHeader title="Conversations">
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

    <AsyncState
      :loading="loading"
      :error="error"
      :empty="filtered.length === 0"
      empty-text="No conversations found."
      :on-retry="reload"
    >
      <div class="flex flex-col gap-2">
        <ConversationCard v-for="convo in filtered" :key="convo.id" :conversation="convo" />
      </div>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listConversations } from "@/api/client";
import AsyncState from "@/components/AsyncState.vue";
import ConversationCard from "@/components/ConversationCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncResource } from "@/composables/useAsyncResource";
import type { ProviderFilter } from "@/types/provider";
import { PROVIDER_NAMES } from "@/types/provider";

const providerFilter = ref<ProviderFilter>("all");

const { data, loading, error, load, reload } = useAsyncResource((signal) =>
  listConversations({ limit: 200, signal }),
);

const filtered = computed(() => {
  const list = data.value?.data ?? [];
  const scoped =
    providerFilter.value === "all" ? list : list.filter((c) => c.provider === providerFilter.value);
  return [...scoped].sort((a, b) =>
    (b.lastMessageAt || b.startedAt).localeCompare(a.lastMessageAt || a.startedAt),
  );
});

onMounted(load);
</script>
