import { ref } from "vue";
import type { Conversation, ConversationDetail } from "@/types/conversation";

export function useConversations() {
  const conversations = ref<Conversation[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetch_list(
    params: { provider?: string; project?: string; limit?: number; offset?: number } = {},
  ) {
    loading.value = true;
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    if (params.provider) qs.set("provider", params.provider);
    if (params.project) qs.set("project", params.project);

    const res = await fetch(`/api/conversations?${qs}`);
    const json = await res.json();
    conversations.value = json.data;
    total.value = json.total;
    loading.value = false;
    return json;
  }

  async function fetchDetail(id: string): Promise<ConversationDetail | null> {
    const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  }

  return { conversations, total, loading, fetch_list, fetchDetail };
}
