import type { ProviderId } from "./provider";

export interface SearchResult {
  type: "conversation" | "memory";
  id: string;
  title: string;
  provider: ProviderId;
  excerpt: string;
  score: number;
  matchedField: string;
}
