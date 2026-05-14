import { isProviderId, type ProviderId } from "../../src/types/provider";
import type { ProviderParser } from "./_shared";
import { parser as claudeCode } from "./claude-code";
import { parser as codex } from "./codex";
import { parser as copilot } from "./copilot";
import { parser as copilotCli } from "./copilot-cli";
import { parser as gemini } from "./gemini";

export const PARSERS: ProviderParser[] = [claudeCode, copilot, copilotCli, gemini, codex];

export function findParser(id: ProviderId): ProviderParser | undefined {
  return PARSERS.find((p) => p.id === id);
}

export function findParserById(id: string | null | undefined): ProviderParser | undefined {
  return isProviderId(id) ? findParser(id) : undefined;
}
