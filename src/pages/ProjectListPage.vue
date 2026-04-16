<template>
  <div>
    <PageHeader title="Projects" />

    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else>
      <div v-if="projects.length === 0" class="text-muted-foreground py-8">No projects found.</div>
      <div v-else class="flex flex-col gap-2">
        <RouterLink
          v-for="project in projects"
          :key="project.id"
          :to="`/projects/${encodeURIComponent(project.id)}`"
          class="block no-underline"
        >
          <Card class="px-4 transition-colors hover:border-primary cursor-pointer" size="sm">
            <CardContent class="p-0">
              <div class="font-semibold text-foreground">{{ project.name }}</div>
              <div class="text-xs text-muted-foreground font-mono mb-2">{{ project.path }}</div>
              <div class="flex gap-3 text-xs text-muted-foreground items-center">
                <ProviderBadge
                  v-for="p in project.providers"
                  :key="p"
                  :provider="p"
                  :small="true"
                />
                <span>{{ project.conversationCount }} conversations</span>
                <span>{{ project.memoryFileCount }} memory files</span>
              </div>
            </CardContent>
          </Card>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Card, CardContent } from "@/components/ui/card";
import type { Project } from "@/types/conversation";

const projects = ref<Project[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await fetch("/api/projects");
    projects.value = (await res.json()).data;
  } catch {
    // leave empty
  } finally {
    loading.value = false;
  }
});
</script>
