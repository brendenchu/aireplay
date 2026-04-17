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

    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="text-muted-foreground py-8">No conversations found.</div>
      <div v-else class="flex flex-col gap-2">
        <ConversationCard v-for="convo in filtered" :key="convo.id" :conversation="convo" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ConversationCard from "@/components/ConversationCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Conversation } from "@/types/conversation";
import { PROVIDER_NAMES } from "@/types/provider";

const conversations = ref<Conversation[]>([]);
const loading = ref(true);
const providerFilter = ref("all");

const filtered = computed(() => {
  const list = providerFilter.value === "all"
    ? conversations.value
    : conversations.value.filter((c) => c.provider === providerFilter.value);
  return [...list].sort((a, b) => (b.lastMessageAt || b.startedAt).localeCompare(a.lastMessageAt || a.startedAt));
});

async function load() {
  loading.value = true;
  try {
    const res = await fetch("/api/conversations?limit=200");
    conversations.value = (await res.json()).data;
  } catch {
    // silently handle
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>
