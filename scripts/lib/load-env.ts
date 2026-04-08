/**
 * Load .env.local into process.env since tsx doesn't auto-load it.
 * Only sets variables that aren't already defined in the environment.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

export function loadEnvLocal(): void {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}
