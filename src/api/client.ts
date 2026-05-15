import type { Conversation, ConversationDetail, Project } from "@/types/conversation";
import type { MemoryFile } from "@/types/memory";
import type { ProviderFilter } from "@/types/provider";
import type { SearchResult } from "@/types/search";
import type { SyncResult, SyncStatusResponse } from "@/types/sync";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isTransient(): boolean {
    return this.status >= 500 || this.status === 0;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
}

interface BodyOptions extends RequestOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "DELETE";
}

async function request<T>(path: string, options: BodyOptions = {}): Promise<T> {
  const { body, method = "GET", signal } = options;
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Network request failed", null);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Body wasn't JSON — leave parsed as null. The error path below still
      // surfaces a useful message, and the success path's typed contract is
      // violated anyway so callers should treat this as malformed.
    }
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : response.statusText || `Request failed (${response.status})`;
    throw new ApiError(response.status, message, parsed);
  }

  return parsed as T;
}

function searchParams(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface ConversationListOptions extends RequestOptions {
  provider?: ProviderFilter;
  project?: string;
  limit?: number;
  offset?: number;
  sort?: "recent" | "oldest";
}

export interface ConversationListResponse {
  data: Conversation[];
  total: number;
}

export function listConversations(
  options: ConversationListOptions = {},
): Promise<ConversationListResponse> {
  const { provider, project, limit, offset, sort, signal } = options;
  const qs = searchParams({
    provider: provider && provider !== "all" ? provider : undefined,
    project,
    limit,
    offset,
    sort,
  });
  return request<ConversationListResponse>(`/api/conversations${qs}`, { signal });
}

export function getConversation(
  id: string,
  options: RequestOptions = {},
): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/api/conversations/${encodeURIComponent(id)}`, options);
}

export interface MemoryListResponse {
  data: MemoryFile[];
}

export function listMemoryFiles(options: RequestOptions = {}): Promise<MemoryListResponse> {
  return request<MemoryListResponse>("/api/memory", options);
}

export function getMemoryFile(id: string, options: RequestOptions = {}): Promise<MemoryFile> {
  return request<MemoryFile>(`/api/memory/${encodeURIComponent(id)}`, options);
}

export interface SaveMemoryResponse {
  success: true;
  updatedAt: string;
}

export function saveMemoryFile(
  id: string,
  content: string,
  options: RequestOptions = {},
): Promise<SaveMemoryResponse> {
  return request<SaveMemoryResponse>(`/api/memory/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { content },
    signal: options.signal,
  });
}

export interface ProjectListResponse {
  data: Project[];
}

export function listProjects(options: RequestOptions = {}): Promise<ProjectListResponse> {
  return request<ProjectListResponse>("/api/projects", options);
}

export interface ProjectDetailResponse {
  project: Project;
  conversations: Conversation[];
  memoryFiles: MemoryFile[];
}

export function getProject(
  id: string,
  options: RequestOptions = {},
): Promise<ProjectDetailResponse> {
  return request<ProjectDetailResponse>(`/api/projects/${encodeURIComponent(id)}`, options);
}

export interface SearchOptions extends RequestOptions {
  q: string;
  type?: "conversation" | "memory";
  provider?: ProviderFilter;
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export function search(options: SearchOptions): Promise<SearchResponse> {
  const { q, type, provider, limit, signal } = options;
  const qs = searchParams({
    q,
    type,
    provider: provider && provider !== "all" ? provider : undefined,
    limit,
  });
  return request<SearchResponse>(`/api/search${qs}`, { signal });
}

export function getSyncStatus(options: RequestOptions = {}): Promise<SyncStatusResponse> {
  return request<SyncStatusResponse>("/api/sync/status", options);
}

export function runSync(options: RequestOptions = {}): Promise<SyncResult> {
  return request<SyncResult>("/api/sync", { method: "POST", signal: options.signal });
}
