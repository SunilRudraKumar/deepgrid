'use client';

import React from 'react';
import GridConfigPanel from '@/components/grid-bot/GridConfigPanel';
import GridActiveOrders from '@/components/grid-bot/GridActiveOrders';
import DepositCard from '@/components/onboarding/cards/DepositCard';
import GridChartPanel from '@/components/grid-bot/GridChartPanel';
import { useGridConfig } from '@/lib/hooks/useGridConfig';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import { useMintTradeCap } from '@/lib/hooks/useMintTradeCap';
import { useTradeOrder } from '@/lib/hooks/useTradeOrder';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { type DeepbookNetwork, getSummary } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';

interface BotPageClientProps {
    botName: string;
    botStatus: string;
    balanceManagerId: string;
}

export default function BotPageClient({ botName, botStatus, balanceManagerId }: BotPageClientProps) {
    const { selectedPool } = usePoolSelector();
    const pool = selectedPool?.id ?? 'SUI_USDC';
    const network: DeepbookNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    // Grid bot account and trade cap - pass explicit manager ID from DB
    const botAccount = useGridBotAccount({ explicitManagerId: balanceManagerId });
    const tradeCap = useMintTradeCap({ explicitManagerId: balanceManagerId });
    const { placeMarketOrder, isLoading: isTrading } = useTradeOrder({ managerId: balanceManagerId, network });

    // Poll for current price to update config
    const pricePoll = usePolling(
        React.useCallback(
            () => getSummary({ network }),
            [network]
        ),
        { intervalMs: 5000 }
    );

    // Grid configuration
    const gridConfig = useGridConfig({
        defaultMin: 3.50,
        defaultMax: 4.50,
        defaultGrids: 10,
        defaultInvestment: 100,
    });

    // Update mid price when price data changes
    React.useEffect(() => {
        if (pricePoll.data) {
            const poolSummary = pricePoll.data.find(s => s.trading_pairs === pool);
            if (poolSummary?.last_price) {
                gridConfig.updateMidPrice(poolSummary.last_price);
            }
        }
    }, [pricePoll.data, pool]);

    // Current price for rebalacing check
    const currentPrice = React.useMemo(() => {
        return pricePoll.data?.find(s => s.trading_pairs === pool)?.last_price ?? 0;
    }, [pricePoll.data, pool]);

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

    // isAccountReady: We have an explicit balanceManagerId AND a TradeCap for it
    // Note: botAccount.isReady checks its own internal tradeCapId, but we manage TradeCap separately
    const isAccountReady = !!balanceManagerId && tradeCap.hasTradeCap;
    const needsTradeCap = !tradeCap.hasTradeCap && !tradeCap.isChecking;
    const isMintingTradeCap = tradeCap.status === 'building' || tradeCap.status === 'signing' || tradeCap.status === 'confirming';

    // Check if we need to rebalance (e.g. have SUI but need USDC)
    const deficitQuote = Math.max(0, fundsInfo.required.quote - fundsInfo.available.quote);
    const surplusBase = Math.max(0, fundsInfo.available.base - fundsInfo.required.base);

    // We can rebalance if we have surplus base to cover the quote deficit
    // Need to sell X SUI to get Y USDC. X = Y / Price.
    const baseNeededForSwap = currentPrice > 0 ? (deficitQuote / currentPrice) * 1.01 : 0; // 1% buffer
    const canRebalance = deficitQuote > 0 && surplusBase >= baseNeededForSwap && baseNeededForSwap > 0;

    // Handle TradeCap minting
    const handleMintTradeCap = async () => {
        console.log('[BotPageClient] Minting TradeCap for manager:', balanceManagerId);
        const tradeCapId = await tradeCap.mintTradeCap(balanceManagerId);
        if (tradeCapId) {
            console.log('[BotPageClient] TradeCap minted:', tradeCapId);
            // Recheck to update state
            await tradeCap.checkTradeCaps(balanceManagerId);
        }
    };

    // Handle Rebalance (Sell SUI for USDC)
    const handleRebalance = async () => {
        if (!canRebalance || !currentPrice) return;

        console.log(`[BotPageClient] Rebalancing: Selling ${baseNeededForSwap} SUI for USDC`);

        try {
            const result = await placeMarketOrder({
                poolKey: pool,
                quantity: baseNeededForSwap, // SUI amount
                side: 'sell', // Sell SUI
            });

            if (result.success) {
                console.log('[BotPageClient] Rebalance success:', result.digest);
                // Refresh balances
                setTimeout(() => botAccount.refreshBalances(), 2000);
            }
        } catch (err) {
            console.error('[BotPageClient] Rebalance failed:', err);
        }
    };

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

                    {/* TradeCap Setup Card - shows when needed */}
                    {needsTradeCap && (
                        <div className="bg-[#0f141b] border border-amber-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="text-lg font-bold text-white">Setup Required</h3>
                            </div>
                            <p className="text-sm text-white/50 mb-4">
                                This bot needs a TradeCap to place orders. This is a one-time authorization for this BalanceManager.
                            </p>
                            <button
                                onClick={handleMintTradeCap}
                                disabled={isMintingTradeCap}
                                className="w-full py-3 rounded-lg font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isMintingTradeCap ? 'Minting TradeCap...' : 'Create TradeCap'}
                            </button>
                            {tradeCap.error && (
                                <p className="mt-2 text-xs text-red-400">{tradeCap.error}</p>
                            )}
                        </div>
                    )}

                    {/* Rebalance Card - shows when we have surplus base but deficit quote */}
                    {canRebalance && isAccountReady && (
                        <div className="bg-[#0f141b] border border-blue-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <h3 className="text-lg font-bold text-white">Rebalance Required</h3>
                            </div>
                            <p className="text-sm text-white/50 mb-4">
                                You need {deficitQuote.toFixed(2)} USDC but have {surplusBase.toFixed(2)} extra SUI.
                                Swap SUI for USDC to proceed?
                            </p>
                            <button
                                onClick={handleRebalance}
                                disabled={isTrading}
                                className="w-full py-3 rounded-lg font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTrading ? 'Swapping...' : `Sell ${baseNeededForSwap.toFixed(2)} SUI for USDC`}
                            </button>
                        </div>
                    )}

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
