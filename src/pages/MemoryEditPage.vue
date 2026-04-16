<template>
  <div class="memory-edit-page">
    <div v-if="loading" class="loading">Loading…</div>

    <template v-else-if="file">
      <header>
        <RouterLink to="/memory" class="back">&larr; Back</RouterLink>
        <h1>{{ file.name }}</h1>
        <div class="meta">
          <ProviderBadge :provider="file.provider" />
          <span v-if="file.projectName">{{ file.projectName }}</span>
          <span class="path">{{ file.relativePath }}</span>
        </div>
      </header>

      <div class="editor-area">
        <textarea
          v-model="content"
          :class="{ modified: content !== file.content }"
          spellcheck="false"
        ></textarea>
      </div>

      <div class="actions">
        <button
          @click="save"
          :disabled="saving || content === file.content"
          class="save-btn"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          @click="content = file.content"
          :disabled="content === file.content"
          class="reset-btn"
        >
          Reset
        </button>
        <span v-if="saveMessage" class="save-message">{{ saveMessage }}</span>
      </div>
    </template>

    <div v-else class="empty">Memory file not found.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { MemoryFile } from "@/types/memory";

const route = useRoute();
const file = ref<MemoryFile | null>(null);
const content = ref("");
const loading = ref(true);
const saving = ref(false);
const saveMessage = ref("");

onMounted(async () => {
  const id = route.params.id as string;
  const res = await fetch(`/api/memory/${encodeURIComponent(id)}`);
  if (res.ok) {
    file.value = await res.json();
    content.value = file.value?.content ?? "";
  }
  loading.value = false;
});

async function save() {
  if (!file.value) return;
  saving.value = true;
  saveMessage.value = "";

  const res = await fetch(`/api/memory/${encodeURIComponent(file.value.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.value }),
  });

  if (res.ok) {
    file.value.content = content.value;
    saveMessage.value = "Saved";
    setTimeout(() => (saveMessage.value = ""), 2000);
  } else {
    const err = await res.json();
    saveMessage.value = `Error: ${err.error}`;
  }

  saving.value = false;
}
</script>

<style scoped>
.back {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.85rem;
}

.back:hover {
  color: var(--color-accent);
}

header {
  margin-bottom: 1rem;
}

header h1 {
  font-size: 1.3rem;
  margin: 0.5rem 0 0.5rem;
}

.meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  align-items: center;
}

.path {
  font-family: var(--font-mono);
}

.editor-area {
  margin-bottom: 1rem;
}

textarea {
  width: 100%;
  min-height: 400px;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
}

textarea.modified {
  border-color: var(--color-accent);
}

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.save-btn,
.reset-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.save-btn {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.reset-btn {
  background: var(--color-surface);
  color: var(--color-text);
}

.reset-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.save-message {
  font-size: 0.8rem;
  color: var(--color-accent);
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
