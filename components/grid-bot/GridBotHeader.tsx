// components/grid-bot/GridBotHeader.tsx
// Header for Grid Bot page with navigation

'use client';

import Link from 'next/link';

interface GridBotHeaderProps {
    pool: string;
    midPrice: number;
}

export default function GridBotHeader({ pool, midPrice }: GridBotHeaderProps) {
    return (
        <>
            {/* Navigation Header */}
            <header className="h-[56px] border-b border-white/5 flex items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white text-sm">
                        DG
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        DEEP GRID
                    </span>
                </Link>
                <nav className="flex items-center gap-6">
                    <Link href="/bots" className="text-sm text-white/50 hover:text-white transition-colors">
                        ← Back to Bots
                    </Link>
                    <Link href="/spot" className="text-sm text-white/50 hover:text-white transition-colors">
                        Terminal
                    </Link>
                </nav>
            </header>

            {/* Title Bar */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            <span className="text-xs text-white/40 uppercase tracking-wider">Grid Bot</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            {pool.replace('_', ' / ')} Grid Trading
                        </h1>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/40">Current Price</p>
                        <p className="text-lg font-mono text-white">
                            ${midPrice.toFixed(4)}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
