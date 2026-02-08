// components/terminal/panels/OrderBookPanel.tsx
// Live order book panel with real DeepBook data

'use client';

import React from 'react';
import { Panel } from '../ui/Panel';
import { Tabs } from '../ui/Tabs';
import { getOrderbook, getTrades, type DeepbookNetwork } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';

type TabKey = 'book' | 'trades';

interface OrderBookPanelProps {
    /** Override pool (otherwise uses PoolSelector context) */
    pool?: string;
    /** Override network */
    network?: DeepbookNetwork;
}

export default function OrderBookPanel(props: OrderBookPanelProps) {
    const { selectedPool } = usePoolSelector();

    // Use props or fall back to context
    const pool = props.pool ?? selectedPool?.id ?? 'SUI_USDC';
    const network: DeepbookNetwork = (props.network ?? process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    const [tab, setTab] = React.useState<TabKey>('book');

    return (
        <Panel
            title={
                <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: 'book', label: 'Order Book' },
                        { value: 'trades', label: 'Trades' },
                    ]}
                />
            }
            right={<span className="text-xs text-zinc-500">{pool.replace('_', '/')}</span>}
        >
            {tab === 'book' ? (
                <OrderBookTable pool={pool} network={network} />
            ) : (
                <TradeHistoryTable pool={pool} network={network} />
            )}
        </Panel>
    );
}

// --- Order Book Table ---

function OrderBookTable({ pool, network }: { pool: string; network: DeepbookNetwork }) {
    const poll = usePolling(
        React.useCallback(
            () => getOrderbook({ network, pool, level: 2, depth: 40 }),
            [network, pool]
        ),
        { intervalMs: 1000 }
    );

    if (poll.loading && !poll.data) {
        return <LoadingState message="Loading orderbook…" />;
    }
    if (poll.error || !poll.data) {
        return <ErrorState message="Failed to load orderbook" />;
    }

    const { bids, asks } = poll.data;

    // Parse and calculate cumulative depth
    const parsedAsks = asks.map(([price, size]) => ({
        price: Number(price),
        size: Number(size),
    }));
    const parsedBids = bids.map(([price, size]) => ({
        price: Number(price),
        size: Number(size),
    }));

    // Cumulative size for depth visualization
    let askCum = 0;
    const asksWithCum = parsedAsks.map((r) => {
        askCum += r.size;
        return { ...r, cum: askCum };
    });

    let bidCum = 0;
    const bidsWithCum = parsedBids.map((r) => {
        bidCum += r.size;
        return { ...r, cum: bidCum };
    });

    const maxCum = Math.max(
        asksWithCum.at(-1)?.cum ?? 1,
        bidsWithCum.at(-1)?.cum ?? 1
    );

    const bestAsk = asksWithCum[0]?.price;
    const bestBid = bidsWithCum[0]?.price;
    const midPrice = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;
    const spreadPct = bestAsk && bestBid ? ((bestAsk - bestBid) / bestAsk) * 100 : null;

    return (
        <div className="h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 border-b border-white/5 px-3 py-2 text-[11px] text-zinc-400 shrink-0">
                <div>Price</div>
                <div className="text-right">Size</div>
                <div className="text-right">Total</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Asks - render reversed so best ask is near spread */}
                <div className="flex flex-col-reverse">
                    {asksWithCum.slice(0, 20).map((r, i) => (
                        <OrderRow
                            key={`a-${r.price}-${i}`}
                            price={r.price}
                            size={r.size}
                            cumulative={r.cum}
                            maxCum={maxCum}
                            side="ask"
                        />
                    ))}
                </div>

                {/* Spread / Mid Price */}
                <div className="sticky top-0 z-20 border-y border-white/5 bg-[#0f141b] px-3 py-2 text-sm font-semibold text-emerald-400 flex items-center justify-between">
                    <span>{midPrice ? midPrice.toFixed(6) : '—'}</span>
                    <span className="text-xs font-normal text-zinc-500">
                        {spreadPct != null ? `Spread ${spreadPct.toFixed(4)}%` : ''}
                    </span>
                </div>

                {/* Bids */}
                <div>
                    {bidsWithCum.slice(0, 20).map((r, i) => (
                        <OrderRow
                            key={`b-${r.price}-${i}`}
                            price={r.price}
                            size={r.size}
                            cumulative={r.cum}
                            maxCum={maxCum}
                            side="bid"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function OrderRow({
    price,
    size,
    cumulative,
    maxCum,
    side,
}: {
    price: number;
    size: number;
    cumulative: number;
    maxCum: number;
    side: 'ask' | 'bid';
}) {
    const depthPct = (cumulative / maxCum) * 100;
    const bgColor = side === 'ask' ? 'bg-rose-500/10' : 'bg-emerald-500/10';
    const textColor = side === 'ask' ? 'text-rose-400' : 'text-emerald-400';

    return (
        <div className="grid w-full grid-cols-3 gap-2 px-3 py-1 text-[12px] relative hover:bg-white/5">
            <div
                className={`absolute right-0 top-0 bottom-0 ${bgColor}`}
                style={{ width: `${depthPct}%`, opacity: 0.35 }}
            />
            <div className={`${textColor} relative z-10 text-left font-mono`}>
                {price.toFixed(6)}
            </div>
            <div className="text-right text-zinc-300 relative z-10 font-mono">
                {formatSize(size)}
            </div>
            <div className="text-right text-zinc-500 relative z-10 font-mono">
                {formatSize(cumulative)}
            </div>
        </div>
    );
}

// --- Trade History Table ---

function TradeHistoryTable({ pool, network }: { pool: string; network: DeepbookNetwork }) {
    const poll = usePolling(
        React.useCallback(
            () => getTrades({ network, pool, limit: 50 }),
            [network, pool]
        ),
        { intervalMs: 1500 }
    );

    if (poll.loading && !poll.data) {
        return <LoadingState message="Loading trades…" />;
    }
    if (poll.error || !poll.data) {
        return <ErrorState message="Failed to load trades" />;
    }

    return (
        <div className="h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 border-b border-white/5 px-3 py-2 text-[11px] text-zinc-400 shrink-0">
                <div>Time</div>
                <div className="text-right">Price</div>
                <div className="text-right">Size</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {poll.data.map((trade, i) => {
                    const time = new Date(trade.timestamp).toLocaleTimeString();
                    const priceColor = trade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400';

                    return (
                        <div
                            key={`${trade.timestamp}-${trade.price}-${i}`}
                            className="grid grid-cols-3 gap-2 px-3 py-1 text-[12px] border-b border-white/5 hover:bg-white/5"
                        >
                            <div className="text-zinc-500">{time}</div>
                            <div className={`text-right font-mono ${priceColor}`}>
                                {trade.price.toFixed(6)}
                            </div>
                            <div className="text-right text-zinc-300 font-mono">
                                {formatSize(trade.base_volume)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Shared Components ---

function LoadingState({ message }: { message: string }) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-zinc-500">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">{message}</span>
            </div>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="h-full flex items-center justify-center text-xs text-rose-400">
            {message}
        </div>
    );
}

// --- Helpers ---

function formatSize(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
    if (val >= 1) return val.toFixed(2);
    return val.toFixed(4);
}
