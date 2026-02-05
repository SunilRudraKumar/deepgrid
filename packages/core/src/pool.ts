// packages/core/src/pool.ts
import { must } from './env';

export function getPoolKey(): string {
    return process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
}

export function parsePoolKey(poolKey: string): { baseCoinKey: string; quoteCoinKey: string } {
    const parts = poolKey.split('_').filter(Boolean);
    if (parts.length < 2) {
        throw new Error(`Invalid DEEPBOOK_POOL_KEY="${poolKey}". Expected like "SUI_DBUSDC".`);
    }
    return { baseCoinKey: parts[0], quoteCoinKey: parts.slice(1).join('_') };
}

/**
 * Optional overrides for cases where DeepBook coinKey differs from poolKey tokens.
 * Example:
 *   DEEPBOOK_BASE_COIN_KEY=SUI
 *   DEEPBOOK_QUOTE_COIN_KEY=DBUSDC
 */
export function coinKeysForPool(poolKey: string): { baseCoinKey: string; quoteCoinKey: string } {
    const base = process.env.DEEPBOOK_BASE_COIN_KEY;
    const quote = process.env.DEEPBOOK_QUOTE_COIN_KEY;
    if (base && quote) return { baseCoinKey: base, quoteCoinKey: quote };
    return parsePoolKey(poolKey);
}
