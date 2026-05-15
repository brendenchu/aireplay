import { describe, expect, test } from "bun:test";
import { PROVIDER_IDS } from "../../../src/types/provider";
import { findParser, findParserById, PARSERS } from "../index";

describe("ProviderParser registry contract", () => {
  test("every parser has a unique ProviderId from PROVIDER_IDS", () => {
    const ids = PARSERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(PROVIDER_IDS).toContain(id);
    }
  });

  test("every parser exposes scanSessions, parseSession, available, displayName, roots", () => {
    for (const parser of PARSERS) {
      expect(typeof parser.scanSessions).toBe("function");
      expect(typeof parser.parseSession).toBe("function");
      expect(typeof parser.available).toBe("function");
      expect(typeof parser.displayName).toBe("string");
      expect(parser.displayName.length).toBeGreaterThan(0);
      expect(Array.isArray(parser.roots)).toBe(true);
    }
  });

  test("optional scanMemoryFiles tolerates an empty knownProjectPaths array", async () => {
    for (const parser of PARSERS) {
      if (!parser.scanMemoryFiles) continue;
      const result = await parser.scanMemoryFiles([]);
      expect(Array.isArray(result)).toBe(true);
    }
  });

  test("findParserById returns undefined for unknown strings", () => {
    expect(findParserById(undefined)).toBeUndefined();
    expect(findParserById(null)).toBeUndefined();
    expect(findParserById("")).toBeUndefined();
    expect(findParserById("not-a-provider")).toBeUndefined();
  });

  test("findParser / findParserById return the matching parser for every known provider id", () => {
    for (const id of PROVIDER_IDS) {
      const byId = findParser(id);
      const byString = findParserById(id);
      expect(byId).toBeDefined();
      expect(byString).toBe(byId);
      expect(byId?.id).toBe(id);
    }
  });
});
