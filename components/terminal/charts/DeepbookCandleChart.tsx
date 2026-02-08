// components/terminal/charts/DeepbookCandleChart.tsx
// Reusable candlestick chart component using lightweight-charts v4+

'use client';

import React from 'react';
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp, CandlestickSeries } from 'lightweight-charts';
import { normalizeUnixToSeconds } from '@/lib/deepbook/indexer';

type Candle = {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
};

interface DeepbookCandleChartProps {
    /** Raw candles from indexer: [timestamp, open, high, low, close, volume] */
    candles: [number, number, number, number, number, number][];
    /** Chart height in pixels */
    height?: number;
    /** Optional price lines (e.g., grid bot levels) */
    priceLines?: number[];
}

export default function DeepbookCandleChart(props: DeepbookCandleChartProps) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const chartRef = React.useRef<IChartApi | null>(null);
    const candleSeriesRef = React.useRef<ISeriesApi<'Candlestick'> | null>(null);

    // Initialize chart
    React.useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            height: props.height ?? 420,
            layout: {
                background: { color: 'transparent' },
                textColor: '#a1a1aa',
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.04)' },
                horzLines: { color: 'rgba(255,255,255,0.04)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255,255,255,0.08)',
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.08)',
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1, // Normal
            },
        });

        // v4+ API: use addSeries with CandlestickSeries
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            borderVisible: false,
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Handle resize
        const ro = new ResizeObserver(() => {
            if (!containerRef.current || !chartRef.current) return;
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
        };
    }, [props.height]);

    // Update candle data
    React.useEffect(() => {
        const series = candleSeriesRef.current;
        if (!series || !props.candles.length) return;

        const data: Candle[] = props.candles
            .map(([t, o, h, l, c]) => ({
                time: normalizeUnixToSeconds(t) as UTCTimestamp,
                open: o,
                high: h,
                low: l,
                close: c,
            }))
            // Sort ascending by time (lightweight-charts requirement)
            .sort((a, b) => (a.time as number) - (b.time as number));

        series.setData(data);

        // Fit content after data update
        chartRef.current?.timeScale().fitContent();
    }, [props.candles]);

    // Update price lines
    React.useEffect(() => {
        const series = candleSeriesRef.current;
        if (!series) return;

        const lines = props.priceLines ?? [];
        lines.forEach((price) => {
            series.createPriceLine({
                price,
                color: 'rgba(59,130,246,0.35)',
                lineWidth: 1,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
            });
        });
    }, [props.priceLines]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
            style={{ minHeight: props.height ?? 420 }}
        />
    );
}
