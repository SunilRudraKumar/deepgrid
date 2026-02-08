'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/terminal/TopNav';

interface BotCard {
    id: string;
    name: string;
    tagline: string;
    description: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Variable';
    targetAudience: string;
    isLocked: boolean;
    href?: string;
}

const BOTS: BotCard[] = [
    {
        id: 'grid-bot',
        name: 'Grid Bot',
        tagline: 'Range Trading',
        description: 'Place automated buy and sell orders at preset intervals within a price range. Profit from market volatility.',
        riskLevel: 'Medium',
        targetAudience: 'Active Traders',
        isLocked: false,
        href: '/bots/grid',
    },
    {
        id: 'dca-bot',
        name: 'DCA Bot',
        tagline: 'Dollar Cost Averaging',
        description: 'Automatically buy a fixed amount at regular intervals regardless of price. Reduce timing risk.',
        riskLevel: 'Low',
        targetAudience: 'Long-term Investors',
        isLocked: false,
        href: '/bots/dca',
    },
    {
        id: 'stable-farmer',
        name: 'Stable Farmer',
        tagline: 'Conservative Yield',
        description: 'Automated tight-range grids for stablecoin pairs. Captures micro-volatility with zero directional risk.',
        riskLevel: 'Low',
        targetAudience: 'Yield Farmers',
        isLocked: true,
    },
    {
        id: 'delta-neutral',
        name: 'Delta-Neutral Funding',
        tagline: 'Institutional Grade',
        description: 'Hedge your spot exposure to farm DeepBook funding rates delta-neutrally. 1-click Short + Spot setup.',
        riskLevel: 'Medium',
        targetAudience: 'Pro Traders',
        isLocked: true,
    },
    {
        id: 'memecoin-sniper',
        name: 'Memecoin Sniper',
        tagline: 'High Risk / High Reward',
        description: 'Detects new DeepBook pool creations and snipes liquidity in the same block. Front-run the market.',
        riskLevel: 'High',
        targetAudience: 'Degens',
        isLocked: true,
    },
    {
        id: 'portfolio-rebalancer',
        name: 'Portfolio Rebalancer',
        tagline: 'Set & Forget',
        description: 'Automatically adjusts your portfolio weights. Sells winners and buys losers to maintain target ratio.',
        riskLevel: 'Variable',
        targetAudience: 'Long-term Holders',
        isLocked: true,
    },
];

function getRiskStyle(risk: string) {
    switch (risk) {
        case 'Low': return 'text-green-500 border-green-500/30';
        case 'Medium': return 'text-yellow-500 border-yellow-500/30';
        case 'High': return 'text-red-500 border-red-500/30';
        default: return 'text-blue-500 border-blue-500/30';
    }
}

function BotCardComponent({ bot, onNotify }: { bot: BotCard; onNotify: (id: string) => void }) {
    const CardContent = (
        <div className={`p-5 ${bot.isLocked ? 'opacity-60' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-white">{bot.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{bot.tagline}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${getRiskStyle(bot.riskLevel)}`}>
                    {bot.riskLevel}
                </span>
            </div>

            {/* Description */}
            <p className="text-xs text-white/50 leading-relaxed mb-4">
                {bot.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                    For {bot.targetAudience}
                </span>
                {bot.isLocked ? (
                    <button
                        onClick={(e) => { e.preventDefault(); onNotify(bot.id); }}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                    >
                        Notify Me
                    </button>
                ) : (
                    <span className="px-3 py-1.5 rounded text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        Launch →
                    </span>
                )}
            </div>
        </div>
    );

    if (bot.isLocked) {
        return (
            <div className="relative group rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden hover:border-white/20 transition-colors">
                {/* Lock Overlay */}
                <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-center">
                        <div className="text-2xl mb-1 text-white/60">🔒</div>
                        <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Coming Soon</p>
                    </div>
                </div>
                {CardContent}
            </div>
        );
    }

    return (
        <Link
            href={bot.href || '#'}
            className="block rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden hover:border-blue-500/50 hover:bg-[#111820] transition-all"
        >
            {CardContent}
        </Link>
    );
}

export default function BotsPage() {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleNotify = (botId: string) => {
        const bot = BOTS.find(b => b.id === botId);
        if (bot) {
            setToastMessage(`You'll be notified when ${bot.name} launches`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const activeBots = BOTS.filter(b => !b.isLocked);
    const comingSoonBots = BOTS.filter(b => b.isLocked);

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            <TopNav />

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">Strategy Lobby</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Automated Trading Bots
                    </h1>
                    <p className="text-sm text-white/40">
                        Choose your strategy, set your parameters, and let DeepGrid execute.
                    </p>
                </div>

                {/* Active Bots */}
                <div className="mb-8">
                    <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">Available Now</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeBots.map(bot => (
                            <BotCardComponent
                                key={bot.id}
                                bot={bot}
                                onNotify={handleNotify}
                            />
                        ))}
                    </div>
                </div>

                {/* Coming Soon Bots */}
                <div>
                    <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">Coming Soon</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {comingSoonBots.map(bot => (
                            <BotCardComponent
                                key={bot.id}
                                bot={bot}
                                onNotify={handleNotify}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 px-4 py-2 rounded border border-white/10 bg-[#0f141b] text-white/80 text-xs">
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
