import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import ConversationCard from "../components/ConversationCard.vue";
import MemoryFileCard from "../components/MemoryFileCard.vue";
import type { Conversation } from "../types/conversation";
import type { MemoryFile } from "../types/memory";

const globalStubs = { RouterLink: { template: "<a><slot /></a>" } };

const sampleConversation: Conversation = {
  id: "claude-code:abc",
  provider: "claude-code",
  sessionId: "abc",
  projectPath: "/Users/test/repo",
  projectName: "repo",
  title: "Sample conversation",
  startedAt: "2026-01-01T10:00:00Z",
  lastMessageAt: "2026-01-01T10:05:00Z",
  messageCount: 7,
  filePath: "/Users/test/.claude/projects/abc.jsonl",
};

const sampleMemoryFile: MemoryFile = {
  id: "claude-code:CLAUDE.md",
  provider: "claude-code",
  filePath: "/Users/test/.claude/CLAUDE.md",
  relativePath: "CLAUDE.md",
  projectPath: null,
  projectName: null,
  name: "CLAUDE.md",
  content: "# Memory",
  updatedAt: "2026-01-01T10:00:00Z",
  sizeBytes: 2048,
};

describe("ConversationCard", () => {
  test("renders title, project, message count, and provider", () => {
    const wrapper = mount(ConversationCard, {
      props: { conversation: sampleConversation },
      global: { stubs: globalStubs },
    });
    expect(wrapper.text()).toContain("Sample conversation");
    expect(wrapper.text()).toContain("repo");
    expect(wrapper.text()).toContain("7 messages");
    expect(wrapper.text()).toContain("Claude Code");
  });
});

describe("MemoryFileCard", () => {
  test("renders filename, relative path, and formatted size", () => {
    const wrapper = mount(MemoryFileCard, {
      props: { file: sampleMemoryFile },
      global: { stubs: globalStubs },
    });
    expect(wrapper.text()).toContain("CLAUDE.md");
    expect(wrapper.text()).toContain("2.0 KB");
  });
});
