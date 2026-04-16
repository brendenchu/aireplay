import type { ProviderId } from "./provider";

export interface Conversation {
  id: string;
  provider: ProviderId;
  sessionId: string;
  projectPath: string | null;
  projectName: string | null;
  title: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  filePath: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  provider: ProviderId;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: string;
  output?: string;
}

export interface Project {
  id: string;
  path: string;
  name: string;
  providers: ProviderId[];
  conversationCount: number;
  memoryFileCount: number;
  lastActivityAt: string;
}
