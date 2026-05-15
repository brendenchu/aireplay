import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSession } from "../codex";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aireplay-codex-"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeJsonl(name: string, lines: object[]): string {
  const filePath = join(tmpDir, name);
  writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join("\n"), "utf-8");
  return filePath;
}

describe("codex parseSession", () => {
  test("parses a valid session with meta + user event + assistant response", async () => {
    const sessionId = "abcdef01-2345-6789-abcd-ef0123456789";
    const filePath = writeJsonl(`rollout-2026-01-01-${sessionId}.jsonl`, [
      {
        type: "session_meta",
        timestamp: "2026-01-01T10:00:00Z",
        payload: { id: sessionId, cwd: "/Users/test/project" },
      },
      {
        type: "event_msg",
        timestamp: "2026-01-01T10:00:01Z",
        payload: { type: "user_message", message: "What is 2 + 2?" },
      },
      {
        type: "response_item",
        timestamp: "2026-01-01T10:00:02Z",
        payload: { type: "message", role: "assistant", content: "4" },
      },
    ]);

    const result = await parseSession(filePath);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(`codex:${sessionId}`);
    expect(result?.provider).toBe("codex");
    expect(result?.sessionId).toBe(sessionId);
    expect(result?.projectPath).toBe("/Users/test/project");
    expect(result?.projectName).toBe("project");
    expect(result?.messageCount).toBe(2);
    expect(result?.title).toBe("What is 2 + 2?");
  });

  test("returns null for a file with no usable entries", async () => {
    const filePath = writeJsonl("empty.jsonl", [{ type: "unrelated", payload: { foo: "bar" } }]);
    expect(await parseSession(filePath)).toBeNull();
  });

  test("returns null without throwing for unreadable paths", async () => {
    expect(await parseSession(join(tmpDir, "missing.jsonl"))).toBeNull();
  });

  test("malformed JSONL lines are skipped", async () => {
    const filePath = join(tmpDir, "malformed.jsonl");
    const sessionId = "11111111-1111-1111-1111-111111111111";
    writeFileSync(
      filePath,
      [
        "not-json",
        JSON.stringify({
          type: "session_meta",
          payload: { id: sessionId, cwd: "/tmp" },
        }),
        "{broken",
        JSON.stringify({
          type: "event_msg",
          payload: { type: "user_message", message: "hi" },
        }),
      ].join("\n"),
      "utf-8",
    );
    const result = await parseSession(filePath);
    expect(result?.sessionId).toBe(sessionId);
    expect(result?.messageCount).toBe(1);
  });
});
