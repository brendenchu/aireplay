import { describe, expect, test } from "bun:test";
import {
  compareLastMessageDesc,
  flattenTextContent,
  isMessageRole,
  isRecord,
  parseJsonlLines,
  truncateTitle,
} from "../_shared";

describe("isRecord", () => {
  test("accepts plain objects only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe("isMessageRole", () => {
  test("accepts user, assistant, system", () => {
    expect(isMessageRole("user")).toBe(true);
    expect(isMessageRole("assistant")).toBe(true);
    expect(isMessageRole("system")).toBe(true);
  });

  test("rejects everything else", () => {
    expect(isMessageRole("tool")).toBe(false);
    expect(isMessageRole("")).toBe(false);
    expect(isMessageRole(null)).toBe(false);
    expect(isMessageRole(undefined)).toBe(false);
  });
});

describe("parseJsonlLines", () => {
  test("parses well-formed JSONL", () => {
    const raw = '{"a":1}\n{"b":2}\n';
    expect(parseJsonlLines(raw)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  test("skips blank lines and malformed entries", () => {
    const raw = '{"a":1}\n\nnot-json\n{"b":2}\n';
    expect(parseJsonlLines(raw)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  test("mapper can filter entries by returning null", () => {
    const raw = '{"keep":true}\n{"keep":false}\n';
    const result = parseJsonlLines<{ keep: true }>(raw, (v) =>
      isRecord(v) && v.keep === true ? (v as { keep: true }) : null,
    );
    expect(result).toEqual([{ keep: true }]);
  });

  test("returns empty array for empty input", () => {
    expect(parseJsonlLines("")).toEqual([]);
    expect(parseJsonlLines("\n\n")).toEqual([]);
  });
});

describe("truncateTitle", () => {
  test("returns short strings unchanged", () => {
    expect(truncateTitle("Hello")).toBe("Hello");
  });

  test("trims whitespace", () => {
    expect(truncateTitle("  Hello  ")).toBe("Hello");
  });

  test("truncates with ellipsis past max length", () => {
    const long = "a".repeat(100);
    const result = truncateTitle(long, 10);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBe(11);
  });
});

describe("flattenTextContent", () => {
  test("returns plain strings as-is", () => {
    expect(flattenTextContent("hello")).toBe("hello");
  });

  test("extracts .text from objects", () => {
    expect(flattenTextContent({ text: "foo" })).toBe("foo");
  });

  test("extracts .content from objects", () => {
    expect(flattenTextContent({ content: "bar" })).toBe("bar");
  });

  test("joins array parts with newlines", () => {
    expect(flattenTextContent(["one", { text: "two" }, "three"])).toBe("one\ntwo\nthree");
  });

  test("returns empty string for non-text input", () => {
    expect(flattenTextContent(null)).toBe("");
    expect(flattenTextContent(42)).toBe("");
    expect(flattenTextContent({})).toBe("");
  });
});

describe("compareLastMessageDesc", () => {
  test("sorts most-recent first by ISO timestamp", () => {
    const items = [
      { lastMessageAt: "2026-01-01T00:00:00Z" },
      { lastMessageAt: "2026-03-01T00:00:00Z" },
      { lastMessageAt: "2026-02-01T00:00:00Z" },
    ];
    items.sort(compareLastMessageDesc);
    expect(items.map((i) => i.lastMessageAt)).toEqual([
      "2026-03-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
      "2026-01-01T00:00:00Z",
    ]);
  });
});
