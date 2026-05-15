import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSession } from "../copilot-cli";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aireplay-copilot-cli-"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function setupSession(sessionDirName: string, workspaceYaml: string, events: object[]): string {
  const sessionDir = join(tmpDir, sessionDirName);
  mkdirSync(sessionDir, { recursive: true });
  if (workspaceYaml) {
    writeFileSync(join(sessionDir, "workspace.yaml"), workspaceYaml, "utf-8");
  }
  const eventsPath = join(sessionDir, "events.jsonl");
  writeFileSync(eventsPath, events.map((e) => JSON.stringify(e)).join("\n"), "utf-8");
  return eventsPath;
}

describe("copilot-cli parseSession", () => {
  test("parses a valid session with workspace.yaml + user + assistant events", async () => {
    const eventsPath = setupSession(
      "abc123",
      ["id: real-session-id", "cwd: /Users/test/repo", "summary: Refactoring helpers"].join("\n"),
      [
        { type: "session.start", id: "e1", timestamp: "2026-01-01T10:00:00Z", data: {} },
        {
          type: "user.message",
          id: "e2",
          timestamp: "2026-01-01T10:00:01Z",
          data: { content: "Help me refactor" },
        },
        {
          type: "assistant.message",
          id: "e3",
          timestamp: "2026-01-01T10:00:02Z",
          data: { content: "Sure, here's a plan" },
        },
      ],
    );

    const result = await parseSession(eventsPath);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("copilot-cli:real-session-id");
    expect(result?.provider).toBe("copilot-cli");
    expect(result?.sessionId).toBe("real-session-id");
    expect(result?.projectPath).toBe("/Users/test/repo");
    expect(result?.projectName).toBe("repo");
    expect(result?.title).toBe("Refactoring helpers");
    expect(result?.messageCount).toBe(2);
  });

  test("falls back to dir name + first user message when workspace.yaml is missing", async () => {
    const eventsPath = setupSession("fallback-session", "", [
      {
        type: "user.message",
        id: "e1",
        timestamp: "2026-01-01T10:00:00Z",
        data: { content: "Hello" },
      },
    ]);

    const result = await parseSession(eventsPath);
    expect(result?.sessionId).toBe("fallback-session");
    expect(result?.title).toBe("Hello");
  });

  test("missing events file degrades to an empty conversation, no throw", async () => {
    const result = await parseSession(join(tmpDir, "ghost/events.jsonl"));
    expect(result).not.toBeNull();
    expect(result?.messageCount).toBe(0);
    expect(result?.title).toBe("Untitled");
  });

  test("malformed event lines are skipped", async () => {
    const sessionDir = join(tmpDir, "malformed-session");
    mkdirSync(sessionDir, { recursive: true });
    const eventsPath = join(sessionDir, "events.jsonl");
    writeFileSync(
      eventsPath,
      [
        "not-json",
        JSON.stringify({
          type: "user.message",
          id: "e1",
          timestamp: "2026-01-01T10:00:00Z",
          data: { content: "hi" },
        }),
        "{broken",
      ].join("\n"),
      "utf-8",
    );
    const result = await parseSession(eventsPath);
    expect(result?.messageCount).toBe(1);
  });
});
