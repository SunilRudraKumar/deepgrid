// lib/deepbook/orders/limit-order.ts
// Limit order transaction builder using direct Move calls

import { testnetPackageIds, mainnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import { POOL_CONFIG, alignToLotSize, type Network } from './config';

// Order type constants for DeepBook V3
const OrderTypes = {
    NO_RESTRICTION: 0,
    IMMEDIATE_OR_CANCEL: 1,
    FILL_OR_KILL: 2,
    POST_ONLY: 3,
};

// Self-matching option constants
const SelfMatchingOptions = {
    SELF_MATCHING_ALLOWED: 0,
    CANCEL_TAKER: 1,
    CANCEL_MAKER: 2,
};

// Max u64 for no expiration
const MAX_U64 = BigInt('18446744073709551615');

export interface BuildLimitOrderParams {
    walletAddress: string;
    managerId: string;
    tradeCapId?: string; // Optional: If provided, use TradeCap for authorization
    poolKey: string;
    quantity: number;
    price: number;
    side: 'buy' | 'sell';
    orderType?: 'no_restriction' | 'immediate_or_cancel' | 'fill_or_kill' | 'post_only';
    selfMatchingOption?: number;
    expireTimestamp?: number; // 0 = never expires
    clientOrderId?: number;
    payWithDeep?: boolean;
    network?: Network;
    tx?: Transaction; // Optional: Use existing transaction builder (for batching)
}

/**
 * Build a limit order transaction using direct Move calls
 * Follows the exact signature from @mysten/deepbook-v3 SDK
 */
export async function buildLimitOrderTransaction(
    params: BuildLimitOrderParams
): Promise<Transaction> {
    const {
        walletAddress,
        managerId,
        tradeCapId,
        poolKey,
        quantity,
        price,
        side,
        orderType = 'no_restriction',
        selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
        expireTimestamp = 0, // 0 = never expires
        clientOrderId = Date.now(),
        payWithDeep = false,
        network = 'mainnet',
        tx: existingTx,
    } = params;

    // ... (logging and validation logic remains the same) ...

    console.log(`📝 [Limit] ${side.toUpperCase()} ${quantity} @ ${price} on ${poolKey}`);

    // Get package IDs and pool info based on network
    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;

    // Get pool config
    const poolConfig = POOL_CONFIG[network]?.[poolKey];
    if (!poolConfig || poolConfig.id === '0x0') {
        throw new Error(`Pool ${poolKey} not configured for ${network}`);
    }

    // Parse pool key to get base/quote tokens
    const [baseKey, quoteKey] = poolKey.split('_');
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) {
        throw new Error(`Unknown coins in pool ${poolKey}`);
    }

    // Convert quantity to base units and align to lot_size
    const rawQuantity = Math.round(quantity * baseCoin.scalar);
    const inputQuantity = alignToLotSize(rawQuantity, poolConfig.lotSize);

    // Validate minimum size
    if (inputQuantity < poolConfig.minSize) {
        throw new Error(`Order too small. Minimum: ${poolConfig.minSize / baseCoin.scalar} ${baseKey}`);
    }

    // Price needs to be scaled by quote scalar
    const inputPrice = Math.round(price * quoteCoin.scalar);

    console.log(`📝 [Limit] Order details:`, {
        side,
        quantity,
        price,
        rawQuantity,
        inputQuantity,
        inputPrice,
        lotSize: poolConfig.lotSize,
        aligned: inputQuantity === rawQuantity ? 'yes' : `rounded from ${rawQuantity}`,
        orderType,
        payWithDeep,
        usingTradeCap: !!tradeCapId,
    });

    // Map order type string to u8
    const orderTypeMap: Record<string, number> = {
        no_restriction: OrderTypes.NO_RESTRICTION,
        immediate_or_cancel: OrderTypes.IMMEDIATE_OR_CANCEL,
        fill_or_kill: OrderTypes.FILL_OR_KILL,
        post_only: OrderTypes.POST_ONLY,
    };
    const orderTypeU8 = orderTypeMap[orderType] ?? OrderTypes.NO_RESTRICTION;

    // Expiration: 0 means use MAX_U64 (no expiration)
    const expiration = expireTimestamp === 0 ? MAX_U64 : BigInt(expireTimestamp);

    // Use passed transaction or create new one
    const tx = existingTx || new Transaction();

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

    // Step 2: Place limit order
    // Signature: place_limit_order<BASE, QUOTE>(
    //   pool: &mut Pool,
    //   balance_manager: &mut BalanceManager,
    //   trade_proof: &TradeProof,
    //   client_order_id: u64,
    //   order_type: u8,
    //   self_matching_option: u8,
    //   price: u64,
    //   quantity: u64,
    //   is_bid: bool,
    //   pay_with_deep: bool,
    //   expiration: u64,
    //   clock: &Clock
    // )
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::pool::place_limit_order`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.object(managerId),
            tradeProof,
            tx.pure.u64(BigInt(clientOrderId)),
            tx.pure.u8(orderTypeU8),
            tx.pure.u8(selfMatchingOption),
            tx.pure.u64(BigInt(inputPrice)),
            tx.pure.u64(BigInt(inputQuantity)),
            tx.pure.bool(side === 'buy'),
            tx.pure.bool(payWithDeep),
            tx.pure.u64(expiration),
            tx.object.clock(),
        ],
    });

    return tx;
}
