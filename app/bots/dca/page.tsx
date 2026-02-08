'use client';

import React from 'react';
import Link from 'next/link';

export default function DCABotPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            {/* Header */}
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
                </nav>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">Low Risk</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        DCA Bot
                    </h1>
                    <p className="text-sm text-white/40">
                        Dollar Cost Averaging - automatically buy at regular intervals regardless of price.
                    </p>
                </div>

                {/* Configuration Panel Placeholder */}
                <div className="rounded-lg border border-white/10 bg-[#0f141b] p-8">
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">DCA Bot Configuration</h3>
                        <p className="text-sm text-white/40 max-w-md mx-auto mb-6">
                            Set your purchase amount, frequency, and target asset to start automated dollar cost averaging.
                        </p>

                        {/* Placeholder Form Fields */}
                        <div className="max-w-sm mx-auto space-y-4 text-left">
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Asset to Buy</label>
                                <div className="px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white/60">
                                    SUI
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Payment Token</label>
                                <div className="px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white/60">
                                    USDC
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Purchase Amount (USDC)</label>
                                <input
                                    type="text"
                                    placeholder="100"
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Frequency</label>
                                <select className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/50">
                                    <option value="hourly">Every Hour</option>
                                    <option value="daily">Every Day</option>
                                    <option value="weekly">Every Week</option>
                                    <option value="monthly">Every Month</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Total Budget (USDC)</label>
                                <input
                                    type="text"
                                    placeholder="1000"
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>

                            <button
                                disabled
                                className="w-full mt-4 px-4 py-3 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium cursor-not-allowed opacity-60"
                            >
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
