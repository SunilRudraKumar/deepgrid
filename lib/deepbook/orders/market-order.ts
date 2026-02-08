// lib/deepbook/orders/market-order.ts
// Market order transaction builder using direct Move calls

import { testnetPackageIds, mainnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import { POOL_CONFIG, alignToLotSize, type Network } from './config';

// Self-matching option constants
const SelfMatchingOptions = {
    SELF_MATCHING_ALLOWED: 0,
    CANCEL_TAKER: 1,
    CANCEL_MAKER: 2,
};

export interface BuildMarketOrderParams {
    walletAddress: string;
    managerId: string;
    poolKey: string;
    quantity: number;
    side: 'buy' | 'sell';
    clientOrderId?: number;
    selfMatchingOption?: number;
    payWithDeep?: boolean;
    network?: Network;
}

/**
 * Build a market order transaction using direct Move calls
 * Follows the exact signature from @mysten/deepbook-v3 SDK
 */
export async function buildMarketOrderTransaction(
    params: BuildMarketOrderParams
): Promise<Transaction> {
    const {
        walletAddress,
        managerId,
        poolKey,
        quantity,
        side,
        clientOrderId = Date.now(),
        selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
        payWithDeep = false,
        network = 'mainnet',
    } = params;

    console.log(`📝 [Market] ${side.toUpperCase()} ${quantity} on ${poolKey}`);

    // Get package IDs and pool info based on network
    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;

    // Get pool config
    const poolConfig = POOL_CONFIG[network]?.[poolKey];
    if (!poolConfig || poolConfig.id === '0x0') {
        throw new Error(`Pool ${poolKey} not configured for ${network}`);
    }

    // Parse pool key to get base/quote tokens (e.g., "SUI_USDC" -> "SUI", "USDC")
    const [baseKey, quoteKey] = poolKey.split('_');
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) {
        throw new Error(`Unknown coins in pool ${poolKey}`);
    }

    // Convert quantity to base units
    const rawQuantity = Math.round(quantity * baseCoin.scalar);

    // Align to pool's lot_size (required by DeepBook)
    const inputQuantity = alignToLotSize(rawQuantity, poolConfig.lotSize);

    // Validate minimum size
    if (inputQuantity < poolConfig.minSize) {
        throw new Error(`Order too small. Minimum: ${poolConfig.minSize / baseCoin.scalar} ${baseKey}`);
    }

    console.log(`📝 [Market] Order details:`, {
        side,
        quantity,
        rawQuantity,
        inputQuantity,
        lotSize: poolConfig.lotSize,
        aligned: inputQuantity === rawQuantity ? 'yes' : `rounded from ${rawQuantity}`,
        baseCoin: baseKey,
        quoteCoin: quoteKey,
        payWithDeep,
    });

    const tx = new Transaction();

    // Step 1: Generate trade proof as owner
    // This proves ownership of the balance manager
    const tradeProof = tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::generate_proof_as_owner`,
        arguments: [tx.object(managerId)],
    });

    // Step 2: Place market order
    // Signature: place_market_order<BASE, QUOTE>(
    //   pool: &mut Pool,
    //   balance_manager: &mut BalanceManager,
    //   trade_proof: &TradeProof,
    //   client_order_id: u64,
    //   self_matching_option: u8,
    //   quantity: u64,
    //   is_bid: bool,
    //   pay_with_deep: bool,
    //   clock: &Clock
    // )
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::pool::place_market_order`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.object(managerId),
            tradeProof,
            tx.pure.u64(BigInt(clientOrderId)),
            tx.pure.u8(selfMatchingOption),
            tx.pure.u64(BigInt(inputQuantity)),
            tx.pure.bool(side === 'buy'),
            tx.pure.bool(payWithDeep),
            tx.object.clock(),
        ],
    });

    return tx;
}
