// components/terminal/trade/PoolBalanceCard.tsx
// Displays Balance Manager balances for the selected pool

'use client';

import React from 'react';
import { Panel } from '../ui/Panel';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { useManagerBalances } from '@/lib/hooks/useManagerBalances';

interface PoolBalanceCardProps {
    /** Balance Manager ID to fetch balances for */
    managerId: string | null;
}

export function PoolBalanceCard({ managerId }: PoolBalanceCardProps) {
    const { selectedPool } = usePoolSelector();
    const { data: balances, isLoading } = useManagerBalances(managerId);

    if (!selectedPool) return null;

    const { baseToken, quoteToken } = selectedPool;

    // Get balances for pool tokens from Balance Manager
    const baseBalance = balances?.find((b) => b.coinKey === baseToken);
    const quoteBalance = balances?.find((b) => b.coinKey === quoteToken);

    return (
        <Panel title="Balances">
            <div className="p-3 space-y-2">
                <BalanceRow
                    token={baseToken}
                    balance={baseBalance?.balance}
                    isLoading={isLoading}
                />
                <BalanceRow
                    token={quoteToken}
                    balance={quoteBalance?.balance}
                    isLoading={isLoading}
                />
            </div>
        </Panel>
    );
}

function BalanceRow({
    token,
    balance,
    isLoading,
}: {
    token: string;
    balance?: number;
    isLoading: boolean;
}) {
    const formatBalance = (val: number | undefined) => {
        if (val === undefined || val === null) return '0.00';
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
        return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    return (
        <div className="flex items-center justify-between text-xs group cursor-pointer hover:bg-white/5 p-1.5 rounded transition">
            <span className="text-zinc-400 font-medium">{token}</span>
            {isLoading ? (
                <span className="w-16 h-4 bg-white/5 rounded animate-pulse" />
            ) : (
                <span className="text-zinc-200 font-mono">{formatBalance(balance)}</span>
            )}
        </div>
    );
}
