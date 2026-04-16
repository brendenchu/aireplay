<template>
  <div class="message-bubble" :class="message.role">
    <div class="role-label">{{ message.role }}</div>
    <div class="content" v-html="renderedContent"></div>
    <div v-if="message.toolCalls?.length" class="tool-calls">
      <details v-for="(tc, i) in message.toolCalls" :key="i">
        <summary>{{ tc.name }}</summary>
        <pre class="tool-input">{{ JSON.stringify(tc.input, null, 2) }}</pre>
        <pre v-if="tc.output" class="tool-output">{{ tc.output }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "@/types/conversation";

const props = defineProps<{ message: Message }>();

const renderedContent = computed(() => {
  // Basic escaping then convert newlines to <br>
  const escaped = props.message.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br>");
});
</script>

<style scoped>
.message-bubble {
  border-radius: 8px;
  padding: 0.75rem 1rem;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-bubble.user {
  background: var(--color-accent);
  color: white;
  align-self: flex-end;
  border-radius: 8px 8px 2px 8px;
}

.message-bubble.assistant {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px 8px 8px 2px;
}

.role-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 0.25rem;
}

.content {
  font-size: 0.9rem;
  line-height: 1.5;
}

.tool-calls {
  margin-top: 0.5rem;
}

.tool-calls details {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.tool-calls summary {
  cursor: pointer;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.tool-input,
.tool-output {
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 0.25rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-output {
  border-left: 2px solid var(--color-accent);
}
</style>
