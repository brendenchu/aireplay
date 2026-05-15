<template>
  <div>
    <div v-if="loading" class="text-muted-foreground py-8">Loading…</div>

    <template v-else-if="file">
      <PageHeader :title="file.name" back-to="/memory">
        <div class="flex gap-3 text-xs text-muted-foreground items-center mt-1">
          <ProviderBadge :provider="file.provider" />
          <span v-if="file.projectName">{{ file.projectName }}</span>
          <span class="font-mono">{{ file.relativePath }}</span>
        </div>
      </PageHeader>

      <div v-if="frontmatter.length" class="flex flex-col gap-1 text-xs text-muted-foreground mb-3">
        <div v-for="({ key, value }) in frontmatter" :key="key">
          <span class="font-medium text-foreground">{{ key }}</span>
          <span class="ml-1">{{ value }}</span>
        </div>
      </div>

      <Tabs default-value="edit" class="mb-4">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            v-model="content"
            spellcheck="false"
            class="h-[60vh] font-mono text-sm leading-relaxed resize-none overflow-y-auto"
            :class="{ 'border-primary ring-1 ring-primary/50': content !== file.content }"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div
            class="prose-bubble h-[60vh] rounded-md border border-border bg-card p-4 text-sm leading-relaxed overflow-y-auto"
            v-html="previewHtml"
          ></div>
        </TabsContent>
      </Tabs>

      <div class="flex gap-3 items-center">
        <Button
          @click="save"
          :disabled="saving || content === file.content"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </Button>
        <Button
          variant="outline"
          @click="content = file.content"
          :disabled="content === file.content"
        >
          Reset
        </Button>
        <span v-if="saveMessage" class="text-sm" :class="saveError ? 'text-destructive' : 'text-primary'">{{ saveMessage }}</span>
      </div>
    </template>

    <div v-else-if="error?.isNotFound" class="text-muted-foreground py-8">Memory file not found.</div>

    <div v-else-if="error" class="py-8">
      <div class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div class="font-medium text-destructive mb-1">Couldn't load this file</div>
        <div class="text-muted-foreground mb-3">{{ error.message }}</div>
        <Button size="sm" variant="outline" @click="reloadFile">Retry</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import { ApiError, getMemoryFile, saveMemoryFile } from "@/api/client";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncResource } from "@/composables/useAsyncResource";

const route = useRoute();
const content = ref("");
const saving = ref(false);
const saveMessage = ref("");
const saveError = ref(false);

const {
  data: file,
  loading,
  error,
  load: loadFile,
  reload: reloadFile,
} = useAsyncResource((signal) => getMemoryFile(route.params.id as string, { signal }));

watch(file, (next) => {
  if (next) content.value = next.content;
});

const hasUnsavedChanges = computed(
  () => file.value !== null && content.value !== file.value.content,
);

function beforeUnloadHandler(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm("You have unsaved changes. Leave anyway?");
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnloadHandler);
});

const frontmatter = computed<{ key: string; value: string }[]>(() => {
  const m = content.value.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    })
    .filter((entry): entry is { key: string; value: string } => entry !== null && entry.key !== "");
});

const previewHtml = computed(() => {
  const stripped = content.value.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const raw = marked.parse(stripped, { async: false }) as string;
  return DOMPurify.sanitize(raw);
});

onMounted(() => {
  window.addEventListener("beforeunload", beforeUnloadHandler);
  loadFile();
});

async function save() {
  if (!file.value) return;
  saving.value = true;
  saveMessage.value = "";
  saveError.value = false;

  try {
    await saveMemoryFile(file.value.id, content.value);
    file.value.content = content.value;
    saveMessage.value = "Saved";
    setTimeout(() => (saveMessage.value = ""), 2000);
  } catch (err) {
    saveError.value = true;
    saveMessage.value = err instanceof ApiError ? `Error: ${err.message}` : "Error: save failed";
  } finally {
    saving.value = false;
  }
}
</script>
