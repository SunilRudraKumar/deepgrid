// lib/hooks/useOpenOrders.ts
// Hook to fetch and display user's open orders

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { fetchOpenOrderIds, fetchOrderDetails } from '@/lib/deepbook/orders/fetch-orders';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';

export interface OpenOrder {
    orderId: string;
    poolKey: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    filled: number;
}

export function useOpenOrders(managerId: string | null) {
    const account = useCurrentAccount();
    const { selectedPool } = usePoolSelector();
    const poolKey = selectedPool?.id || 'SUI_USDC';
    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet') || 'mainnet';

    return useQuery({
        queryKey: ['openOrders', managerId, poolKey, network],
        queryFn: async () => {
            if (!managerId) return [];

            console.log(`📋 [OpenOrders] Fetching for ${poolKey}...`);
            const orderIds = await fetchOpenOrderIds(managerId, poolKey, network);
            console.log(`📋 [OpenOrders] Found ${orderIds.length} order IDs`);

            if (orderIds.length === 0) return [];

            // Fetch details for each order
            const ordersWithDetails = await Promise.all(
                orderIds.map(async (orderId) => {
                    const details = await fetchOrderDetails(orderId, poolKey, network);
                    return {
                        orderId,
                        poolKey,
                        side: details?.side ?? 'buy',
                        price: details?.price ?? 0,
                        quantity: details?.quantity ?? 0,
                        filled: details?.filled ?? 0,
                    } as OpenOrder;
                })
            );

            console.log(`📋 [OpenOrders] Orders with details:`, ordersWithDetails);
            return ordersWithDetails;
        },
        enabled: !!managerId && !!account,
        staleTime: 10_000, // 10 seconds
        refetchInterval: 15_000, // Refresh every 15 seconds
    });
}
