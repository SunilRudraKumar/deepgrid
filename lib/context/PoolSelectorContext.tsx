'use client';

import React from 'react';
import { POOLS, DEFAULT_POOL_ID, type PoolConfig } from '@/lib/config/pools';

interface PoolSelectorContextValue {
    selectedPoolId: string;
    selectedPool: PoolConfig | undefined;
    setSelectedPoolId: (id: string) => void;
}

const PoolSelectorContext = React.createContext<PoolSelectorContextValue | undefined>(undefined);

export function PoolSelectorProvider({ children }: { children: React.ReactNode }) {
    const [selectedPoolId, setSelectedPoolId] = React.useState<string>(DEFAULT_POOL_ID);

    const selectedPool = React.useMemo(
        () => POOLS.find(p => p.id === selectedPoolId),
        [selectedPoolId]
    );

    return (
        <PoolSelectorContext.Provider value={{ selectedPoolId, selectedPool, setSelectedPoolId }}>
            {children}
        </PoolSelectorContext.Provider>
    );
}

export function usePoolSelector() {
    const context = React.useContext(PoolSelectorContext);
    if (!context) {
        throw new Error('usePoolSelector must be used within a PoolSelectorProvider');
    }
    return context;
}
