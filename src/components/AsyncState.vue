<template>
  <div v-if="loading" class="text-muted-foreground py-8">{{ loadingText }}</div>
  <div v-else-if="error" class="py-8">
    <div class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div class="font-medium text-destructive mb-1">{{ errorHeading }}</div>
      <div class="text-muted-foreground mb-3">{{ error.message }}</div>
      <Button v-if="onRetry" size="sm" variant="outline" @click="onRetry">Retry</Button>
    </div>
  </div>
  <div v-else-if="empty" class="text-muted-foreground py-8">{{ emptyText }}</div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  loading: boolean;
  error: ApiError | null;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
  onRetry?: () => void;
}>();

const loadingText = computed(() => props.loadingText ?? "Loading…");
const emptyText = computed(() => props.emptyText ?? "No results.");
const errorHeading = computed(() => {
  if (!props.error) return "";
  if (props.error.isTransient) return "Something went wrong";
  return "Couldn't load this page";
});
</script>
