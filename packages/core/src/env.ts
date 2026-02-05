import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

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
  dotenv.config({ path: path.join(root, '.env') });
}

export function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}
