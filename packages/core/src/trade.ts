import { Transaction } from '@mysten/sui/transactions';

export type TradeSide = 'BUY' | 'SELL';

function pickTxBuilder(client: any) {
    // DeepBook tx builders are usually under client.deepbook.deepBook.*
    const deepbook = client?.deepbook;
    const deepBook = deepbook?.deepBook ?? deepbook?.deepbook ?? deepbook;

    if (!deepBook) {
        throw new Error('DeepBook extension missing on client (client.deepbook not found).');
    }
    return { deepbook, deepBook };
}

function pickWithdrawSettled(deepbook: any, deepBook: any) {
    // Common shapes seen in SDK:
    // - client.deepbook.withdrawSettledAmounts
    // - client.deepbook.balanceManager.withdrawSettledAmounts
    // - client.deepbook.deepBook.withdrawSettledAmounts
    // - client.deepbook.deepBook.balanceManager.withdrawSettledAmounts
    const locations = [
        deepbook?.withdrawSettledAmounts,
        deepbook?.balanceManager?.withdrawSettledAmounts,
        deepBook?.withdrawSettledAmounts,
        deepBook?.balanceManager?.withdrawSettledAmounts,
    ];

    for (const fn of locations) {
        if (typeof fn === 'function') return fn;
    }

    return null;
}

export function buildMarketOrderTx(args: {
    client: any;
    poolKey: string;
    managerKey: string;
    side: TradeSide; // BUY or SELL base asset
    quantity: number; // base qty in human units (e.g., 1 = 1 SUI)
    payWithDeep?: boolean;
    clientOrderId?: bigint;
}) {
    const { client, poolKey, managerKey, side, quantity } = args;
    const payWithDeep = Boolean(args.payWithDeep);
    const clientOrderId = args.clientOrderId ?? BigInt(Date.now());

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`quantity must be > 0 (got ${quantity})`);
    }
    if (!poolKey) throw new Error('poolKey is required');
    if (!managerKey) throw new Error('managerKey is required');

    const { deepbook, deepBook } = pickTxBuilder(client);

    if (typeof deepBook.placeMarketOrder !== 'function') {
        throw new Error('SDK mismatch: deepBook.placeMarketOrder is not a function');
    }

    const withdrawSettled = pickWithdrawSettled(deepbook, deepBook);
    if (!withdrawSettled || typeof withdrawSettled !== 'function') {
        throw new Error('SDK mismatch: withdrawSettledAmounts not found');
    }

    const tx = new Transaction();

    // isBid=true -> BUY base (pay quote). isBid=false -> SELL base (receive quote)
    const isBid = side === 'BUY';

    tx.add(
        deepBook.placeMarketOrder({
            poolKey,
            balanceManagerKey: managerKey,
            clientOrderId,
            quantity,
            isBid,
            payWithDeep,
        }),
    );

    // withdraw any settled amounts into "available"
    try {
        // Try (poolKey, managerKey) first (most common in your earlier scripts)
        tx.add(withdrawSettled(poolKey, managerKey));
    } catch {
        // Fallback shape
        tx.add(withdrawSettled({ poolKey, managerKey }));
    }

    return { tx, clientOrderId, isBid };
}
