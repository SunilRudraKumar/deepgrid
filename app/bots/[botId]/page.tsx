import React from 'react';
import { notFound } from 'next/navigation';
import { getBot } from '@/lib/actions/bot-actions';
import { BotProvider } from '@/lib/context/BotContext';
import BotPageClient from '@/components/dashboard/BotPageClient';

interface BotPageProps {
    params: {
        botId: string;
    };
}

export default async function BotPage({ params }: BotPageProps) {
    const bot = await getBot(params.botId);

    if (!bot) {
        notFound();
    }

    return (
        <BotProvider managerId={bot.balanceManagerId} network={bot.network}>
            <BotPageClient
                botName={bot.name}
                botStatus={bot.status}
                balanceManagerId={bot.balanceManagerId}
            />
        </BotProvider>
    );
}
