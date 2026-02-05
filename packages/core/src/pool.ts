import { must } from './env';

export function getPoolKey(): string {
    return process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
}

export function inferCoinKeysFromPool(poolKey: string): { baseKey: string; quoteKey: string } {
    const parts = poolKey.split('_');
    if (parts.length < 2) {
        throw new Error(
            `Cannot infer coin keys from DEEPBOOK_POOL_KEY="${poolKey}". ` +
            `Set POOL_BASE_COIN_KEY and POOL_QUOTE_COIN_KEY in .env.`,
        );
    }
    return { baseKey: parts[0], quoteKey: parts.slice(1).join('_') };
}

export function getCoinKeys(): { baseKey: string; quoteKey: string } {
    const poolKey = getPoolKey();
    const inferred = inferCoinKeysFromPool(poolKey);
    return {
        baseKey: process.env.POOL_BASE_COIN_KEY ?? inferred.baseKey,
        quoteKey: process.env.POOL_QUOTE_COIN_KEY ?? inferred.quoteKey,
    };
}

export function getManager(): { managerId: string; managerKey: string } {
    return {
        managerId: must('BALANCE_MANAGER_ID'),
        managerKey: must('BALANCE_MANAGER_KEY'),
    };
}
