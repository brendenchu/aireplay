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

    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="text-muted-foreground py-8">No memory files found.</div>
      <div v-else class="flex flex-col gap-2">
        <MemoryFileCard v-for="file in filtered" :key="file.id" :file="file" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemoryFile } from "@/types/memory";
import { PROVIDER_NAMES } from "@/types/provider";

const files = ref<MemoryFile[]>([]);
const loading = ref(true);
const providerFilter = ref("all");

const filtered = computed(() => {
  const list = providerFilter.value === "all"
    ? files.value
    : files.value.filter((f) => f.provider === providerFilter.value);
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

onMounted(async () => {
  try {
    const res = await fetch("/api/memory");
    files.value = (await res.json()).data;
  } catch {
    // leave empty
  } finally {
    loading.value = false;
  }
});
</script>
