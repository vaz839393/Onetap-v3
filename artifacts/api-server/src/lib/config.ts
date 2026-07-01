import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const CONFIG_PATH = join(DATA_DIR, "config.json");

// Runtime-only token overrides (in-memory, fastest path)
let runtimeToken1: string | null = null;
let runtimeToken2: string | null = null;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// ── Token cache (persisted to disk so server restarts don't lose the token) ──
function loadTokenCache(): { t1?: string; t2?: string } {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const p = JSON.parse(raw) as any;
    return { t1: p._t1 || undefined, t2: p._t2 || undefined };
  } catch { return {}; }
}

function saveTokenCache(field: "_t1" | "_t2", token: string) {
  ensureDataDir();
  let raw: any = {};
  try { if (existsSync(CONFIG_PATH)) raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); } catch { /**/ }
  raw[field] = token;
  writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2));
}

// Pre-load cached tokens on module init so reconnects work after server restart
const _cache = loadTokenCache();
if (_cache.t1) runtimeToken1 = _cache.t1;
if (_cache.t2) runtimeToken2 = _cache.t2;

export function getDiscordToken(): string {
  return runtimeToken1 ?? process.env["DISCORD_TOKEN"] ?? "";
}
export function setRuntimeToken(token: string): void {
  runtimeToken1 = token.trim() || null;
  if (runtimeToken1) saveTokenCache("_t1", runtimeToken1);
}

export function getDiscordToken2(): string {
  return runtimeToken2 ?? process.env["DISCORD_TOKEN_2"] ?? "";
}
export function setRuntimeToken2(token: string): void {
  runtimeToken2 = token.trim() || null;
  if (runtimeToken2) saveTokenCache("_t2", runtimeToken2);
}

export interface Config {
  autoReact: { enabled: boolean; emoji: string };
  autoReact2: { enabled: boolean; emoji: string };
  clipboardMessenger: { enabled: boolean; channelId: string };
  clipboardMessenger2: { enabled: boolean; channelId: string };
}

const DEFAULT_CONFIG: Config = {
  autoReact: { enabled: false, emoji: "👍" },
  autoReact2: { enabled: false, emoji: "👍" },
  clipboardMessenger: { enabled: false, channelId: "" },
  clipboardMessenger2: { enabled: false, channelId: "" },
};

export function loadConfig(): Config {
  ensureDataDir();
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const p = JSON.parse(raw) as Partial<Config>;
    return {
      autoReact: { enabled: p.autoReact?.enabled ?? false, emoji: p.autoReact?.emoji ?? "👍" },
      autoReact2: { enabled: p.autoReact2?.enabled ?? false, emoji: p.autoReact2?.emoji ?? "👍" },
      clipboardMessenger: { enabled: p.clipboardMessenger?.enabled ?? false, channelId: p.clipboardMessenger?.channelId ?? "" },
      clipboardMessenger2: { enabled: p.clipboardMessenger2?.enabled ?? false, channelId: p.clipboardMessenger2?.channelId ?? "" },
    };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function saveConfig(config: Config): void {
  ensureDataDir();
  // Merge with existing file to preserve _t1/_t2 cache fields
  let existing: any = {};
  try { if (existsSync(CONFIG_PATH)) existing = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); } catch { /**/ }
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...config }, null, 2));
}

export function updateConfig(partial: Partial<Config>): Config {
  const current = loadConfig();
  const updated: Config = {
    autoReact: { ...current.autoReact, ...(partial.autoReact ?? {}) },
    autoReact2: { ...current.autoReact2, ...(partial.autoReact2 ?? {}) },
    clipboardMessenger: { ...current.clipboardMessenger, ...(partial.clipboardMessenger ?? {}) },
    clipboardMessenger2: { ...current.clipboardMessenger2, ...(partial.clipboardMessenger2 ?? {}) },
  };
  saveConfig(updated);
  return updated;
}
