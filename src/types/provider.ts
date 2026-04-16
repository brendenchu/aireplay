export type ProviderId = "claude-code" | "copilot" | "gemini" | "codex";

export interface Provider {
  id: ProviderId;
  name: string;
  available: boolean;
  lastSynced: string | null;
  stats: {
    conversations: number;
    memoryFiles: number;
  };
}

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  "claude-code": "Claude Code",
  copilot: "VS Code Copilot",
  gemini: "Gemini CLI",
  codex: "Codex CLI",
};
