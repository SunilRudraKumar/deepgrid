// components/grid-bot/GridChartPanel.tsx
// Chart panel with grid line overlay

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { type DeepbookNetwork, getOhlcv } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';

const DeepbookCandleChart = dynamic(
    () => import('@/components/terminal/charts/DeepbookCandleChart'),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

import { type GridOrder } from '@/lib/grid-bot';

interface GridChartPanelProps {
    pool: string;
    network: DeepbookNetwork;
    gridOrders: GridOrder[];
    levelCount: number;
}

export default function GridChartPanel({ pool, network, gridOrders, levelCount }: GridChartPanelProps) {
    const ohlcvPoll = usePolling(
        React.useCallback(
            () => getOhlcv({ network, pool, interval: '15m', limit: 300 }),
            [network, pool]
        ),
        { intervalMs: 15_000 }
    );

    return (
        <div className="lg:col-span-2 rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Price Chart with Grid Levels</span>
                <span className="text-xs text-white/40">
                    {levelCount} levels
                </span>
            </div>
            <div className="h-[400px]">
                {ohlcvPoll.loading && !ohlcvPoll.data ? (
                    <ChartSkeleton />
                ) : ohlcvPoll.error ? (
                    <div className="h-full flex items-center justify-center text-xs text-rose-400">
                        Failed to load chart
                    </div>
                ) : (
                    <DeepbookCandleChart
                        candles={ohlcvPoll.data?.candles ?? []}
                        height={400}
                        priceLines={gridOrders.map(order => ({
                            price: order.price,
                            color: order.side === 'BUY' ? '#22c55e' : '#ef4444',
                            title: order.side
                        }))}
                    />
                )}
            </div>
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="h-full min-h-[400px] flex items-center justify-center bg-[#0f141b] rounded-lg">
            <div className="flex flex-col items-center gap-2 text-zinc-500">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading chart…</span>
            </div>
        </div>
    );
}
