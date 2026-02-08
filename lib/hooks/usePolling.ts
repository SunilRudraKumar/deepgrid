// lib/hooks/usePolling.ts
// Generic polling hook for live data fetching

'use client';

import React from 'react';

export interface UsePollingOptions {
    intervalMs: number;
    enabled?: boolean;
}

export interface UsePollingResult<T> {
    data: T | null;
    error: unknown;
    loading: boolean;
    refetch: () => void;
}

/**
 * Generic polling hook that fetches data at regular intervals
 */
export function usePolling<T>(
    fn: () => Promise<T>,
    opts: UsePollingOptions
): UsePollingResult<T> {
    const [data, setData] = React.useState<T | null>(null);
    const [error, setError] = React.useState<unknown>(null);
    const [loading, setLoading] = React.useState(true);

    const fnRef = React.useRef(fn);
    fnRef.current = fn;

    const tick = React.useCallback(async () => {
        try {
            setLoading(true);
            const res = await fnRef.current();
            setData(res);
            setError(null);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (opts.enabled === false) return;

        let alive = true;

        const doTick = async () => {
            if (!alive) return;
            await tick();
        };

        doTick();
        const id = setInterval(doTick, opts.intervalMs);

        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [opts.enabled, opts.intervalMs, tick]);

    return { data, error, loading, refetch: tick };
}
