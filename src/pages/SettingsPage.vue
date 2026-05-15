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
      <div v-if="syncErrorMessage" class="mt-3 text-sm text-destructive">{{ syncErrorMessage }}</div>
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
import { ApiError, getSyncStatus, runSync } from "@/api/client";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type AccentColor, accentPalettes, useAccentColor } from "@/composables/useAccentColor";
import { type Theme, useTheme } from "@/composables/useTheme";
import type { ProviderStatus } from "@/types/provider";
import type { SyncResult } from "@/types/sync";

const { theme } = useTheme();
const { accentColor } = useAccentColor();
const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const providers = ref<ProviderStatus[]>([]);
const syncing = ref(false);
const syncErrorMessage = ref<string | null>(null);
const version = __APP_VERSION__;
const syncResult = ref<SyncResult | null>(null);

async function refreshStatus() {
  try {
    const status = await getSyncStatus();
    providers.value = status.providers;
  } catch {
    // leave previous state
  }
}

onMounted(refreshStatus);

async function sync() {
  syncing.value = true;
  syncResult.value = null;
  syncErrorMessage.value = null;

  try {
    syncResult.value = await runSync();
    await refreshStatus();
  } catch (err) {
    syncErrorMessage.value = err instanceof ApiError ? err.message : "Sync failed";
  } finally {
    syncing.value = false;
  }
}
</script>
