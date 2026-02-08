'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { getUserBots } from '@/lib/actions/bot-actions';

interface Bot {
    id: string;
    name: string;
    type: string;
    status: string;
    balanceManagerId: string;
    createdAt: Date;
}

export function BotList() {
    const account = useCurrentAccount();
    const [bots, setBots] = React.useState<Bot[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!account?.address) {
            setLoading(false);
            return;
        }

        getUserBots(account.address).then((data) => {
            setBots(data);
            setLoading(false);
        });
    }, [account?.address]);

    if (!account) {
        return <div className="p-4 text-center text-gray-400">Connect wallet to view your bots</div>;
    }

    if (loading) {
        return <div className="p-4 text-center text-blue-400">Loading bots...</div>;
    }

    if (bots.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <h3 className="text-lg font-medium text-white mb-2">No Bots Found</h3>
                <p className="text-gray-400 mb-6">Create your first Grid Bot to get started.</p>
                <Link
                    href="/bots/create"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    Create Bot
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
                <Link key={bot.id} href={`/bots/${bot.id}`} className="block">
                    <div className="bg-[#0f141b] border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                                    {bot.name}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                    {bot.type} • {bot.status}
                                </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${bot.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Manager ID</span>
                                <span className="text-gray-300 font-mono text-xs truncate w-24">
                                    {bot.balanceManagerId.slice(0, 6)}...{bot.balanceManagerId.slice(-4)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Created</span>
                                <span className="text-gray-300">
                                    {new Date(bot.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}

            {/* New Bot Card */}
            <Link href="/bots/create" className="block h-full">
                <div className="h-full min-h-[180px] bg-[#0f141b]/50 border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 text-gray-400 group-hover:text-blue-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-gray-400 font-medium group-hover:text-white transition-colors">Create New Bot</span>
                </div>
            </Link>
        </div>
    );
}
