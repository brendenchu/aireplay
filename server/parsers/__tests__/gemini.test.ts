import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSession } from "../gemini";

let tmpDir: string;
let chatsDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aireplay-gemini-"));
  // Gemini parser expects path shape .../tmp/{workspace}/chats/{file}
  chatsDir = join(tmpDir, "workspace-a", "chats");
  mkdirSync(chatsDir, { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("gemini parseSession", () => {
  test("parses a valid .json session with messages array", async () => {
    const filePath = join(chatsDir, "session-old.json");
    writeFileSync(
      filePath,
      JSON.stringify({
        sessionId: "g-session-1",
        startTime: "2026-01-01T10:00:00Z",
        lastUpdated: "2026-01-01T10:05:00Z",
        messages: [
          { id: "m1", timestamp: "2026-01-01T10:00:01Z", type: "user", content: "Hello" },
          { id: "m2", timestamp: "2026-01-01T10:00:02Z", type: "model", content: "Hi there" },
        ],
      }),
      "utf-8",
    );

    const result = await parseSession(filePath);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("gemini:g-session-1");
    expect(result?.provider).toBe("gemini");
    expect(result?.title).toBe("Hello");
    expect(result?.messageCount).toBe(2);
    expect(result?.messages[0].role).toBe("user");
    expect(result?.messages[1].role).toBe("assistant");
  });

  test("parses a valid .jsonl session with header line + message lines", async () => {
    const filePath = join(chatsDir, "session-new.jsonl");
    writeFileSync(
      filePath,
      [
        JSON.stringify({
          sessionId: "g-session-2",
          startTime: "2026-02-01T10:00:00Z",
          lastUpdated: "2026-02-01T10:05:00Z",
        }),
        JSON.stringify({
          id: "m1",
          timestamp: "2026-02-01T10:00:01Z",
          type: "user",
          content: [{ text: "Hello again" }],
        }),
        JSON.stringify({
          id: "m2",
          timestamp: "2026-02-01T10:00:02Z",
          type: "model",
          content: "Hi",
        }),
        // mutation lines should be ignored
        JSON.stringify({ $set: { something: 1 } }),
      ].join("\n"),
      "utf-8",
    );

    const result = await parseSession(filePath);
    expect(result?.sessionId).toBe("g-session-2");
    expect(result?.messageCount).toBe(2);
    expect(result?.title).toBe("Hello again");
  });

  test("returns null when header is missing", async () => {
    const filePath = join(chatsDir, "no-header.jsonl");
    writeFileSync(filePath, JSON.stringify({ id: "m1", type: "user", content: "hi" }), "utf-8");
    expect(await parseSession(filePath)).toBeNull();
  });

  test("returns null without throwing for unreadable paths", async () => {
    expect(await parseSession(join(chatsDir, "ghost.json"))).toBeNull();
  });

  test("malformed .jsonl lines are skipped, header still parsed", async () => {
    const filePath = join(chatsDir, "malformed.jsonl");
    writeFileSync(
      filePath,
      [
        "not-json",
        JSON.stringify({
          sessionId: "g-malformed",
          startTime: "2026-03-01T10:00:00Z",
        }),
        "{broken",
        JSON.stringify({
          id: "m1",
          timestamp: "2026-03-01T10:00:01Z",
          type: "user",
          content: "hi",
        }),
      ].join("\n"),
      "utf-8",
    );
    const result = await parseSession(filePath);
    expect(result?.sessionId).toBe("g-malformed");
    expect(result?.messageCount).toBe(1);
  });
});
