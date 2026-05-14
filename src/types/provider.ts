export const PROVIDER_IDS = ["claude-code", "copilot", "copilot-cli", "gemini", "codex"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ProviderFilter = ProviderId | "all";

export function isProviderId(value: string | null | undefined): value is ProviderId {
  return PROVIDER_IDS.includes(value as ProviderId);
}

export interface ProviderStatus {
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
  "copilot-cli": "Copilot CLI",
  gemini: "Gemini CLI",
  codex: "Codex CLI",
};
