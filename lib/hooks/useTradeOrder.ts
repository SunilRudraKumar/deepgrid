// lib/hooks/useTradeOrder.ts
// React hook for executing market and limit orders with dApp Kit

'use client';

import React from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { buildMarketOrderTransaction, buildLimitOrderTransaction, type Network } from '@/lib/deepbook/orders';
import { buildCancelOrderTransaction, buildCancelAllOrdersTransaction } from '@/lib/deepbook/orders/cancel-order';
import type { OrderSide, OrderType, OrderResult } from '@/lib/deepbook/orders/types';

export interface UseTradeOrderOptions {
    /** Balance Manager ID (required) */
    managerId: string | null;
    /** Network override */
    network?: Network;
}

export interface MarketOrderInput {
    poolKey: string;
    quantity: number;
    side: OrderSide;
    payWithDeep?: boolean;
}

export interface LimitOrderInput {
    poolKey: string;
    quantity: number;
    price: number;
    side: OrderSide;
    orderType?: OrderType;
    expiration?: number;
    payWithDeep?: boolean;
}

export interface CancelOrderInput {
    poolKey: string;
    orderId: string;
}

export interface CancelAllOrdersInput {
    poolKey: string;
}

export interface UseTradeOrderResult {
    /** Execute a market order */
    placeMarketOrder: (input: MarketOrderInput) => Promise<OrderResult>;
    /** Execute a limit order */
    placeLimitOrder: (input: LimitOrderInput) => Promise<OrderResult>;
    /** Cancel a specific order */
    cancelOrder: (input: CancelOrderInput) => Promise<OrderResult>;
    /** Cancel all orders for a pool */
    cancelAllOrders: (input: CancelAllOrdersInput) => Promise<OrderResult>;
    /** Loading state */
    isLoading: boolean;
    /** Last error */
    error: string | null;
    /** Clear error */
    clearError: () => void;
}

/**
 * Hook for executing trade orders with dApp Kit
 * 
 * @example
 * ```tsx
 * const { placeMarketOrder, isLoading, error } = useTradeOrder({ managerId });
 * 
 * const handleBuy = async () => {
 *   const result = await placeMarketOrder({
 *     poolKey: 'SUI_USDC',
 *     quantity: 10,
 *     side: 'buy',
 *   });
 *   if (result.success) {
 *     console.log('Order placed:', result.digest);
 *   }
 * };
 * ```
 */
export function useTradeOrder(options: UseTradeOrderOptions): UseTradeOrderResult {
    const { managerId, network: networkOverride } = options;
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const network = (networkOverride ?? process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as Network;

    const clearError = React.useCallback(() => setError(null), []);

    const executeTransaction = async (txFn: () => Promise<any>, logPrefix: string) => {
        if (!account?.address) return { success: false, error: 'Wallet not connected' };
        if (!managerId) return { success: false, error: 'No trading account found' };

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[useTradeOrder] ${logPrefix}...`);
            const tx = await txFn();

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(`[useTradeOrder] ${logPrefix} success:`, result);
            return {
                success: true,
                digest: (result as any).digest || (result.Transaction as any)?.digest || 'submitted'
            };
        } catch (err: any) {
            console.error(`[useTradeOrder] ${logPrefix} failed:`, err);
            setError(err.message || 'Transaction failed');
            return { success: false, error: err.message || 'Transaction failed' };
        } finally {
            setIsLoading(false);
        }
    };

    const placeMarketOrder = React.useCallback(
        async (input: MarketOrderInput): Promise<OrderResult> => {
            return executeTransaction(() => buildMarketOrderTransaction({
                walletAddress: account?.address || '',
                managerId: managerId!,
                poolKey: input.poolKey,
                quantity: input.quantity,
                side: input.side,
                payWithDeep: input.payWithDeep,
                network,
            }), 'Placing market order');
        },
        [account, managerId, network, dAppKit]
    );

    const placeLimitOrder = React.useCallback(
        async (input: LimitOrderInput): Promise<OrderResult> => {
            return executeTransaction(() => buildLimitOrderTransaction({
                walletAddress: account?.address || '',
                managerId: managerId!,
                poolKey: input.poolKey,
                quantity: input.quantity,
                price: input.price,
                side: input.side,
                orderType: input.orderType,
                expireTimestamp: input.expiration,
                payWithDeep: input.payWithDeep,
                network,
            }), 'Placing limit order');
        },
        [account, managerId, network, dAppKit]
    );

    const cancelOrder = React.useCallback(
        async (input: CancelOrderInput): Promise<OrderResult> => {
            return executeTransaction(() => buildCancelOrderTransaction({
                walletAddress: account?.address || '',
                managerId: managerId!,
                poolKey: input.poolKey,
                orderId: input.orderId,
                network,
            }), `Cancelling order ${input.orderId}`);
        },
        [account, managerId, network, dAppKit]
    );

    const cancelAllOrders = React.useCallback(
        async (input: CancelAllOrdersInput): Promise<OrderResult> => {
            return executeTransaction(() => buildCancelAllOrdersTransaction({
                walletAddress: account?.address || '',
                managerId: managerId!,
                poolKey: input.poolKey,
                network,
            }), `Cancelling all orders`);
        },
        [account, managerId, network, dAppKit]
    );

    return {
        placeMarketOrder,
        placeLimitOrder,
        cancelOrder,
        cancelAllOrders,
        isLoading,
        error,
        clearError,
    };
}
