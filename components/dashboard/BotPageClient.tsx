'use client';

import React from 'react';
import TopNav from '@/components/terminal/TopNav';
import GridConfigPanel from '@/components/grid-bot/GridConfigPanel';
import GridActiveOrders from '../grid-bot/GridActiveOrders';
import SwapCard from './cards/SwapCard';
import DepositCard from '@/components/onboarding/cards/DepositCard';
import GridChartPanel from '@/components/grid-bot/GridChartPanel';
import { useGridConfig } from '@/lib/hooks/useGridConfig';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import { useMintTradeCap } from '@/lib/hooks/useMintTradeCap';
import { useTradeOrder } from '@/lib/hooks/useTradeOrder';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { type DeepbookNetwork, getSummary } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';
import { Transaction } from '@mysten/sui/transactions';
import { buildLimitOrderTransaction } from '@/lib/deepbook/orders/limit-order';
import { useDAppKit, useCurrentAccount } from '@mysten/dapp-kit-react';

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
    const { signAndExecuteTransaction } = useDAppKit();
    const account = useCurrentAccount();

    // Grid configuration
    const gridConfig = useGridConfig({
        defaultMin: 3.50,
        defaultMax: 4.50,
        defaultGrids: 10,
        defaultInvestment: 100,
    });

    // Poll for current price to update config
    const pricePoll = usePolling(
        React.useCallback(
            () => getSummary({ network }),
            [network]
        ),
        { intervalMs: 5000 }
    );

    // Update mid price when price data changes
    React.useEffect(() => {
        if (pricePoll.data) {
            const poolSummary = pricePoll.data.find(s => s.trading_pairs === pool);
            if (poolSummary?.last_price) {
                gridConfig.updateMidPrice(poolSummary.last_price);
            }
        }
    }, [pricePoll.data, pool, gridConfig]);

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
    const isAccountReady = !!balanceManagerId && tradeCap.hasTradeCap;
    const needsTradeCap = !tradeCap.hasTradeCap && !tradeCap.isChecking;
    const isMintingTradeCap = tradeCap.status === 'building' || tradeCap.status === 'signing' || tradeCap.status === 'confirming';

    // Handle Create Bot (Start Grid)
    const handleCreateBot = async () => {
        console.log('[BotPageClient] Starting Grid with config:', gridConfig.orders);

        if (!botAccount.accountId || !tradeCap.tradeCapId) {
            console.error('[BotPageClient] Bot account or TradeCap missing');
            return;
        }

        if (gridConfig.orders.length === 0) {
            console.warn('[BotPageClient] No orders to place');
            alert('No orders calculated. Please check your price range.');
            return;
        }

        try {
            // --- 1. Pre-check: Calculate required funds ---
            const orders = gridConfig.orders;
            const requiredBase = orders.filter(o => o.side === 'SELL').reduce((sum, o) => sum + o.size, 0);
            const requiredQuote = orders.filter(o => o.side === 'BUY').reduce((sum, o) => sum + (o.size * o.price), 0);

            // Get current balances from botAccount
            const baseBalance = botAccount.balances.find(b => b.coinKey === 'SUI')?.balance ?? 0;
            const quoteBalance = botAccount.balances.find(b => b.coinKey === 'USDC')?.balance ?? 0;

            console.log(`[BotPageClient] Required: ${requiredBase.toFixed(4)} SUI, ${requiredQuote.toFixed(4)} USDC`);
            console.log(`[BotPageClient] Available: ${baseBalance.toFixed(4)} SUI, ${quoteBalance.toFixed(4)} USDC`);

            if (baseBalance < requiredBase || quoteBalance < requiredQuote) {
                // Auto-Swap Logic
                // Use currentPrice (midPrice) for conversion
                const midPrice = currentPrice || gridConfig.config.min; // Fallback

                const buffer = 1.02; // 2% buffer
                const baseDeficit = Math.max(0, requiredBase - baseBalance);
                const quoteDeficit = Math.max(0, requiredQuote - quoteBalance);

                // Value in USDC
                const deficitValue = (baseDeficit * midPrice) + quoteDeficit;
                const baseSurplus = Math.max(0, baseBalance - requiredBase);
                const quoteSurplus = Math.max(0, quoteBalance - requiredQuote);
                const surplusValue = (baseSurplus * midPrice) + quoteSurplus;

                if (surplusValue > deficitValue * buffer) {
                    const confirmSwap = window.confirm(
                        `Insufficient specific balances, but you have enough total value.\n\n` +
                        `Required: ${requiredBase.toFixed(4)} SUI + ${requiredQuote.toFixed(4)} USDC\n` +
                        `Missing: ${baseDeficit > 0 ? baseDeficit.toFixed(4) + ' SUI' : ''} ${quoteDeficit > 0 ? quoteDeficit.toFixed(4) + ' USDC' : ''}\n\n` +
                        `Click OK to AUTO-SWAP and start the bot in one transaction.`
                    );

                    if (!confirmSwap) return;
                } else {
                    const missing = [];
                    if (baseBalance < requiredBase) missing.push(`${(requiredBase - baseBalance).toFixed(4)} SUI`);
                    if (quoteBalance < requiredQuote) missing.push(`${(requiredQuote - quoteBalance).toFixed(4)} USDC`);

                    alert(`Insufficient funds. Missing: ${missing.join(', ')}. Please deposit or swap funds.`);
                    return;
                }
            }

            console.log(`[BotPageClient] Building transaction...`);
            const tx = new Transaction();

            // --- 1.5 Auto-Swap Injection ---
            if (baseBalance < requiredBase || quoteBalance < requiredQuote) {
                const midPrice = currentPrice || gridConfig.config.min;
                const baseDeficit = Math.max(0, requiredBase - baseBalance);
                const quoteDeficit = Math.max(0, requiredQuote - quoteBalance);

                if (baseDeficit > 0) {
                    console.log(`[BotPageClient] Auto-swapping for ${baseDeficit.toFixed(4)} SUI...`);
                    const { buildMarketOrderTransaction } = await import('@/lib/deepbook/orders/market-order');
                    await buildMarketOrderTransaction({
                        walletAddress: account?.address ?? '',
                        managerId: botAccount.accountId,
                        poolKey: pool,
                        quantity: baseDeficit * 1.01,
                        side: 'buy',
                        network: network,
                        tx,
                    });
                }

                if (quoteDeficit > 0) {
                    const suiToSell = (quoteDeficit / midPrice) * 1.01;
                    console.log(`[BotPageClient] Auto-swapping ${suiToSell.toFixed(4)} SUI for USDC...`);
                    const { buildMarketOrderTransaction } = await import('@/lib/deepbook/orders/market-order');
                    await buildMarketOrderTransaction({
                        walletAddress: account?.address ?? '',
                        managerId: botAccount.accountId,
                        poolKey: pool,
                        quantity: suiToSell,
                        side: 'sell',
                        network: network,
                        tx,
                    });
                }
            }

            // --- 2. Build Grid Orders ---
            let validOrdersCount = 0;
            for (const order of gridConfig.orders) {
                try {
                    await buildLimitOrderTransaction({
                        walletAddress: account?.address ?? '',
                        managerId: botAccount.accountId,
                        tradeCapId: tradeCap.tradeCapId,
                        poolKey: pool,
                        quantity: order.size,
                        price: order.price,
                        side: order.side.toLowerCase() as 'buy' | 'sell',
                        orderType: 'post_only',
                        network: network,
                        tx,
                    });
                    validOrdersCount++;
                } catch (e: any) {
                    if (e.message?.includes('Order too small')) {
                        continue;
                    }
                    console.error(`[BotPageClient] Error building order:`, e);
                }
            }

            if (validOrdersCount === 0) {
                alert('No valid orders (too small?). Increase investment.');
                return;
            }

            console.log(`[BotPageClient] Placing ${validOrdersCount} orders...`);

            const result = await signAndExecuteTransaction({
                transaction: tx,
            });

            console.log('[BotPageClient] Success:', result);
            alert(`Successfully placed ${validOrdersCount} grid orders!`);
            setTimeout(() => botAccount.checkAccount(), 2000);

        } catch (error: any) {
            console.error('[BotPageClient] Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

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

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">

            {/* Top Navigation */}
            <div className="mb-6">
                <TopNav />
            </div>

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
                            gridOrders={gridConfig.orders}
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

                    <GridConfigPanel
                        gridConfig={gridConfig}
                        isAccountReady={!!balanceManagerId}
                        onCreateBot={handleCreateBot}
                        requiredFunds={fundsInfo.required}
                        availableFunds={fundsInfo.available}
                    />

                    {/* Swap Card - Manual Rebalancing */}
                    <SwapCard
                        managerId={balanceManagerId || ''}
                        onSuccess={() => botAccount.refreshBalances()}
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
