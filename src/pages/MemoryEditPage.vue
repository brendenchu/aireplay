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
        <span v-if="saveMessage" class="text-sm text-primary">{{ saveMessage }}</span>
      </div>
    </template>

    <div v-else class="text-muted-foreground py-8">Memory file not found.</div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import ProviderBadge from "@/components/ProviderBadge.vue";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { MemoryFile } from "@/types/memory";

const route = useRoute();
const file = ref<MemoryFile | null>(null);
const content = ref("");
const loading = ref(true);
const saving = ref(false);
const saveMessage = ref("");

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

onMounted(async () => {
  const id = route.params.id as string;
  const res = await fetch(`/api/memory/${encodeURIComponent(id)}`);
  if (res.ok) {
    file.value = await res.json();
    content.value = file.value?.content ?? "";
  }
  loading.value = false;
});

async function save() {
  if (!file.value) return;
  saving.value = true;
  saveMessage.value = "";

  const res = await fetch(`/api/memory/${encodeURIComponent(file.value.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.value }),
  });

  if (res.ok) {
    file.value.content = content.value;
    saveMessage.value = "Saved";
    setTimeout(() => (saveMessage.value = ""), 2000);
  } else {
    const err = await res.json();
    saveMessage.value = `Error: ${err.error}`;
  }

  saving.value = false;
}
</script>
