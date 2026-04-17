<template>
  <RouterLink
    :to="`/memory/${encodeURIComponent(file.id)}/edit`"
    class="block no-underline"
  >
    <Card class="px-4 transition-colors hover:border-primary cursor-pointer border-l-2 border-l-amber-400/60" size="sm">
      <CardContent class="p-0">
        <div class="flex items-center justify-between mb-1">
          <ProviderBadge :provider="file.provider" :small="true" />
          <span class="text-xs text-muted-foreground">{{ formatSize(file.sizeBytes) }}</span>
        </div>
        <div class="font-medium font-mono text-foreground">{{ file.name }}</div>
        <div class="flex gap-3 text-xs text-muted-foreground">
          <span v-if="file.projectName">{{ file.projectName }}</span>
          <span class="font-mono">{{ file.relativePath }}</span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>

<script setup lang="ts">
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Card, CardContent } from "@/components/ui/card";
import type { MemoryFile } from "@/types/memory";

defineProps<{ file: MemoryFile }>();

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
</script>
