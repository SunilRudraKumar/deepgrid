// lib/config/pools.ts
// Modular pool configuration - easy to add new pools

export interface PoolConfig {
    id: string;
    name: string;
    baseToken: string;
    quoteToken: string;
    poolId?: string; // DeepBook pool ID (for future use)
}

export const POOLS: PoolConfig[] = [
    {
        id: 'SUI_USDC',
        name: 'SUI / USDC',
        baseToken: 'SUI',
        quoteToken: 'USDC',
    },
    {
        id: 'SUI_DEEP',
        name: 'SUI / DEEP',
        baseToken: 'SUI',
        quoteToken: 'DEEP',
    },
];

export const DEFAULT_POOL_ID = 'SUI_USDC';

export function getPoolById(id: string): PoolConfig | undefined {
    return POOLS.find(pool => pool.id === id);
}

export function getPoolTokens(poolId: string): [string, string] | undefined {
    const pool = getPoolById(poolId);
    if (!pool) return undefined;
    return [pool.baseToken, pool.quoteToken];
}
