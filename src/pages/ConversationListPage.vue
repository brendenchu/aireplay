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
      <div v-if="conversations.length === 0" class="text-muted-foreground py-8">No conversations found.</div>
      <div v-else class="flex flex-col gap-2">
        <ConversationCard
          v-for="convo in conversations"
          :key="convo.id"
          :conversation="convo"
        />
      </div>

      <div v-if="total > conversations.length" class="mt-4">
        <Button variant="outline" @click="loadMore">Load more</Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import ConversationCard from "@/components/ConversationCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import { Button } from "@/components/ui/button";
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
const total = ref(0);
const loading = ref(true);
const providerFilter = ref("all");
const offset = ref(0);
const limit = 50;

async function load(append = false) {
  loading.value = !append;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset.value),
  });
  if (providerFilter.value !== "all") params.set("provider", providerFilter.value);

  try {
    const res = await fetch(`/api/conversations?${params}`);
    const json = await res.json();

    if (append) {
      conversations.value.push(...json.data);
    } else {
      conversations.value = json.data;
    }
    total.value = json.total;
  } catch {
    // silently handle — existing data preserved
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  offset.value += limit;
  load(true);
}

watch(providerFilter, () => {
  offset.value = 0;
  load();
});

onMounted(() => load());
</script>
