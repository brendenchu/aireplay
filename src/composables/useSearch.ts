import { ref } from "vue";
import type { SearchResult } from "@/types/search";

export function useSearch() {
  const results = ref<SearchResult[]>([]);
  const loading = ref(false);

  async function search(
    query: string,
    opts: { type?: string; provider?: string; limit?: number } = {},
  ) {
    if (!query.trim()) {
      results.value = [];
      return;
    }

    loading.value = true;
    const params = new URLSearchParams({ q: query });
    if (opts.type) params.set("type", opts.type);
    if (opts.provider) params.set("provider", opts.provider);
    if (opts.limit) params.set("limit", String(opts.limit));

    const res = await fetch(`/api/search?${params}`);
    results.value = (await res.json()).results;
    loading.value = false;
  }

  return { results, loading, search };
}
