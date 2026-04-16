<template>
  <div class="search-bar">
    <input
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.enter="$emit('search')"
      placeholder="Search conversations and memory…"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>();
defineEmits<{
  "update:modelValue": [value: string];
  search: [];
}>();
</script>

<style scoped>
.search-bar input {
  width: 100%;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
}

.search-bar input:focus {
  border-color: var(--color-accent);
}

.search-bar input::placeholder {
  color: var(--color-text-muted);
}
</style>
