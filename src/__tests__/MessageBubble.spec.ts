import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import MessageBubble from "../components/MessageBubble.vue";
import type { Message } from "../types/conversation";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "test:0",
    role: "user",
    content: "hello",
    timestamp: "2026-01-01T10:00:00Z",
    provider: "claude-code",
    ...overrides,
  };
}

describe("MessageBubble", () => {
  test("renders a user message as plain text", () => {
    const wrapper = mount(MessageBubble, { props: { message: makeMessage() } });
    expect(wrapper.text()).toContain("hello");
    expect(wrapper.text()).toContain("user");
  });

  test("renders assistant markdown as HTML", () => {
    const message = makeMessage({
      role: "assistant",
      content: "**bold** and `code`",
    });
    const wrapper = mount(MessageBubble, { props: { message } });
    expect(wrapper.html()).toContain("<strong>bold</strong>");
    expect(wrapper.html()).toContain("<code>code</code>");
  });

  test("flattens custom XML tags into collapsible context blocks", () => {
    const message = makeMessage({
      content: "main text <ide_opened_file>/path/to/file.ts</ide_opened_file> more",
    });
    const wrapper = mount(MessageBubble, { props: { message } });
    expect(wrapper.text()).toContain("ide opened file");
    expect(wrapper.text()).not.toContain("</ide_opened_file>");
  });

  test("renders tool-call panels for assistant messages with toolCalls", () => {
    const message = makeMessage({
      role: "assistant",
      content: "running a tool",
      toolCalls: [{ name: "Read", input: '{"path":"file.ts"}', output: "file contents" }],
    });
    const wrapper = mount(MessageBubble, { props: { message } });
    expect(wrapper.text()).toContain("Read");
  });
});
