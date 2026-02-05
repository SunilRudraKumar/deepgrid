import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

function findRepoRoot(startDir = process.cwd()): string {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir; // fallback
    dir = parent;
  }
}

export function loadEnv(): void {
  const root = findRepoRoot();
  // Support .env.local override if present (good practice, though not strictly in snippet)
  const files = ['.env', '.env.local'];
  for (const f of files) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
    }
  }
}

export function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : undefined;
}

export function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length ? v : undefined;
}

export function must(name: string, hint?: string): string {
  const v = opt(name);
  if (!v) {
    throw new Error(
      hint
        ? `Missing ${name}. ${hint}`
        : `Missing ${name}. Add it to .env at repo root.`,
    );
  }
  return v;
}

/** Require one of these env vars to be set (useful for "OWNER_PRIVATE_KEY OR BOT_PRIVATE_KEY"). */
export function mustAny(
  names: string[],
  hint?: string,
): { name: string; value: string } {
  for (const n of names) {
    const v = opt(n);
    if (v) return { name: n, value: v };
  }
  throw new Error(
    hint
      ? `Missing one of: ${names.join(', ')}. ${hint}`
      : `Missing one of: ${names.join(', ')}. Add one to .env at repo root.`,
  );
}

export function mustNumber(
  name: string,
  opts: { min?: number; max?: number } = {},
): number {
  const raw = must(name);
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new Error(`Invalid ${name}="${raw}" (expected number).`);
  if (opts.min !== undefined && v < opts.min)
    throw new Error(`Invalid ${name}=${v} (min ${opts.min}).`);
  if (opts.max !== undefined && v > opts.max)
    throw new Error(`Invalid ${name}=${v} (max ${opts.max}).`);
  return v;
}

export function mustBool(name: string): boolean {
  const raw = must(name).toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(raw)) return false;
  throw new Error(`Invalid ${name}="${raw}" (expected true/false).`);
}
