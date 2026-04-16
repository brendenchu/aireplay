import { ref } from "vue";
import type { MemoryFile } from "@/types/memory";

export function useMemory() {
  const files = ref<MemoryFile[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    const res = await fetch("/api/memory");
    files.value = (await res.json()).data;
    loading.value = false;
  }

  async function fetchOne(id: string): Promise<MemoryFile | null> {
    const res = await fetch(`/api/memory/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function save(id: string, content: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) return { ok: true };
    const err = await res.json();
    return { ok: false, error: err.error };
  }

  return { files, loading, fetchAll, fetchOne, save };
}
