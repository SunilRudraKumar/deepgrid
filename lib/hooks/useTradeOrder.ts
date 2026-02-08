// lib/hooks/useTradeOrder.ts
// React hook for executing market and limit orders with dApp Kit

'use client';

import React from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { buildMarketOrderTransaction, buildLimitOrderTransaction, type Network } from '@/lib/deepbook/orders';
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

export interface UseTradeOrderResult {
    /** Execute a market order */
    placeMarketOrder: (input: MarketOrderInput) => Promise<OrderResult>;
    /** Execute a limit order */
    placeLimitOrder: (input: LimitOrderInput) => Promise<OrderResult>;
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

    const placeMarketOrder = React.useCallback(
        async (input: MarketOrderInput): Promise<OrderResult> => {
            if (!account?.address) {
                return { success: false, error: 'Wallet not connected' };
            }
            if (!managerId) {
                return { success: false, error: 'No trading account found' };
            }

            setIsLoading(true);
            setError(null);

            try {
                console.log('[useTradeOrder] Placing market order:', input);

                const tx = await buildMarketOrderTransaction({
                    walletAddress: account.address,
                    managerId,
                    poolKey: input.poolKey,
                    quantity: input.quantity,
                    side: input.side,
                    payWithDeep: input.payWithDeep,
                    network,
                });

                const result = await dAppKit.signAndExecuteTransaction({
                    transaction: tx,
                });

                console.log('[useTradeOrder] Market order success:', result);

                return {
                    success: true,
                    digest: (result as any).digest || (result.Transaction as any)?.digest || 'submitted',
                };
            } catch (e: any) {
                const errorMessage = e.message || 'Market order failed';
                console.error('[useTradeOrder] Market order failed:', e);
                setError(errorMessage);
                return { success: false, error: errorMessage };
            } finally {
                setIsLoading(false);
            }
        },
        [account?.address, managerId, network, dAppKit]
    );

    const placeLimitOrder = React.useCallback(
        async (input: LimitOrderInput): Promise<OrderResult> => {
            if (!account?.address) {
                return { success: false, error: 'Wallet not connected' };
            }
            if (!managerId) {
                return { success: false, error: 'No trading account found' };
            }

            setIsLoading(true);
            setError(null);

            try {
                console.log('[useTradeOrder] Placing limit order:', input);

                const tx = await buildLimitOrderTransaction({
                    walletAddress: account.address,
                    managerId,
                    poolKey: input.poolKey,
                    quantity: input.quantity,
                    price: input.price,
                    side: input.side,
                    orderType: input.orderType,
                    expireTimestamp: input.expiration,
                    payWithDeep: input.payWithDeep,
                    network,
                });

                const result = await dAppKit.signAndExecuteTransaction({
                    transaction: tx,
                });

                console.log('[useTradeOrder] Limit order success:', result);

                return {
                    success: true,
                    digest: (result as any).digest || (result.Transaction as any)?.digest || 'submitted',
                };
            } catch (e: any) {
                const errorMessage = e.message || 'Limit order failed';
                console.error('[useTradeOrder] Limit order failed:', e);
                setError(errorMessage);
                return { success: false, error: errorMessage };
            } finally {
                setIsLoading(false);
            }
        },
        [account?.address, managerId, network, dAppKit]
    );

    return {
        placeMarketOrder,
        placeLimitOrder,
        isLoading,
        error,
        clearError,
    };
}
