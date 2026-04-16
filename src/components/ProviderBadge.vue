<template>
  <span class="provider-badge" :class="[provider, { small }]">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ProviderId } from "@/types/provider";
import { PROVIDER_NAMES } from "@/types/provider";

const props = defineProps<{
  provider: ProviderId;
  small?: boolean;
}>();

const label = computed(() => PROVIDER_NAMES[props.provider] ?? props.provider);
</script>

<style scoped>
.provider-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
}

.provider-badge.small {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
}

.claude-code {
  background: #d4956b22;
  color: #d4956b;
}

.copilot {
  background: #7c6df022;
  color: #7c6df0;
}

.gemini {
  background: #4285f422;
  color: #4285f4;
}

.codex {
  background: #10a37f22;
  color: #10a37f;
}
</style>
