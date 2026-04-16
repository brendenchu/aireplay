<template>
  <div>
    <PageHeader title="Search" />

    <div class="flex gap-3 mb-4">
      <SearchBar v-model="query" @search="search" class="flex-1" />
      <Select v-model="typeFilter">
        <SelectTrigger class="w-48">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="conversations">Conversations</SelectItem>
          <SelectItem value="memory">Memory</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="loading" class="text-muted-foreground py-8">Searching…</div>

    <template v-else-if="results.length > 0">
      <div class="flex flex-col gap-2">
        <RouterLink
          v-for="result in results"
          :key="result.id"
          :to="result.type === 'conversation'
            ? `/conversations/${encodeURIComponent(result.id)}`
            : `/memory/${encodeURIComponent(result.id)}/edit`"
          class="block no-underline"
        >
          <Card class="px-4 transition-colors hover:border-primary cursor-pointer" size="sm">
            <CardContent class="p-0">
              <div class="flex gap-2 items-center mb-1">
                <Badge variant="outline" class="text-[0.65rem] h-4 uppercase">{{ result.type }}</Badge>
                <ProviderBadge :provider="result.provider" :small="true" />
              </div>
              <div class="font-medium text-foreground">{{ result.title }}</div>
              <div v-if="result.excerpt" class="text-xs text-muted-foreground mt-1">{{ result.excerpt }}</div>
            </CardContent>
          </Card>
        </RouterLink>
      </div>
    </template>

    <div v-else-if="searched && !loading" class="text-muted-foreground py-8">No results found.</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import SearchBar from "@/components/SearchBar.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchResult } from "@/types/search";

const query = ref("");
const typeFilter = ref("all");
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const searched = ref(false);

async function search() {
  if (!query.value.trim()) return;

  loading.value = true;
  searched.value = true;

  const params = new URLSearchParams({ q: query.value });
  if (typeFilter.value !== "all") params.set("type", typeFilter.value);

  const res = await fetch(`/api/search?${params}`);
  const json = await res.json();
  results.value = json.results ?? [];
  loading.value = false;
}
</script>
