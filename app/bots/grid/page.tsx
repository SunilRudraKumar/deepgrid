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

    // Remove legacy effect - hook handles it internally
    // React.useEffect(() => { ... }) 

    // Grid configuration
    const gridConfig = useGridConfig({
        defaultMin: 3.50,
        defaultMax: 4.50,
        defaultGrids: 10,
        defaultInvestment: 100,
    });

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
                const missing = [];
                if (baseBalance < requiredBase) missing.push(`${(requiredBase - baseBalance).toFixed(4)} SUI`);
                if (quoteBalance < requiredQuote) missing.push(`${(requiredQuote - quoteBalance).toFixed(4)} USDC`);

                alert(`Insufficient funds in Bot Account. Missing: ${missing.join(', ')}. Please deposit funds first.`);
                return;
            }

            console.log(LOG_PREFIX, `Creating grid orders...`);

            // Initialize a single transaction block for batching
            const tx = new Transaction();
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
            alert(`Successfully placed ${validOrdersCount} grid orders!`);

        } catch (error: any) {
            console.error(LOG_PREFIX, 'Error building grid orders:', error);
            alert(`Error: ${error.message}`);
        }
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
                        gridPrices={gridPrices}
                        levelCount={gridConfig.levels.length}
                    />

                    <GridConfigPanel
                        gridConfig={gridConfig}
                        isAccountReady={botAccount.isReady && !!tradeCap.tradeCapId}
                        onCreateBot={handleCreateBot}
                        requiredFunds={fundsCheck.required}
                        availableFunds={fundsCheck.available}
                    />
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
