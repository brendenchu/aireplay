<template>
  <div>
    <PageHeader title="Settings" />

    <section class="mb-8">
      <h3 class="text-base text-muted-foreground mb-2">Sync</h3>
      <p class="text-sm text-muted-foreground mb-3">Re-scan all provider data sources and rebuild the search index.</p>
      <Button @click="sync" :disabled="syncing">
        {{ syncing ? 'Syncing…' : 'Sync Now' }}
      </Button>
      <div v-if="syncResult" class="mt-3 text-xs text-muted-foreground flex flex-col gap-1">
        <div v-for="(stats, provider) in syncResult.providers" :key="provider">
          <strong>{{ provider }}</strong>:
          {{ stats.conversations }} conversations,
          {{ stats.memoryFiles }} memory files
          ({{ stats.duration }}ms)
        </div>
      </div>
    </section>

    <Separator class="mb-8" />

    <section class="mb-8">
      <h3 class="text-base text-muted-foreground mb-3">Providers</h3>
      <div v-if="providers.length === 0" class="text-muted-foreground py-4">Loading…</div>
      <div v-else class="flex flex-col gap-2">
        <div v-for="p in providers" :key="p.id" class="flex gap-3 items-center text-sm">
          <ProviderBadge :provider="p.id" />
          <span :class="p.available ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'">
            {{ p.available ? 'Available' : 'Not found' }}
          </span>
        </div>
      </div>
    </section>

    <Separator class="mb-8" />

    <section class="mb-8">
      <h3 class="text-base text-muted-foreground mb-3">Appearance</h3>
      <div class="flex gap-2 mb-4">
        <Button
          v-for="opt in themeOptions"
          :key="opt.value"
          :variant="theme === opt.value ? 'default' : 'outline'"
          size="sm"
          @click="theme = opt.value"
        >
          <component :is="opt.icon" class="size-4 mr-1.5" />
          {{ opt.label }}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground mb-2">Accent color</p>
      <div class="flex gap-2">
        <button
          v-for="(palette, key) in accentPalettes"
          :key="key"
          :title="palette.label"
          class="size-7 rounded-full border-2 transition-transform hover:scale-110"
          :class="accentColor === key ? 'border-foreground scale-110' : 'border-transparent'"
          :style="{ backgroundColor: palette.light }"
          @click="accentColor = key"
        />
      </div>
    </section>

    <Separator class="mb-8" />

    <section class="mb-8">
      <h3 class="text-base text-muted-foreground mb-2">About</h3>
      <p class="text-sm text-muted-foreground">aireplay v{{ version }} — local AI conversation browser. All data stays on your machine.</p>
      <p class="text-sm text-muted-foreground mt-1">Built by <a href="https://github.com/brendenchu" class="text-primary underline" target="_blank" rel="noopener">Brenden Chu</a></p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Moon, Sun } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type AccentColor, accentPalettes, useAccentColor } from "@/composables/useAccentColor";
import { type Theme, useTheme } from "@/composables/useTheme";
import type { ProviderStatus } from "@/types/provider";

const { theme } = useTheme();
const { accentColor } = useAccentColor();
const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const providers = ref<ProviderStatus[]>([]);
const syncing = ref(false);
const version = __APP_VERSION__;
interface SyncProviderStats {
  conversations: number;
  memoryFiles: number;
  duration: number;
}

const syncResult = ref<{ providers: Record<string, SyncProviderStats> } | null>(null);

onMounted(async () => {
  try {
    const res = await fetch("/api/sync/status");
    providers.value = (await res.json()).providers;
  } catch {
    // leave empty
  }
});

async function sync() {
  syncing.value = true;
  syncResult.value = null;

  try {
    const res = await fetch("/api/sync", { method: "POST" });
    syncResult.value = await res.json();

    // Refresh provider status
    const statusRes = await fetch("/api/sync/status");
    providers.value = (await statusRes.json()).providers;
  } catch {
    // leave previous state
  } finally {
    syncing.value = false;
  }
}
</script>
