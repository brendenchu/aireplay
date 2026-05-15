import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ConversationListPage from "../pages/ConversationListPage.vue";
import type { Conversation } from "../types/conversation";

const conversations: Conversation[] = [
  {
    id: "claude-code:one",
    provider: "claude-code",
    sessionId: "one",
    projectPath: "/repo-a",
    projectName: "repo-a",
    title: "First conversation",
    startedAt: "2026-01-01T10:00:00Z",
    lastMessageAt: "2026-01-01T11:00:00Z",
    messageCount: 4,
    filePath: "/x/one.jsonl",
  },
  {
    id: "codex:two",
    provider: "codex",
    sessionId: "two",
    projectPath: "/repo-b",
    projectName: "repo-b",
    title: "Second conversation",
    startedAt: "2026-01-02T10:00:00Z",
    lastMessageAt: "2026-01-02T11:00:00Z",
    messageCount: 9,
    filePath: "/x/two.jsonl",
  },
];

const globalConfig = {
  stubs: {
    RouterLink: { template: "<a><slot /></a>" },
    Select: { template: "<div><slot /></div>" },
    SelectTrigger: { template: "<div><slot /></div>" },
    SelectContent: { template: "<div><slot /></div>" },
    SelectItem: { template: "<div><slot /></div>" },
    SelectValue: { template: "<div><slot /></div>" },
  },
};

describe("ConversationListPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: conversations }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows loading state then renders fetched conversations", async () => {
    const wrapper = mount(ConversationListPage, { global: globalConfig });

    expect(wrapper.text()).toContain("Loading");

    await flushPromises();

    expect(wrapper.text()).not.toContain("Loading");
    expect(wrapper.text()).toContain("First conversation");
    expect(wrapper.text()).toContain("Second conversation");
    expect(wrapper.text()).toContain("repo-a");
  });
});
