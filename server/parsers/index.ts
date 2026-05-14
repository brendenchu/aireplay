import type { ProviderId } from "../../src/types/provider";
import { parser as claudeCode } from "./claude-code";
import { parser as codex } from "./codex";
import { parser as copilot } from "./copilot";
import { parser as copilotCli } from "./copilot-cli";
import { parser as gemini } from "./gemini";
import type { SessionParser } from "./_shared";

export const PARSERS: SessionParser[] = [claudeCode, copilot, copilotCli, gemini, codex];

export function findParser(id: ProviderId): SessionParser | undefined {
  return PARSERS.find((p) => p.id === id);
}
