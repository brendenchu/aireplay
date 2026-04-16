<template>
  <header class="mb-6">
    <RouterLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary no-underline"
    >
      <ArrowLeft class="size-3" />
      Back
    </RouterLink>
    <div class="flex flex-wrap items-center justify-between gap-4" :class="{ 'mt-2': backTo }">
      <h2 :class="backTo ? 'text-xl font-semibold' : 'text-2xl font-semibold'">{{ title }}</h2>
      <slot name="actions" />
    </div>
    <slot />
  </header>
</template>

<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";

defineProps<{
  title: string;
  backTo?: string;
}>();
</script>
