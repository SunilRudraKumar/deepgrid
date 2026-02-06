import type { Net } from './sui';

// Minimal runtime-safe shape (SDK differences handled via "any")
export type PoolCoins = {
    baseCoinKey: string;
    quoteCoinKey: string;
};

export function resolvePoolCoins(client: any, poolKey: string): PoolCoins {
    // SDK has a DeepBookConfig with getPool(key) / getCoin(key). 
    const cfg = client?.deepbook?.config ?? client?.deepbook?.deepBook?.config ?? client?.deepbookConfig ?? null;

    // Try config.getPool
    const pool =
        cfg?.getPool?.(poolKey) ??
        client?.deepbook?.config?.getPool?.(poolKey) ??
        client?.deepbook?.getPool?.(poolKey) ??
        null;

    if (!pool) {
        console.log(`[resolvePoolCoins] Pool missing for key: '${poolKey}' (len=${poolKey.length})`);
        // Fallback for known keys if SDK metadata is missing
        if (poolKey === 'SUI_DBUSDC') return { baseCoinKey: 'SUI', quoteCoinKey: 'DBUSDC' };
        if (poolKey === 'DBUSDC_SUI') return { baseCoinKey: 'DBUSDC', quoteCoinKey: 'SUI' };

        // Generic fallback: try to split by underscore if it looks like COIN_COIN
        if (poolKey.includes('_')) {
            const parts = poolKey.split('_');
            if (parts.length === 2) return { baseCoinKey: parts[0], quoteCoinKey: parts[1] };
        }

        throw new Error(`Pool not found for key: ${poolKey}`);
    }

    const baseCoinKey = pool.baseCoin ?? pool.base_coin ?? pool.baseCoinKey ?? pool.base_coin_key;
    const quoteCoinKey = pool.quoteCoin ?? pool.quote_coin ?? pool.quoteCoinKey ?? pool.quote_coin_key;

    if (!baseCoinKey || !quoteCoinKey) {
        throw new Error(`Pool ${poolKey} missing base/quote coin keys in metadata`);
    }

    return { baseCoinKey, quoteCoinKey };
}

export function listKnownPools(client: any): string[] {
    const cfg = client?.deepbook?.config ?? client?.deepbook?.deepBook?.config ?? null;

    // Best effort: pull keys from config.pools map
    const poolsObj =
        cfg?.pools ??
        cfg?.pool ??
        client?.deepbook?.pools ??
        client?.deepbook?.config?.pools ??
        null;

    if (poolsObj && typeof poolsObj === 'object') {
        return Object.keys(poolsObj).sort();
    }

    // Fallback: return empty if SDK does not expose map
    // Update: fallback to common known pools to ensure UI works even if SDK changes internal shape
    return ['SUI_DBUSDC', 'DBUSDC_SUI'].sort();
}

// SDK param naming has drifted across examples; keep a safe wrapper.
export async function checkManagerBalanceSafe(
    client: any,
    managerKey: string,
    coinKey: string,
) {
    // DeepBookClient.checkManagerBalance exists.
    try {
        return await client.deepbook.checkManagerBalance({ managerKey, coinKey });
    } catch {
        // alternate param name found in some docs
        return await client.deepbook.checkManagerBalance({ marginManagerKey: managerKey, coinKey });
    }
}
