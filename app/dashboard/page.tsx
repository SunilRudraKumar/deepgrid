'use client';

import React from 'react';
import { BotList } from '@/components/dashboard/BotList';

export default function DashboardPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Bots</h1>
                    <p className="text-gray-400">Manage your active trading strategies</p>
                </div>
            </div>

            <BotList />
        </div>
    );
}
