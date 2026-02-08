'use client';

import React from 'react';

interface BotContextType {
    managerId: string | null;
    network: string;
}

const BotContext = React.createContext<BotContextType | null>(null);

export function useBotContext() {
    return React.useContext(BotContext);
}

export function BotProvider({
    children,
    managerId,
    network = 'mainnet'
}: {
    children: React.ReactNode;
    managerId: string;
    network?: string;
}) {
    // Memoize value to prevent unnecessary re-renders
    const value = React.useMemo(() => ({
        managerId,
        network
    }), [managerId, network]);

    return (
        <BotContext.Provider value={value}>
            {children}
        </BotContext.Provider>
    );
}
