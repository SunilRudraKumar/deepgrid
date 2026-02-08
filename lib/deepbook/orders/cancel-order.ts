// lib/deepbook/orders/cancel-order.ts
// Cancel order transaction builders using direct Move calls

import { testnetPackageIds, mainnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import { POOL_CONFIG, type Network } from './config';

export interface BuildCancelOrderParams {
    walletAddress: string;
    managerId: string;
    tradeCapId?: string; // Optional: If provided, use TradeCap for authorization
    poolKey: string;
    orderId: string;
    network?: Network;
}

export interface BuildCancelAllOrdersParams {
    walletAddress: string;
    managerId: string;
    tradeCapId?: string; // Optional: If provided, use TradeCap for authorization
    poolKey: string;
    network?: Network;
}

/**
 * Build a cancel order transaction
 */
export async function buildCancelOrderTransaction(
    params: BuildCancelOrderParams
): Promise<Transaction> {
    const {
        walletAddress,
        managerId,
        tradeCapId,
        poolKey,
        orderId,
        network = 'mainnet',
    } = params;

    console.log(`📝 [Cancel] Preparing to cancel order ${orderId} on ${poolKey}`);
    console.log(`📝 [Cancel] Params:`, { walletAddress, managerId, tradeCapId, poolKey, orderId, network });

    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;
    const poolConfig = POOL_CONFIG[network]?.[poolKey];

    if (!poolConfig) {
        throw new Error(`Pool ${poolKey} not configured for ${network}`);
    }

    // Parse pool key to get base/quote tokens
    const [baseKey, quoteKey] = poolKey.split('_');
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) {
        throw new Error(`Unknown coins in pool ${poolKey}`);
    }

    const tx = new Transaction();
    tx.setSender(walletAddress);

    // Step 1: Generate trade proof
    let tradeProof;
    if (tradeCapId) {
        // Use TradeCap if provided (Grid Bot mode)
        console.log(`📝 [Cancel] Generating proof as trader using Cap: ${tradeCapId}`);
        tradeProof = tx.moveCall({
            target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::generate_proof_as_trader`,
            arguments: [
                tx.object(managerId),
                tx.object(tradeCapId)
            ],
        });
    } else {
        // Default to Owner mode (Manual Trading mode)
        console.log(`📝 [Cancel] Generating proof as owner for Manager: ${managerId}`);
        tradeProof = tx.moveCall({
            target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::generate_proof_as_owner`,
            arguments: [tx.object(managerId)],
        });
    }

    // cancel_order(pool, balance_manager, trade_proof, order_id, clock)
    console.log(`📝 [Cancel] Executing cancel_order move call`);
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::pool::cancel_order`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.object(managerId),
            tradeProof,
            tx.pure.u128(orderId),
            tx.object.clock(),
        ],
    });

    return tx;
}

/**
 * Build a cancel all orders transaction
 * Note: DeepBook V3 has `cancel_all_orders`
 */
export async function buildCancelAllOrdersTransaction(
    params: BuildCancelAllOrdersParams
): Promise<Transaction> {
    const {
        walletAddress,
        managerId,
        tradeCapId,
        poolKey,
        network = 'mainnet',
    } = params;

    console.log(`📝 [Cancel All] Preparing to cancel ALL orders on ${poolKey}`);

    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;
    const poolConfig = POOL_CONFIG[network]?.[poolKey];

    if (!poolConfig) {
        throw new Error(`Pool ${poolKey} not configured for ${network}`);
    }

    // Parse pool key to get base/quote tokens
    const [baseKey, quoteKey] = poolKey.split('_');
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) {
        throw new Error(`Unknown coins in pool ${poolKey}`);
    }

    const tx = new Transaction();
    tx.setSender(walletAddress);

    // Step 1: Generate trade proof
    let tradeProof;
    if (tradeCapId) {
        // Use TradeCap if provided (Grid Bot mode)
        tradeProof = tx.moveCall({
            target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::generate_proof_as_trader`,
            arguments: [
                tx.object(managerId),
                tx.object(tradeCapId)
            ],
        });
    } else {
        // Default to Owner mode (Manual Trading mode)
        tradeProof = tx.moveCall({
            target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::generate_proof_as_owner`,
            arguments: [tx.object(managerId)],
        });
    }

    // cancel_all_orders(pool, balance_manager, trade_proof, clock)
    console.log(`📝 [Cancel All] Executing cancel_all_orders move call`);
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::pool::cancel_all_orders`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.object(managerId),
            tradeProof,
            tx.object.clock(),
        ],
    });

    return tx;
}
