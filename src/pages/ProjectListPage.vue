<template>
  <div class="project-list-page">
    <h1>Projects</h1>

    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div v-if="projects.length === 0" class="empty">No projects found.</div>
      <div v-else class="list">
        <RouterLink
          v-for="project in projects"
          :key="project.id"
          :to="`/projects/${encodeURIComponent(project.id)}`"
          class="project-card"
        >
          <div class="project-name">{{ project.name }}</div>
          <div class="project-path">{{ project.path }}</div>
          <div class="project-meta">
            <ProviderBadge
              v-for="p in project.providers"
              :key="p"
              :provider="p"
              :small="true"
            />
            <span>{{ project.conversationCount }} conversations</span>
            <span>{{ project.memoryFileCount }} memory files</span>
          </div>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import type { Project } from "@/types/conversation";

const projects = ref<Project[]>([]);
const loading = ref(true);

onMounted(async () => {
  const res = await fetch("/api/projects");
  projects.value = (await res.json()).data;
  loading.value = false;
});
</script>

<style scoped>
.project-list-page h1 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-card {
  display: block;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  text-decoration: none;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.project-card:hover {
  border-color: var(--color-accent);
}

.project-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.project-path {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  margin-bottom: 0.5rem;
}

.project-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  align-items: center;
}

.loading,
.empty {
  color: var(--color-text-muted);
  padding: 2rem 0;
}
</style>
