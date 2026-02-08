'use client';

import React from 'react';
import Link from 'next/link';

interface GridBotTitleBarProps {
    pool: string;
    midPrice: number;
}

/**
 * Title bar for Grid Bot page (below TopNav)
 * Shows pool name, current price, and back link
 */
export default function GridBotHeader({ pool, midPrice }: GridBotTitleBarProps) {
    return (
        <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link
                            href="/bots"
                            className="text-xs text-white/40 hover:text-white/70 transition-colors"
                        >
                            ← Back to Bots
                        </Link>
                        <span className="text-white/20">|</span>
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
    );
}
