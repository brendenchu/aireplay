import type { ProviderId } from "./provider";

export interface MemoryFile {
  id: string;
  provider: ProviderId;
  filePath: string;
  relativePath: string;
  projectPath: string | null;
  projectName: string | null;
  name: string;
  content: string;
  updatedAt: string;
  sizeBytes: number;
}
