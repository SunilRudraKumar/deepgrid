// lib/hooks/useManagerId.ts
// Hook to get the user's Balance Manager ID

'use client';

import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { checkTradingAccount } from '@/lib/features/onboarding/check-account';

export interface UseManagerIdResult {
    /** Balance Manager ID (first one if multiple exist) */
    managerId: string | null;
    /** All manager IDs for the user */
    managerIds: string[];
    /** Whether the user has a trading account */
    hasAccount: boolean;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Refetch the manager ID */
    refetch: () => void;
}

/**
 * Hook to get the current user's Balance Manager ID
 */
export function useManagerId(): UseManagerIdResult {
    const account = useCurrentAccount();
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet';

    const query = useQuery({
        queryKey: ['managerId', account?.address, network],
        queryFn: async () => {
            if (!account?.address) return null;
            const result = await checkTradingAccount(account.address, network);
            return result;
        },
        enabled: !!account?.address,
        staleTime: 30_000, // 30 seconds
        refetchInterval: 60_000, // 1 minute
    });

    const managerIds = query.data?.accountIds ?? [];
    const managerId = managerIds[0] ?? null;
    const hasAccount = query.data?.exists ?? false;

    return {
        managerId,
        managerIds,
        hasAccount,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
