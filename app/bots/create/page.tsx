'use client';

import React from 'react';
import Link from 'next/link';
import { CreateBotForm } from '@/components/dashboard/CreateBotForm';

export default function CreateBotPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link href="/bots" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </Link>
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Launch New Strategy
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Create a dedicated account for a new automated trading bot.
                    </p>
                </div>
            </div>

            <CreateBotForm />
        </div>
    );
}
