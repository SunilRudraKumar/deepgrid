'use client';

import React from 'react';
import GridConfigPanel from '@/components/grid-bot/GridConfigPanel';
import GridActiveOrders from '@/components/grid-bot/GridActiveOrders';
import DepositCard from '@/components/onboarding/cards/DepositCard';
import GridChartPanel from '@/components/grid-bot/GridChartPanel';
import { useGridConfig } from '@/lib/hooks/useGridConfig';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import { useMintTradeCap } from '@/lib/hooks/useMintTradeCap';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { type DeepbookNetwork } from '@/lib/deepbook/indexer';

interface BotPageClientProps {
    botName: string;
    botStatus: string;
    balanceManagerId: string;
}

export default function BotPageClient({ botName, botStatus, balanceManagerId }: BotPageClientProps) {
    const { selectedPool } = usePoolSelector();
    const pool = selectedPool?.id ?? 'SUI_USDC';
    const network: DeepbookNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    // Grid bot account and trade cap
    const botAccount = useGridBotAccount();
    const tradeCap = useMintTradeCap();

    // Grid configuration
    const gridConfig = useGridConfig({
        defaultMin: 3.50,
        defaultMax: 4.50,
        defaultGrids: 10,
        defaultInvestment: 100,
    });

    // Extract price levels for chart overlay
    const gridPrices = gridConfig.levels.map((l) => l.price);

    // Calculate required vs available funds
    const fundsInfo = React.useMemo(() => {
        const orders = gridConfig.orders;
        const requiredBase = orders.filter(o => o.side === 'SELL').reduce((sum, o) => sum + o.size, 0);
        const requiredQuote = orders.filter(o => o.side === 'BUY').reduce((sum, o) => sum + (o.size * o.price), 0);

        const baseBalance = botAccount.balances.find(b => b.coinKey === 'SUI')?.balance ?? 0;
        const quoteBalance = botAccount.balances.find(b => b.coinKey === 'USDC')?.balance ?? 0;

        return {
            required: { base: requiredBase, quote: requiredQuote },
            available: { base: baseBalance, quote: quoteBalance }
        };
    }, [gridConfig.orders, botAccount.balances]);

    const isAccountReady = botAccount.isReady && tradeCap.hasTradeCap;

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center bg-[#0f141b] border border-white/10 p-6 rounded-xl">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-white">{botName}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${botStatus === 'ACTIVE'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                            }`}>
                            {botStatus}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono">
                        Manager ID: {balanceManagerId}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Controls could go here */}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Chart & Orders */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Chart Area */}
                    <div className="bg-[#0f141b] border border-white/10 rounded-xl overflow-hidden">
                        <GridChartPanel
                            pool={pool}
                            network={network}
                            gridPrices={gridPrices}
                            levelCount={gridConfig.levels.length}
                        />
                    </div>

                    {/* Active Orders */}
                    <GridActiveOrders
                        managerId={balanceManagerId}
                        poolKey={pool}
                        network={network}
                    />
                </div>

                {/* Right Column: Config & Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <GridConfigPanel
                        gridConfig={gridConfig}
                        isAccountReady={isAccountReady}
                        requiredFunds={fundsInfo.required}
                        availableFunds={fundsInfo.available}
                    />

                    {/* Deposit Card */}
                    <div className="bg-[#0f141b] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Add Funds</h3>
                        <DepositCard
                            managerId={balanceManagerId}
                            onSuccess={() => botAccount.refreshBalances()}
                            onBack={() => { }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
