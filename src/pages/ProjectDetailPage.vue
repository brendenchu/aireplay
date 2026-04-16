<template>
  <div>
    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else-if="project">
      <PageHeader :title="project.name" back-to="/projects">
        <div class="flex gap-3 text-xs text-muted-foreground items-center mt-1">
          <span class="font-mono">{{ project.path }}</span>
          <ProviderBadge v-for="p in project.providers" :key="p" :provider="p" />
        </div>
      </PageHeader>

      <section v-if="memoryFiles.length > 0" class="mb-8">
        <h3 class="text-base text-muted-foreground mb-3">Memory Files</h3>
        <div class="flex flex-col gap-2">
          <MemoryFileCard v-for="mem in memoryFiles" :key="mem.id" :file="mem" />
        </div>
      </section>

      <section class="mb-8">
        <h3 class="text-base text-muted-foreground mb-3">Conversations ({{ conversations.length }})</h3>
        <div class="flex flex-col gap-2">
          <ConversationCard
            v-for="convo in conversations"
            :key="convo.id"
            :conversation="convo"
          />
        </div>
      </section>
    </template>

    <div v-else class="text-muted-foreground py-8">Project not found.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ConversationCard from "@/components/ConversationCard.vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import PageHeader from "@/components/PageHeader.vue";
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
