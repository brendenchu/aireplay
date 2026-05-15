<template>
  <div>
    <PageHeader title="Memory Files">
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
      empty-text="No memory files found."
      :on-retry="reload"
    >
      <div class="flex flex-col gap-2">
        <MemoryFileCard v-for="file in filtered" :key="file.id" :file="file" />
      </div>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listMemoryFiles } from "@/api/client";
import AsyncState from "@/components/AsyncState.vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
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
  listMemoryFiles({ signal }),
);

const filtered = computed(() => {
  const list = data.value?.data ?? [];
  const scoped =
    providerFilter.value === "all" ? list : list.filter((f) => f.provider === providerFilter.value);
  return [...scoped].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

onMounted(load);
</script>
