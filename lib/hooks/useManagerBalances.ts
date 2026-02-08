// lib/hooks/useManagerBalances.ts
// Hook to get Balance Manager balances

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAccountBalances, type BalanceResult } from '@/lib/features/deepbook/balance';

export interface UseManagerBalancesResult {
    /** Balance data for the manager */
    data: BalanceResult[] | undefined;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Refetch balances */
    refetch: () => void;
}

/**
 * Hook to get Balance Manager balances
 * @param managerId - The Balance Manager object ID
 */
export function useManagerBalances(managerId: string | null): UseManagerBalancesResult {
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet';

    const query = useQuery({
        queryKey: ['managerBalances', managerId, network],
        queryFn: async () => {
            if (!managerId) return [];
            console.log(`\n🏦 [ManagerBalances] Fetching for ${managerId.slice(0, 10)}... on ${network}`);
            const balances = await fetchAccountBalances(managerId, network);
            console.log(`🏦 [ManagerBalances] Balance Manager has:`);
            balances.forEach(b => {
                console.log(`   ${b.coinKey}: ${b.balance.toFixed(4)}`);
            });
            return balances;
        },
        enabled: !!managerId,
        staleTime: 10_000, // 10 seconds
        refetchInterval: 15_000, // 15 seconds
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
