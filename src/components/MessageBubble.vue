<template>
  <div
    class="rounded-2xl p-3 max-w-full break-words"
    :class="message.role === 'user'
      ? 'bg-primary text-primary-foreground rounded-br-sm'
      : 'bg-card ring-1 ring-foreground/10 rounded-bl-sm'"
  >
    <div class="text-[0.7rem] uppercase opacity-60 mb-1">{{ message.role }}</div>
    <div
      class="text-sm leading-relaxed"
      :class="message.role === 'assistant' ? 'prose-bubble' : 'whitespace-pre-wrap'"
      v-html="renderedContent"
    ></div>
    <div v-if="contextBlocks.length || message.toolCalls?.length" class="mt-2 space-y-1">
      <Collapsible v-for="(block, i) in contextBlocks" :key="'ctx-' + i" v-slot="{ open }">
        <CollapsibleTrigger class="flex items-center gap-1 text-xs opacity-70 font-mono cursor-pointer hover:opacity-100">
          <ChevronRight class="size-3 transition-transform" :class="open && 'rotate-90'" />
          {{ block.label }}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre class="text-xs bg-black/20 p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto max-h-40 overflow-y-auto">{{ block.body }}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
    <div v-if="message.toolCalls?.length" class="mt-2 space-y-1">
      <Collapsible v-for="(tc, i) in message.toolCalls" :key="i" v-slot="{ open }">
        <CollapsibleTrigger class="flex items-center gap-1 text-xs opacity-70 font-mono cursor-pointer hover:opacity-100">
          <ChevronRight class="size-3 transition-transform" :class="open && 'rotate-90'" />
          {{ tc.name }}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre class="text-xs bg-black/20 p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto">{{ formatToolInput(tc.input) }}</pre>
          <pre v-if="tc.output" class="text-xs bg-black/20 p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto border-l-2 border-primary">{{ tc.output }}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ChevronRight } from "lucide-vue-next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Message } from "@/types/conversation";

const props = defineProps<{ message: Message }>();

function formatToolInput(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

const CUSTOM_TAG_RE = /<([\w_-]+)>([\s\S]*?)<\/\1>/g;

interface ContextBlock {
  label: string;
  body: string;
}

const contextBlocks = computed<ContextBlock[]>(() => {
  const blocks: ContextBlock[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CUSTOM_TAG_RE.source, "g");
  while ((m = re.exec(props.message.content)) !== null) {
    blocks.push({
      label: m[1].replace(/_/g, " "),
      body: m[2].trim(),
    });
  }
  return blocks;
});

function stripCustomTags(text: string): string {
  return text.replace(CUSTOM_TAG_RE, "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const renderedContent = computed(() => {
  const content = stripCustomTags(props.message.content).trim();
  if (props.message.role === "assistant") {
    const raw = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }
  return escapeHtml(content);
});
</script>

