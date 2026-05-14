<template>
  <Badge
    :class="[
      provider,
      small ? 'h-4 px-1.5 text-[0.65rem]' : 'h-5 px-2 text-xs',
    ]"
    variant="secondary"
  >
    {{ label }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import type { ProviderId } from "@/types/provider";
import { PROVIDER_NAMES } from "@/types/provider";

const props = defineProps<{
  provider: ProviderId;
  small?: boolean;
}>();

const label = computed(() => PROVIDER_NAMES[props.provider] ?? props.provider);
</script>

<style scoped>
.claude-code {
  background: #d4956b22;
  color: #d4956b;
  border-color: transparent;
}

.copilot {
  background: #7c6df022;
  color: #7c6df0;
  border-color: transparent;
}

.copilot-cli {
  background: #0d948822;
  color: #0d9488;
  border-color: transparent;
}

.gemini {
  background: #4285f422;
  color: #4285f4;
  border-color: transparent;
}

.codex {
  background: #10a37f22;
  color: #10a37f;
  border-color: transparent;
}
</style>
