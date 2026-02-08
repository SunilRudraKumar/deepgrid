// components/terminal/panels/ChartPanel.tsx
// Live chart panel with real DeepBook data

'use client';

import React from 'react';
import { Panel } from '../ui/Panel';
import dynamic from 'next/dynamic';
import { getOhlcv, getSummary, type DeepbookNetwork, type CandleInterval, CANDLE_INTERVALS } from '@/lib/deepbook/indexer';
import { usePolling } from '@/lib/hooks/usePolling';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { cn } from '@/lib/utils';

// Dynamic import for chart (uses window)
const DeepbookCandleChart = dynamic(
    () => import('../charts/DeepbookCandleChart'),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

interface ChartPanelProps {
    /** Override pool (otherwise uses PoolSelector context) */
    pool?: string;
    /** Override network */
    network?: DeepbookNetwork;
}

export default function ChartPanel(props: ChartPanelProps) {
    const { selectedPool } = usePoolSelector();

    // Use props or fall back to context
    const pool = props.pool ?? selectedPool?.id ?? 'SUI_USDC';
    const network: DeepbookNetwork = (props.network ?? process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    const [interval, setInterval] = React.useState<CandleInterval>('15m');

    // Poll for market summary (24h stats)
    const summaryPoll = usePolling(
        React.useCallback(
            () => getSummary({ network }).then((rows) => rows.find((r) => r.trading_pairs === pool) ?? null),
            [network, pool]
        ),
        { intervalMs: 5_000 }
    );

    // Poll for OHLCV candles
    const ohlcvPoll = usePolling(
        React.useCallback(
            () => getOhlcv({ network, pool, interval, limit: 300 }),
            [network, pool, interval]
        ),
        { intervalMs: interval === '1m' ? 5_000 : 15_000 }
    );

    const summary = summaryPoll.data;

    return (
        <Panel
            title={
                <div className="flex items-center gap-3">
                    <span className="text-zinc-100 font-semibold">{pool.replace('_', '–')}</span>
                    {summary ? (
                        <>
                            <span className="text-sm font-mono text-zinc-200">
                                ${summary.last_price?.toFixed(4) ?? '—'}
                            </span>
                            <span className={cn(
                                'text-xs font-medium',
                                summary.price_change_percent_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                                {summary.price_change_percent_24h >= 0 ? '+' : ''}
                                {summary.price_change_percent_24h?.toFixed(2) ?? 0}%
                            </span>
                            <span className="text-xs text-zinc-500">
                                24h Vol: {formatVolume(summary.base_volume)}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-zinc-500">Loading market…</span>
                    )}
                </div>
            }
            right={<IntervalSelector value={interval} onChange={setInterval} />}
        >
            <div className="h-full min-h-[300px]">
                {ohlcvPoll.loading && !ohlcvPoll.data ? (
                    <ChartSkeleton />
                ) : ohlcvPoll.error ? (
                    <div className="h-full flex items-center justify-center text-xs text-rose-400">
                        Failed to load candles
                    </div>
                ) : (
                    <DeepbookCandleChart candles={ohlcvPoll.data?.candles ?? []} />
                )}
            </div>
        </Panel>
    );
}

// --- Sub-components ---

function IntervalSelector({ value, onChange }: { value: CandleInterval; onChange: (v: CandleInterval) => void }) {
    const displayIntervals: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

    return (
        <div className="flex items-center gap-1 text-xs">
            {displayIntervals.map((t) => (
                <button
                    key={t}
                    onClick={() => onChange(t)}
                    className={cn(
                        'rounded-md px-2 py-1 transition-colors',
                        value === t
                            ? 'bg-white/10 text-zinc-100'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    )}
                >
                    {t}
                </button>
            ))}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="h-full min-h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-zinc-500">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading chart…</span>
            </div>
        </div>
    );
}

// --- Helpers ---

function formatVolume(vol: number | undefined): string {
    if (!vol) return '—';
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
    return vol.toFixed(2);
}
