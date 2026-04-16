<template>
  <div>
    <Input
      type="text"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      @keydown.enter="$emit('search')"
      placeholder="Search conversations and memory…"
      class="h-10"
    />
  </div>
</template>

<script setup lang="ts">
import { Input } from "@/components/ui/input";

defineProps<{ modelValue: string }>();
defineEmits<{
  "update:modelValue": [value: string | number];
  search: [];
}>();
</script>
