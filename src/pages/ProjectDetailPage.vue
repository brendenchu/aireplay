<template>
  <div class="project-detail">
    <div v-if="loading" class="loading">Loading…</div>

    <template v-else-if="project">
      <header>
        <RouterLink to="/projects" class="back">&larr; Back</RouterLink>
        <h1>{{ project.name }}</h1>
        <div class="meta">
          <span class="path">{{ project.path }}</span>
          <ProviderBadge v-for="p in project.providers" :key="p" :provider="p" />
        </div>
      </header>

      <section v-if="memoryFiles.length > 0">
        <h2>Memory Files</h2>
        <div class="memory-list">
          <MemoryFileCard v-for="mem in memoryFiles" :key="mem.id" :file="mem" />
        </div>
      </section>

      <section>
        <h2>Conversations ({{ conversations.length }})</h2>
        <div class="conversation-list">
          <ConversationCard
            v-for="convo in conversations"
            :key="convo.id"
            :conversation="convo"
          />
        </div>
      </section>
    </template>

    <div v-else class="empty">Project not found.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ConversationCard from "@/components/ConversationCard.vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { Conversation, Project } from "@/types/conversation";
import type { MemoryFile } from "@/types/memory";

const route = useRoute();
const project = ref<Project | null>(null);
const conversations = ref<Conversation[]>([]);
const memoryFiles = ref<MemoryFile[]>([]);
const loading = ref(true);

onMounted(async () => {
  const id = route.params.id as string;
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  if (res.ok) {
    const json = await res.json();
    project.value = json.project;
    conversations.value = json.conversations;
    memoryFiles.value = json.memoryFiles;
  }
  loading.value = false;
});
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
  margin-bottom: 1.5rem;
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

section {
  margin-bottom: 2rem;
}

section h2 {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.memory-list,
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
