import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AppConfig } from "./types";

const DEFAULT_CONFIG_PATH = "tracker.config.json";

export function resolveConfigPath(pathArg?: string) {
  return resolve(process.cwd(), pathArg ?? DEFAULT_CONFIG_PATH);
}

export async function loadConfig(pathArg?: string): Promise<{ config: AppConfig; path: string }> {
  const path = resolveConfigPath(pathArg);
  if (!existsSync(path)) {
    throw new Error(`Config not found: ${path}`);
  }

  const file = Bun.file(path);
  const config = (await file.json()) as AppConfig;
  validateConfig(config, path);
  return { config, path };
}

function validateConfig(config: AppConfig, path: string) {
  if (!Array.isArray(config.watches) || config.watches.length === 0) {
    throw new Error(`No watches in ${path}`);
  }

  for (const watch of config.watches) {
    if (!watch.id) {
      throw new Error(`Watch missing id in ${path}`);
    }
    if (!watch.term) {
      throw new Error(`Watch ${watch.id} missing term`);
    }
    if (!watch.search || typeof watch.search !== "object") {
      throw new Error(`Watch ${watch.id} missing search object`);
    }
  }
}
