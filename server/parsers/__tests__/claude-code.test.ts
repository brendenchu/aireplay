import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSession } from "../claude-code";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aireplay-claude-"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeJsonl(name: string, lines: object[]): string {
  const filePath = join(tmpDir, name);
  writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join("\n"), "utf-8");
  return filePath;
}

describe("claude-code parseSession", () => {
  test("parses a valid session with user + assistant entries", async () => {
    const filePath = writeJsonl("session-1.jsonl", [
      {
        type: "user",
        timestamp: "2026-01-01T10:00:00Z",
        message: { role: "user", content: "What is 2 + 2?" },
      },
      {
        type: "assistant",
        timestamp: "2026-01-01T10:00:05Z",
        message: { role: "assistant", content: "4" },
      },
    ]);

    const result = await parseSession(filePath);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("claude-code:session-1");
    expect(result?.provider).toBe("claude-code");
    expect(result?.sessionId).toBe("session-1");
    expect(result?.messageCount).toBe(2);
    expect(result?.title).toBe("What is 2 + 2?");
    expect(result?.filePath).toBe(filePath);
    expect(result?.messages[0].role).toBe("user");
    expect(result?.messages[1].role).toBe("assistant");
  });

  test("prefers ai-title over first-user fallback", async () => {
    const filePath = writeJsonl("session-2.jsonl", [
      { type: "user", message: { role: "user", content: "Long first message…" } },
      { type: "ai-title", aiTitle: "Math help" },
      { type: "assistant", message: { role: "assistant", content: "Sure" } },
    ]);

    const result = await parseSession(filePath);
    expect(result?.title).toBe("Math help");
  });

  test("returns null when there are no message entries", async () => {
    const filePath = writeJsonl("session-empty.jsonl", [{ type: "ai-title", aiTitle: "Only" }]);
    expect(await parseSession(filePath)).toBeNull();
  });

  test("returns null without throwing for unreadable paths", async () => {
    const result = await parseSession(join(tmpDir, "does-not-exist.jsonl"));
    expect(result).toBeNull();
  });

  test("malformed JSONL lines are skipped, not fatal", async () => {
    const filePath = join(tmpDir, "malformed.jsonl");
    writeFileSync(
      filePath,
      [
        "not-json",
        JSON.stringify({ type: "user", message: { role: "user", content: "hi" } }),
        "{broken",
      ].join("\n"),
      "utf-8",
    );
    const result = await parseSession(filePath);
    expect(result?.messageCount).toBe(1);
  });

  test("sidechain and meta entries are filtered out", async () => {
    const filePath = writeJsonl("session-sidechain.jsonl", [
      {
        type: "user",
        message: { role: "user", content: "main" },
      },
      {
        type: "assistant",
        isSidechain: true,
        message: { role: "assistant", content: "side" },
      },
      {
        type: "user",
        isMeta: true,
        message: { role: "user", content: "meta" },
      },
    ]);
    const result = await parseSession(filePath);
    expect(result?.messageCount).toBe(1);
  });
});
