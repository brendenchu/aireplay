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

export interface CopilotSessionWrapper {
  kind: number;
  v: {
    version: number;
    creationDate: number;
    sessionId: string;
    requests: CopilotRequest[];
    inputState?: {
      mode?: { id: string };
      selectedModel?: { identifier: string };
    };
  };
}

export interface CopilotRequest {
  message: string;
  response?: CopilotResponse;
  timestamp?: number;
}

export interface CopilotResponse {
  message: string;
  timestamp?: number;
}
