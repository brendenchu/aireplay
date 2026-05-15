import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError, getMemoryFile, listConversations, saveMemoryFile, search } from "../api/client";

function mockResponse({
  ok = true,
  status = 200,
  statusText = "OK",
  body,
}: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?: unknown;
}) {
  return {
    ok,
    status,
    statusText,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as Response;
}

describe("ApiError", () => {
  test("isNotFound reflects 404", () => {
    expect(new ApiError(404, "x").isNotFound).toBe(true);
    expect(new ApiError(500, "x").isNotFound).toBe(false);
  });

  test("isTransient reflects 5xx or network failure (status 0)", () => {
    expect(new ApiError(0, "x").isTransient).toBe(true);
    expect(new ApiError(500, "x").isTransient).toBe(true);
    expect(new ApiError(503, "x").isTransient).toBe(true);
    expect(new ApiError(404, "x").isTransient).toBe(false);
  });
});

describe("typed client requests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("listConversations builds query string and returns typed data", async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: { data: [], total: 0 } }));
    const result = await listConversations({ provider: "claude-code", limit: 50 });
    expect(result).toEqual({ data: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations?provider=claude-code&limit=50",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("listConversations omits provider when 'all'", async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: { data: [], total: 0 } }));
    await listConversations({ provider: "all" });
    expect(fetchMock).toHaveBeenCalledWith("/api/conversations", expect.anything());
  });

  test("search type filter is passed through", async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: { results: [] } }));
    await search({ q: "foo", type: "conversation" });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("q=foo");
    expect(url).toContain("type=conversation");
  });

  test("non-2xx with JSON error body throws ApiError carrying message and status", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: false, status: 404, body: { error: "Memory file not found" } }),
    );
    await expect(getMemoryFile("missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Memory file not found",
    });
  });

  test("non-2xx with non-JSON body throws ApiError with statusText fallback", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "<html>oops</html>",
    } as Response);

    await expect(saveMemoryFile("id", "x")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Internal Server Error",
    });
  });

  test("fetch rejection throws ApiError with status 0 (transient)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await listConversations().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.isTransient).toBe(true);
  });

  test("saveMemoryFile sends PUT with JSON body", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ body: { success: true, updatedAt: "2026-01-01T00:00:00Z" } }),
    );
    await saveMemoryFile("memory-id", "new content");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/memory/memory-id",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "new content" }),
      }),
    );
  });
});
