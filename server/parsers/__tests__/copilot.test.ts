import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invalidateWorkspaceCache, parseSession } from "../copilot";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aireplay-copilot-"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  invalidateWorkspaceCache();
});

function writeSession(name: string, data: object): string {
  const filePath = join(tmpDir, name);
  writeFileSync(filePath, JSON.stringify(data), "utf-8");
  return filePath;
}

describe("copilot (VS Code) parseSession", () => {
  test("parses an old-format session with string message/response", async () => {
    const filePath = writeSession("a1b2c3.jsonl", {
      sessionId: "vs-session-1",
      customTitle: "Helping with tests",
      creationDate: Date.UTC(2026, 0, 1),
      requests: [
        {
          message: "How do I write a test?",
          response: "Use bun test",
          timestamp: Date.UTC(2026, 0, 1, 10),
        },
      ],
    });

    const result = await parseSession(filePath);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("copilot:vs-session-1");
    expect(result?.provider).toBe("copilot");
    expect(result?.title).toBe("Helping with tests");
    expect(result?.messageCount).toBe(2);
    expect(result?.messages[0].role).toBe("user");
    expect(result?.messages[0].content).toBe("How do I write a test?");
    expect(result?.messages[1].role).toBe("assistant");
    expect(result?.messages[1].content).toBe("Use bun test");
  });

  test("falls back to first message text when customTitle is absent", async () => {
    const filePath = writeSession("notitle.jsonl", {
      requests: [{ message: "Hello world", response: "Hi" }],
    });
    const result = await parseSession(filePath);
    expect(result?.title).toBe("Hello world");
  });

  test("supports new-format messages and response parts", async () => {
    const filePath = writeSession("newfmt.jsonl", {
      sessionId: "vs-new",
      requests: [
        {
          message: { text: "Explain something" },
          response: [{ value: "First half. " }, { value: "Second half." }],
        },
      ],
    });
    const result = await parseSession(filePath);
    expect(result?.messages[0].content).toBe("Explain something");
    expect(result?.messages[1].content).toBe("First half. Second half.");
  });

  test("returns null for empty requests", async () => {
    const filePath = writeSession("empty.jsonl", { requests: [] });
    expect(await parseSession(filePath)).toBeNull();
  });

  test("returns null without throwing for unreadable paths", async () => {
    expect(await parseSession(join(tmpDir, "ghost.jsonl"))).toBeNull();
  });

  test("malformed first line returns null instead of throwing", async () => {
    const filePath = join(tmpDir, "broken.jsonl");
    writeFileSync(filePath, "not-json-at-all", "utf-8");
    expect(await parseSession(filePath)).toBeNull();
  });

  test("incremental-changelog (kind 2) format replays requests array", async () => {
    // First line is the base session; subsequent lines push into requests
    const filePath = join(tmpDir, "incremental.jsonl");
    mkdirSync(join(tmpDir, "incremental-dir"), { recursive: true });
    writeFileSync(
      filePath,
      [
        JSON.stringify({ sessionId: "vs-inc", requests: [] }),
        JSON.stringify({ kind: 2, k: ["requests"], v: [{ message: "hi", response: "hello" }] }),
      ].join("\n"),
      "utf-8",
    );
    const result = await parseSession(filePath);
    expect(result?.messageCount).toBe(2);
    expect(result?.messages[0].content).toBe("hi");
  });
});
