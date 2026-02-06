import { opt } from './env';

export type PoolCoins = {
    poolKey: string;
    baseCoinKey: string;
    quoteCoinKey: string;
};

/**
 * Industry-standard approach:
 * - poolKey is always configured (env / config)
 * - base/quote coin keys are inferred from poolKey when possible (e.g. SUI_DBUSDC)
 * - overrides exist for mainnet/prod cases where naming differs
 */
export function resolvePoolCoins(args?: { poolKey?: string }): PoolCoins {
    const poolKey = args?.poolKey ?? opt('DEEPBOOK_POOL_KEY') ?? 'SUI_DBUSDC';

    // Optional overrides (recommended for production safety)
    const baseOverride = opt('BASE_COIN_KEY');
    const quoteOverride = opt('QUOTE_COIN_KEY');
    if (baseOverride && quoteOverride) {
        return { poolKey, baseCoinKey: baseOverride, quoteCoinKey: quoteOverride };
    }

    // Infer from common poolKey naming: BASE_QUOTE
    const parts = poolKey.split('_').filter(Boolean);
    if (parts.length === 2) {
        return { poolKey, baseCoinKey: parts[0], quoteCoinKey: parts[1] };
    }

    throw new Error(
        `Cannot infer base/quote coin keys from DEEPBOOK_POOL_KEY="${poolKey}". ` +
        `Set BASE_COIN_KEY and QUOTE_COIN_KEY in .env.`,
    );
}
