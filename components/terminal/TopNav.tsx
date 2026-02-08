'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { PoolSelector } from './nav/PoolSelector';
import { PoolBalanceDisplay } from './nav/PoolBalanceDisplay';

const DAppKitClientProvider = dynamic(
    () => import('@/src/config/DAppKitClientProvider').then((mod) => mod.DAppKitClientProvider),
    { ssr: false },
);

const ConnectButton = dynamic(
    () => import('@/src/config//DAppKitClientProvider').then((mod) => mod.ConnectButton),
    { ssr: false, loading: () => <button disabled>Loading...</button> },
);

export default function TopNav() {
    const pathname = usePathname();

    return (
        <header className="h-[56px] border-b border-white/5 bg-[#0b0f14] flex items-center justify-between px-4 shrink-0 z-50 relative">
            <div className="flex items-center gap-8">
                {/* Logo - links to landing page */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="font-black italic text-xl tracking-widest bg-gradient-to-b from-white via-gray-200 to-neutral-500 bg-clip-text text-transparent drop-shadow-sm">
                        DEEPGRID
                    </span>
                </Link>

                {/* Nav Links */}
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <NavLink href="/spot" active={pathname?.startsWith('/spot')}>
                        Spot
                    </NavLink>
                    <NavLink href="/bots" active={pathname?.startsWith('/bots')}>
                        Bots
                    </NavLink>
                    <NavLink href="/portfolio" active={pathname?.startsWith('/portfolio')}>
                        Portfolio
                    </NavLink>
                    <NavLink href="/leaderboard" active={pathname?.startsWith('/leaderboard')}>
                        Leaderboard
                    </NavLink>
                </nav>

                {/* Pool Selector & Balance Display */}
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                    <PoolSelector />
                    <PoolBalanceDisplay />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Settings Link */}
                <Link href="/settings" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    Settings
                </Link>

                {/* Profile Link */}
                <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    Profile
                </Link>

                <div className="h-6 w-px bg-white/10" />

                {/* Wallet Button */}
                <DAppKitClientProvider><ConnectButton /></DAppKitClientProvider>

            </div>
        </header>
    );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={cn(
                'transition-colors relative py-1',
                active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200',
            )}
        >
            {children}
            {active && (
                <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
        </Link>
    );
}
