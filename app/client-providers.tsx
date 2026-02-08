'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to prevent "window is not defined" error
// dApp Kit accesses window for wallet detection, which doesn't exist on the server
const Providers = dynamic(
    () => import('./providers').then((mod) => mod.Providers),
    { ssr: false, loading: () => null }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return <Providers>{children}</Providers>;
}
