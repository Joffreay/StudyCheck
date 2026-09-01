import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ScoringConfig } from "./types";

let cachedConfig: ScoringConfig | null = null;

export function loadScoringConfig(version = "v0.1.0"): ScoringConfig {
  if (cachedConfig && cachedConfig.version === version.replace(/^v/, "")) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), "config", "scoring", `${version}.yaml`);
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = YAML.parse(raw) as ScoringConfig;
  cachedConfig = parsed;
  return parsed;
}

export function resetScoringConfigCache(): void {
  cachedConfig = null;
}
