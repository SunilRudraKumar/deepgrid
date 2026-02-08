import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

function findRepoRoot(startDir = process.cwd()): string {
    let dir = startDir;
    while (true) {
        if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) return startDir;
        dir = parent;
    }
}

function ensureDatabaseUrl(): void {
    if (process.env.DATABASE_URL) return;

    const root = findRepoRoot();
    const dir = path.join(root, '.deepgrid');
    fs.mkdirSync(dir, { recursive: true });

    // absolute path avoids “cwd changed” issues
    const dbPath = path.join(dir, 'deepgrid.sqlite');
    process.env.DATABASE_URL = `file:${dbPath}`;
}

const SENSITIVE_KEYS = new Set([
    'OWNER_PRIVATE_KEY',
    'BOT_PRIVATE_KEY',
    'PRIVATE_KEY',
    'TRADE_CAP_ID',
    'MNEMONIC',
    'SEED',
    'SECRET',
]);

function redact(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(redact);

    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_KEYS.has(k) || k.toLowerCase().includes('private') || k.toLowerCase().includes('secret')) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = redact(v);
            }
        }
        return out;
    }

    if (typeof value === 'string') {
        if (value.startsWith('suiprivkey') || value.includes('suiprivkey')) return '[REDACTED]';
    }

    return value;
}

let _db: PrismaClient | null = null;

export function db(): PrismaClient {
    ensureDatabaseUrl();
    if (!_db) _db = new PrismaClient();
    return _db;
}

export async function logStep(args: {
    step: string;
    ok: boolean;
    durationMs?: number;

    env: string;
    poolKey?: string;
    address?: string;
    managerId?: string;
    managerKey?: string;

    output?: unknown;
    error?: unknown;
}) {
    const safe = {
        ...args,
        output: args.output ? redact(args.output) : undefined,
        error: args.error ? String(args.error instanceof Error ? args.error.message : args.error) : undefined,
    };

    await db().stepLog.create({
        data: {
            step: safe.step,
            ok: safe.ok,
            durationMs: safe.durationMs,

            env: safe.env,
            poolKey: safe.poolKey,
            address: safe.address,
            managerId: safe.managerId,
            managerKey: safe.managerKey,

            // SQLite shim: serialize JSON to string
            output: safe.output ? JSON.stringify(safe.output) : undefined,
            error: safe.error,
        },
    });
}
