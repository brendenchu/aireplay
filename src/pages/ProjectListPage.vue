<template>
  <div>
    <PageHeader title="Projects" />

    <AsyncState
      :loading="loading"
      :error="error"
      :empty="projects.length === 0"
      empty-text="No projects found."
      :on-retry="reload"
    >
      <div class="flex flex-col gap-2">
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
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { listProjects } from "@/api/client";
import AsyncState from "@/components/AsyncState.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncResource } from "@/composables/useAsyncResource";

const { data, loading, error, load, reload } = useAsyncResource((signal) =>
  listProjects({ signal }),
);

const projects = computed(() => data.value?.data ?? []);

onMounted(load);
</script>
