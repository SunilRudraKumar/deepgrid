// lib/deepbook/orders/fetch-orders.ts
// Fetch open orders for a user's balance manager

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { mainnetPackageIds, testnetPackageIds, mainnetCoins, testnetCoins } from '@mysten/deepbook-v3';
import { POOL_CONFIG, type Network } from './config';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
};

export interface OpenOrder {
    orderId: string;
    poolKey: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    filledQuantity: number;
    status: 'open' | 'partially_filled';
}

/**
 * Fetch open order IDs for a balance manager in a specific pool
 * Uses pool::account_open_orders via simulateTransaction
 */
export async function fetchOpenOrderIds(
    managerId: string,
    poolKey: string,
    network: Network = 'mainnet'
): Promise<string[]> {
    if (!managerId) return [];

    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const poolConfig = POOL_CONFIG[network]?.[poolKey];

    if (!poolConfig || poolConfig.id === '0x0') {
        console.warn(`Pool ${poolKey} not configured for ${network}`);
        return [];
    }

    const [baseKey, quoteKey] = poolKey.split('_');
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) {
        console.warn(`Unknown coins in pool ${poolKey}`);
        return [];
    }

    const client = new SuiGrpcClient({
        network,
        baseUrl: GRPC_URLS[network],
    });

    const tx = new Transaction();

    // Call account_open_orders to get list of order IDs
    tx.moveCall({
        target: `${packageIds.DEEPBOOK_PACKAGE_ID}::pool::account_open_orders`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.object(managerId),
        ],
    });

    try {
        const result = await client.simulateTransaction({
            transaction: tx,
            include: { commandResults: true },
        });

        // The result is a vector of u128 order IDs
        const bytes = result.commandResults?.[0]?.returnValues?.[0]?.bcs;
        if (!bytes) {
            console.log('📋 [OpenOrders] No orders found');
            return [];
        }

        console.log('📋 [OpenOrders] Raw BCS bytes:', bytes);

        // Parse vector<u128> - each u128 is 16 bytes
        // BCS vector format: [length as ULEB128, ...elements]
        try {
            const data = new Uint8Array(bytes);
            // First byte is the vector length (ULEB128, but for small numbers it's just 1 byte)
            const length = data[0];

            if (length === 0) {
                console.log('📋 [OpenOrders] Empty order list');
                return [];
            }

            const orderIds: string[] = [];
            let offset = 1; // Skip the length byte

            for (let i = 0; i < length; i++) {
                // Read 16 bytes for u128 (little-endian)
                const orderBytes = data.slice(offset, offset + 16);
                // Convert to BigInt
                let orderId = BigInt(0);
                for (let j = 0; j < 16; j++) {
                    orderId += BigInt(orderBytes[j]) << BigInt(8 * j);
                }
                orderIds.push(orderId.toString());
                offset += 16;
            }

            console.log(`📋 [OpenOrders] Found ${orderIds.length} orders:`, orderIds);
            return orderIds;
        } catch (parseError) {
            console.error('📋 [OpenOrders] Failed to parse order IDs:', parseError);
            return [];
        }
    } catch (error) {
        console.error('📋 [OpenOrders] Failed to fetch:', error);
        return [];
    }
}

/**
 * Fetch all open orders for a balance manager across all configured pools
 */
export async function fetchAllOpenOrders(
    managerId: string,
    network: Network = 'mainnet'
): Promise<{ poolKey: string; orderIds: string[] }[]> {
    if (!managerId) return [];

    const poolKeys = Object.keys(POOL_CONFIG[network] || {});
    const results = await Promise.all(
        poolKeys.map(async (poolKey) => {
            const orderIds = await fetchOpenOrderIds(managerId, poolKey, network);
            return { poolKey, orderIds };
        })
    );

    return results.filter((r) => r.orderIds.length > 0);
}

/**
 * Fetch details for a specific order using pool::get_order
 */
import { OrderStruct } from '../bcs-structs';
import { microToPrice } from '@/lib/grid-bot';

// ... (other imports)

// ... (fetchOpenOrderIds implementation)

export async function fetchOrderDetails(
    orderId: string,
    poolKey: string,
    network: Network = 'mainnet'
): Promise<{ price: number; quantity: number; side: 'buy' | 'sell'; filled: number; orderId: string } | null> {
    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const poolConfig = POOL_CONFIG[network]?.[poolKey];

    if (!poolConfig || poolConfig.id === '0x0') return null;

    const [baseKey, quoteKey] = poolKey.split('_');
    const baseCoin = coins[baseKey];
    const quoteCoin = coins[quoteKey];

    if (!baseCoin || !quoteCoin) return null;

    const client = new SuiGrpcClient({
        network,
        baseUrl: GRPC_URLS[network],
    });

    const tx = new Transaction();

    // Call get_order to get order details
    tx.moveCall({
        target: `${packageIds.DEEPBOOK_PACKAGE_ID}::pool::get_order`,
        typeArguments: [baseCoin.type, quoteCoin.type],
        arguments: [
            tx.object(poolConfig.id),
            tx.pure.u128(BigInt(orderId)),
        ],
    });

    try {
        const result = await client.simulateTransaction({
            transaction: tx,
            include: { commandResults: true },
        });

        const bytes = result.commandResults?.[0]?.returnValues?.[0]?.bcs;
        if (!bytes) {
            console.log('📋 [OrderDetails] No data for order', orderId);
            return null;
        }

        console.log(`📋 [OrderDetails] Got ${bytes.length} bytes for ${orderId}`);
        // console.log('📋 [OrderDetails] Raw BCS bytes:', bytes);

        // Decode BCS using correct struct
        const data = new Uint8Array(bytes);
        try {
            const order = OrderStruct.parse(data);
            console.log('📋 [OrderDetails] Parsed order:', order);

            // Extract Price and Side from Order ID (u128)
            // Bid: 0 for 1st bit, 0 for next 63 bits (price), 1 for next 64 bits order_id
            // Ask: 1 for 1st bit, 0 for next 63 bits (price), 0 for next 64 bits order_id

            const rawOrderId = BigInt(order.order_id);
            const isBid = (rawOrderId >> BigInt(127)) === BigInt(0); // MSB is 0 for Bid, 1 for Ask

            // Price is in bits 64-126 (63 bits)
            // Mask: (rawOrderId >> 64n) & ((1n << 63n) - 1n)
            const rawPrice = (rawOrderId >> BigInt(64)) & BigInt("0x7FFFFFFFFFFFFFFF");

            const price = Number(rawPrice) / quoteCoin.scalar;
            const quantity = Number(order.quantity) / baseCoin.scalar;
            const filled = Number(order.filled_quantity) / baseCoin.scalar;
            const totalOriginal = quantity + filled;

            return {
                orderId,
                price,
                quantity: totalOriginal, // Show original size
                side: isBid ? 'buy' : 'sell',
                filled,
            };
        } catch (parseError) {
            console.error('📋 [OrderDetails] Parsing failed:', parseError);
            return null;
        }

    } catch (error) {
        console.error('📋 [OrderDetails] Failed to fetch:', error);
        return null;
    }
}
