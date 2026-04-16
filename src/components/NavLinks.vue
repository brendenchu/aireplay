<template>
  <RouterLink
    v-for="link in links"
    :key="link.to"
    :to="link.to"
    class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-primary"
    @click="$emit('navigate')"
  >
    <component :is="link.icon" class="size-4" />
    {{ link.label }}
  </RouterLink>

  <div class="mt-auto pt-4 border-t border-border">
    <button
      class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground w-full"
      @click="cycleTheme"
    >
      <component :is="themeIcon" class="size-4" />
      {{ themeLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  Brain,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-vue-next";
import { computed } from "vue";
import { type Theme, useTheme } from "@/composables/useTheme";

defineEmits<{ navigate: [] }>();

const { theme } = useTheme();

const themeIcon = computed(() => {
  if (theme.value === "light") return Sun;
  if (theme.value === "dark") return Moon;
  return Monitor;
});

const themeLabel = computed(() => {
  if (theme.value === "light") return "Light";
  if (theme.value === "dark") return "Dark";
  return "System";
});

const order: Theme[] = ["system", "light", "dark"];
function cycleTheme() {
  const idx = order.indexOf(theme.value);
  theme.value = order[(idx + 1) % order.length];
}

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/memory", label: "Memory", icon: Brain },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
];
</script>
