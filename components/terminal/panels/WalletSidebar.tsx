// components/terminal/panels/WalletSidebar.tsx
// Trading sidebar with pool balances and trade form

'use client';

import React from 'react';
import { PoolBalanceCard, TradeForm } from '../trade';

interface WalletSidebarProps {
    /** Balance Manager ID for executing trades */
    managerId?: string | null;
}

export default function WalletSidebar({ managerId = null }: WalletSidebarProps) {
    return (
        <div className="flex h-full flex-col gap-3">
            {/* Pool Token Balances */}
            <div className="shrink-0">
                <PoolBalanceCard managerId={managerId} />
            </div>

            {/* Trade Form - takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <TradeForm managerId={managerId} />
            </div>
        </div>
    );
}
