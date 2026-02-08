'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TopNav from '@/components/terminal/TopNav';
import { CreateBotForm } from '@/components/dashboard/CreateBotForm';

function CreateBotContent() {
    const searchParams = useSearchParams();
    const type = (searchParams.get('type') as 'GRID' | 'DCA') || 'GRID';

    const typeLabel = type === 'GRID' ? 'Grid Bot' : 'DCA Bot';
    const typeDescription = type === 'GRID'
        ? 'Create a dedicated Balance Manager for grid trading. This isolates your bot funds from your main wallet.'
        : 'Create a dedicated Balance Manager for DCA strategy. Set up automatic recurring buys.';

    return (
        <main className="max-w-2xl mx-auto px-6 py-12">
            {/* Back Link */}
            <Link
                href="/bots"
                className="text-white/40 hover:text-white transition-colors flex items-center gap-2 mb-8"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Strategy Lobby
            </Link>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${type === 'GRID' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <span className="text-xs text-white/40 uppercase tracking-wider">New {typeLabel}</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    Launch {typeLabel}
                </h1>
                <p className="text-sm text-white/50">
                    {typeDescription}
                </p>
            </div>

            {/* Form */}
            <CreateBotForm defaultType={type} />
        </main>
    );
}

export default function CreateBotPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            <TopNav />
            <Suspense fallback={<div className="p-6 text-white/40">Loading...</div>}>
                <CreateBotContent />
            </Suspense>
        </div>
    );
}
