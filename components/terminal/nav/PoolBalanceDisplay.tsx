'use client';

import React from 'react';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { useWalletBalances } from '@/lib/hooks/useWalletBalances';

export function PoolBalanceDisplay() {
    const { selectedPool } = usePoolSelector();
    const { data: balances, isLoading } = useWalletBalances();

    if (!selectedPool) return null;

    const { baseToken, quoteToken } = selectedPool;

    // Find balances for the pool's tokens
    const baseBalance = balances?.find(b => b.coinKey === baseToken);
    const quoteBalance = balances?.find(b => b.coinKey === quoteToken);

    const formatBalance = (val: number | undefined) => {
        if (val === undefined || val === null) return '0.00';
        if (val < 0.01 && val > 0) return '<0.01';
        return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    return (
        <div className="flex items-center gap-4 text-xs">
            <TokenBalance
                symbol={baseToken}
                balance={formatBalance(baseBalance?.availableBalance)}
                isLoading={isLoading}
            />
            <div className="h-4 w-px bg-white/10" />
            <TokenBalance
                symbol={quoteToken}
                balance={formatBalance(quoteBalance?.availableBalance)}
                isLoading={isLoading}
            />
        </div>
    );
}

function TokenBalance({
    symbol,
    balance,
    isLoading,
}: {
    symbol: string;
    balance: string;
    isLoading: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">{symbol}:</span>
            <span className="text-zinc-200 font-mono">
                {isLoading ? (
                    <span className="inline-block w-12 h-3 bg-white/5 rounded animate-pulse" />
                ) : (
                    balance
                )}
            </span>
        </div>
    );
}
