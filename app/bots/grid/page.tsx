'use client';

import React from 'react';
import { usePoolSelector, PoolSelectorProvider } from '@/lib/context/PoolSelectorContext';
import { useGridConfig } from '@/lib/hooks/useGridConfig';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import { useMintTradeCap } from '@/lib/hooks/useMintTradeCap';
import { getSummary, type DeepbookNetwork } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';
import { DAppKitClientProvider } from '@/src/config/DAppKitClientProvider';
import { useDAppKit, useCurrentAccount } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { buildLimitOrderTransaction } from '@/lib/deepbook/orders/limit-order';
import { useTradeOrder } from '@/lib/hooks/useTradeOrder';

// Modular components
import {
    GridBotAccountCard,
    GridConfigPanel,
    GridChartPanel,
    GridLevelsTable,
    GridBotHeader,
    GridActiveOrders,
} from '@/components/grid-bot';
import TopNav from '@/components/terminal/TopNav';

const LOG_PREFIX = '[GridBotPage]';

function GridBotContent() {
    const { selectedPool } = usePoolSelector();
    const pool = selectedPool?.id ?? 'SUI_USDC';
    const network: DeepbookNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    const botAccount = useGridBotAccount();
    const tradeCap = useMintTradeCap();
    const account = useCurrentAccount();
    const { cancelAllOrders } = useTradeOrder({ managerId: botAccount.accountId });

    const [isBotRunning, setIsBotRunning] = React.useState(false);

    // Grid configuration - No defaults
    const gridConfig = useGridConfig({});

    // Fetch market data for mid price
    const summaryPoll = usePolling(
        React.useCallback(
            () => getSummary({ network }).then((rows) => rows.find((r) => r.trading_pairs === pool) ?? null),
            [network, pool]
        ),
        { intervalMs: 5_000 }
    );

    // Update mid price when market data changes
    React.useEffect(() => {
        if (summaryPoll.data?.last_price) {
            gridConfig.updateMidPrice(summaryPoll.data.last_price);
        }
    }, [summaryPoll.data?.last_price]);

    const midPrice = summaryPoll.data?.last_price ?? 0;
    const gridPrices = gridConfig.levels.map(l => l.price);

    // Handle Mint TradeCap button click
    const handleMintTradeCap = async () => {
        console.log(LOG_PREFIX, 'handleMintTradeCap clicked');

        if (!botAccount.accountId) {
            console.log(LOG_PREFIX, 'No Balance Manager ID available');
            return;
        }

        console.log(LOG_PREFIX, 'Minting TradeCap for Balance Manager:', botAccount.accountId);
        const capId = await tradeCap.mintTradeCap(botAccount.accountId);

        if (capId) {
            console.log(LOG_PREFIX, 'TradeCap minted successfully:', capId);
            // Re-check account to update state
            await botAccount.checkAccount();
        } else {
            console.log(LOG_PREFIX, 'TradeCap minting failed');
        }
    };

    // Calculate required funds for UI validation
    const fundsCheck = React.useMemo(() => {
        let requiredBase = 0; // SUI
        let requiredQuote = 0; // USDC

        for (const order of gridConfig.orders) {
            if (order.side === 'BUY') {
                requiredQuote += order.size * order.price;
            } else {
                requiredBase += order.size;
            }
        }

        const baseBalance = botAccount.balances.find(b => b.coinKey === 'SUI')?.balance ?? 0;
        const quoteBalance = botAccount.balances.find(b => b.coinKey === 'USDC')?.balance ?? 0;

        return {
            required: { base: requiredBase, quote: requiredQuote },
            available: { base: baseBalance, quote: quoteBalance }
        };
    }, [gridConfig.orders, botAccount.balances]);

    // Handle Create Grid Bot button click
    const { signAndExecuteTransaction } = useDAppKit();
    const handleCreateBot = async () => {
        console.log(LOG_PREFIX, 'handleCreateBot clicked');

        if (!botAccount.accountId || !tradeCap.tradeCapId) {
            console.error(LOG_PREFIX, 'Bot account or TradeCap missing');
            return;
        }

        if (gridConfig.orders.length === 0) {
            console.warn(LOG_PREFIX, 'No orders to place');
            return;
        }

        try {
            // --- 1. Pre-check: Calculate required funds ---
            let requiredBase = 0; // SUI
            let requiredQuote = 0; // USDC

            for (const order of gridConfig.orders) {
                if (order.side === 'BUY') {
                    // Buy orders need Quote currency (USDC)
                    requiredQuote += order.size * order.price;
                } else {
                    // Sell orders need Base currency (SUI)
                    requiredBase += order.size;
                }
            }

            // Get current balances from botAccount
            const baseBalance = botAccount.balances.find(b => b.coinKey === 'SUI')?.balance ?? 0;
            const quoteBalance = botAccount.balances.find(b => b.coinKey === 'USDC')?.balance ?? 0;

            console.log(LOG_PREFIX, `Required: ${requiredBase.toFixed(4)} SUI, ${requiredQuote.toFixed(4)} USDC`);
            console.log(LOG_PREFIX, `Available: ${baseBalance.toFixed(4)} SUI, ${quoteBalance.toFixed(4)} USDC`);

            if (baseBalance < requiredBase || quoteBalance < requiredQuote) {
                // Check if we have enough TOTAL value to cover the difference (plus buffer)
                // We use midPrice to convert deficits/surpluses
                // midPrice is likely available in scope (from props or hook). 
                // Wait, midPrice is defined in component scope.

                const buffer = 1.02; // 2% buffer for fees and slippage
                const baseDeficit = Math.max(0, requiredBase - baseBalance);
                const quoteDeficit = Math.max(0, requiredQuote - quoteBalance);

                // Value of deficits in USDC
                const deficitValue = (baseDeficit * midPrice) + quoteDeficit;

                // Surplus assets
                const baseSurplus = Math.max(0, baseBalance - requiredBase);
                const quoteSurplus = Math.max(0, quoteBalance - requiredQuote);

                // Value of surpluses in USDC
                const surplusValue = (baseSurplus * midPrice) + quoteSurplus;

                console.log(LOG_PREFIX, `Deficit Value: $${deficitValue.toFixed(2)}, Surplus Value: $${surplusValue.toFixed(2)}`);

                if (surplusValue > deficitValue * buffer) {
                    // We can auto-swap!
                    const confirmSwap = window.confirm(
                        `Insufficient specific balances, but you have enough total value.\n\n` +
                        `Required: ${requiredBase.toFixed(4)} SUI + ${requiredQuote.toFixed(4)} USDC\n` +
                        `Missing: ${baseDeficit > 0 ? baseDeficit.toFixed(4) + ' SUI' : ''} ${quoteDeficit > 0 ? quoteDeficit.toFixed(4) + ' USDC' : ''}\n\n` +
                        `Click OK to AUTO-SWAP and create the bot in one transaction.`
                    );

                    if (!confirmSwap) return;

                    // Proceed to build swap transaction
                    // We inject the swap instructions into the SAME transaction block 'tx' used for orders.
                    // This works because DeepBook settles to BalanceManager immediately.
                } else {
                    const missing = [];
                    if (baseBalance < requiredBase) missing.push(`${(requiredBase - baseBalance).toFixed(4)} SUI`);
                    if (quoteBalance < requiredQuote) missing.push(`${(requiredQuote - quoteBalance).toFixed(4)} USDC`);

                    alert(`Insufficient funds in Bot Account. Missing: ${missing.join(', ')}. Please deposit funds first.`);
                    return;
                }
            }

            console.log(LOG_PREFIX, `Creating grid orders...`);

            // Initialize a single transaction block for batching
            const tx = new Transaction();

            // --- 1.5 Auto-Swap Logic (if needed) ---
            if (baseBalance < requiredBase || quoteBalance < requiredQuote) {
                const baseDeficit = Math.max(0, requiredBase - baseBalance);
                const quoteDeficit = Math.max(0, requiredQuote - quoteBalance);

                if (baseDeficit > 0) {
                    // Need SUI. Sell USDC (Quote) to Buy SUI (Base).
                    // We need 'baseDeficit' SUI. 
                    // DeepBook place_market_order handles quantity in Base or Quote?
                    // Usually Market Buy specifies Quantity of Base Asset you want to buy (if happy with price).
                    // Or specifies Quote Asset to spend. 
                    // Let's check buildMarketOrderTransaction. 
                    // It takes 'quantity'. market-order.ts says "Convert quantity to base units".
                    // So input is Base Units.
                    // So to buy X SUI, we pass X as quantity and side 'buy'.
                    // We add a small buffer to the request? No, if we want exactly X SUI, we ask for X.
                    // But we must have enough USDC to cover X * Price * Slippage.
                    // We already checked surplusValue > deficitValue * 1.02.

                    console.log(LOG_PREFIX, `Auto-swapping for ${baseDeficit.toFixed(4)} SUI...`);
                    const { buildMarketOrderTransaction } = await import('@/lib/deepbook/orders/market-order'); // Dynamic import to avoid cycles/deps
                    await buildMarketOrderTransaction({
                        walletAddress: account?.address ?? '',
                        managerId: botAccount.accountId,
                        poolKey: pool,
                        quantity: baseDeficit * 1.01, // Buy 1% extra to be safe
                        side: 'buy',
                        network: network as any,
                        tx, // Append to same tx
                    });
                }

                if (quoteDeficit > 0) {
                    // Need USDC. Sell SUI (Base) to Buy USDC (Quote).
                    // We need 'quoteDeficit' USDC.
                    // We have surplus SUI.
                    // How much SUI to sell to get Y USDC? Y / Price.
                    const suiToSell = (quoteDeficit / midPrice) * 1.01; // Sell 1% extra SUI to be safe
                    console.log(LOG_PREFIX, `Auto-swapping ${suiToSell.toFixed(4)} SUI for USDC...`);

                    const { buildMarketOrderTransaction } = await import('@/lib/deepbook/orders/market-order'); // Dynamic import
                    await buildMarketOrderTransaction({
                        walletAddress: account?.address ?? '',
                        managerId: botAccount.accountId,
                        poolKey: pool,
                        quantity: suiToSell,
                        side: 'sell',
                        network: network as any,
                        tx, // Append to same tx
                    });
                }
            }

            let validOrdersCount = 0;

            // --- 2. Build Orders ---
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
                        orderType: 'post_only', // Grid orders should be makers generally
                        network: network as any, // Cast to Network type
                        tx, // Pass the existing transaction to append commands
                    });
                    validOrdersCount++;
                } catch (e: any) {
                    // Gracefully skip orders that are too small
                    if (e.message?.includes('Order too small')) {
                        console.warn(LOG_PREFIX, `Skipping small order: ${order.side} ${order.size} @ ${order.price}`);
                        continue;
                    }
                    console.error(LOG_PREFIX, `Error building order:`, e);
                    // Decide if we want to abort or continue. For now, continue but warn.
                }
            }

            if (validOrdersCount === 0) {
                alert('No valid orders to place. Increase investment or grid width.');
                return;
            }

            console.log(LOG_PREFIX, `Placing ${validOrdersCount} valid orders...`);

            // Execute the batch transaction
            const result = await signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(LOG_PREFIX, 'Grid orders placed successfully:', result);
            setTimeout(() => botAccount.checkAccount(), 2000);
            setIsBotRunning(true);
            alert(`Successfully placed ${validOrdersCount} grid orders!`);

        } catch (error: any) {
            console.error(LOG_PREFIX, 'Error building grid orders:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleStopBot = async () => {
        if (!confirm('Are you sure you want to stop the bot? This will cancel all open grid orders.')) {
            return;
        }
        await cancelAllOrders({ poolKey: pool });
        setIsBotRunning(false);
    };

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            {/* Consistent NavBar */}
            <TopNav />

            {/* Title Bar */}
            <GridBotHeader pool={pool} midPrice={midPrice} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6">
                {/* Bot Account Status */}
                <div className="mb-6">
                    <GridBotAccountCard
                        botAccount={botAccount}
                        mintStatus={tradeCap.status}
                        onMintTradeCap={handleMintTradeCap}
                    />

                    {/* Error display (only for minting errors) */}
                    {tradeCap.status === 'error' && (
                        <div className="mt-2 px-4 py-2 rounded bg-red-500/10 border border-red-500/30">
                            <p className="text-xs text-red-400">
                                Error: {tradeCap.error}
                            </p>
                        </div>
                    )}
                </div>

                {/* Grid Layout: Chart + Config */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GridChartPanel
                        pool={pool}
                        network={network}
                        gridOrders={gridConfig.orders}
                        levelCount={gridConfig.levels.length}
                    />

                    {isBotRunning ? (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-6 flex flex-col items-center justify-center space-y-4 h-full min-h-[400px]">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-green-400">Bot is Running</h3>
                                <p className="text-green-300/60 max-w-xs mx-auto">
                                    Grid orders are active. The bot is monitoring the market and will execute trades within your range.
                                </p>
                            </div>

                            <div className="pt-6 w-full max-w-xs">
                                <button
                                    onClick={handleStopBot}
                                    className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all font-medium flex items-center justify-center gap-2 group"
                                >
                                    <span>Stop Bot</span>
                                </button>
                                <p className="text-[10px] text-red-400/50 text-center mt-2">
                                    Cancels all open orders and stops trading
                                </p>
                            </div>
                        </div>
                    ) : (
                        <GridConfigPanel
                            gridConfig={gridConfig}
                            isAccountReady={botAccount.isReady && !!tradeCap.tradeCapId}
                            onCreateBot={handleCreateBot}
                            requiredFunds={fundsCheck.required}
                            availableFunds={fundsCheck.available}
                        />
                    )}
                </div>

                {/* Grid Levels Table */}
                <div className="mt-6 mb-6">
                    <GridLevelsTable
                        orders={gridConfig.orders}
                        pivotIndex={gridConfig.pivotIndex}
                        pivotPrice={gridConfig.levels[gridConfig.pivotIndex]?.price ?? 0}
                    />
                </div>

                {/* Active Orders */}
                <div className="mt-6 mb-6">
                    <GridActiveOrders
                        managerId={botAccount.accountId || ''}
                        poolKey={pool}
                        network={network}
                    />
                </div>
            </main>
        </div>
    );
}

export default function GridBotPage() {
    return (
        <DAppKitClientProvider>
            <PoolSelectorProvider>
                <GridBotContent />
            </PoolSelectorProvider>
        </DAppKitClientProvider>
    );
}
