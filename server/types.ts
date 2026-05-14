export interface ClaudeCodeJsonlEntry {
  type: string;
  message?: {
    role: string;
    content: string | ClaudeContentBlock[];
  };
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  project?: string;
  cwd?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  aiTitle?: string;
}

export interface ClaudeContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: string | ClaudeContentBlock[];
}

export interface ClaudeHistoryEntry {
  type: string;
  sessionId: string;
  project: string;
  timestamp: string;
  message?: {
    role: string;
    content: string | ClaudeContentBlock[];
  };
}
