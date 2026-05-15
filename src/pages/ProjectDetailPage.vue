<template>
  <div>
    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else-if="data">
      <PageHeader :title="data.project.name" back-to="/projects">
        <div class="flex gap-3 text-xs text-muted-foreground items-center mt-1">
          <span class="font-mono">{{ data.project.path }}</span>
          <ProviderBadge v-for="p in data.project.providers" :key="p" :provider="p" />
        </div>
      </PageHeader>

      <section v-if="data.memoryFiles.length > 0" class="mb-8">
        <h3 class="text-base text-muted-foreground mb-3">Memory Files</h3>
        <div class="flex flex-col gap-2">
          <MemoryFileCard v-for="mem in data.memoryFiles" :key="mem.id" :file="mem" />
        </div>
      </section>

      <section class="mb-8">
        <h3 class="text-base text-muted-foreground mb-3">Conversations ({{ data.conversations.length }})</h3>
        <div class="flex flex-col gap-2">
          <ConversationCard
            v-for="convo in data.conversations"
            :key="convo.id"
            :conversation="convo"
          />
        </div>
      </section>
    </template>

    <div v-else-if="error?.isNotFound" class="text-muted-foreground py-8">Project not found.</div>

    <div v-else-if="error" class="py-8">
      <div class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div class="font-medium text-destructive mb-1">Couldn't load this project</div>
        <div class="text-muted-foreground mb-3">{{ error.message }}</div>
        <Button size="sm" variant="outline" @click="reload">Retry</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { getProject } from "@/api/client";
import ConversationCard from "@/components/ConversationCard.vue";
import MemoryFileCard from "@/components/MemoryFileCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/composables/useAsyncResource";

const route = useRoute();

const { data, loading, error, load, reload } = useAsyncResource((signal) =>
  getProject(route.params.id as string, { signal }),
);

onMounted(load);
</script>
