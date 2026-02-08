'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { dAppKit } from '@/src/config/dapp-kit';
import { PoolSelectorProvider } from '@/lib/context/PoolSelectorContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <DAppKitProvider dAppKit={dAppKit}>
                <PoolSelectorProvider>
                    {children}
                </PoolSelectorProvider>
            </DAppKitProvider>
        </QueryClientProvider>
    );
}
