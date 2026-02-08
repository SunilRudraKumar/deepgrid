'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- User Actions ---

export async function ensureUser(address: string) {
    if (!address) return null;

    // Upsert user (create if not exists)
    const user = await prisma.user.upsert({
        where: { address },
        update: {},
        create: { address },
    });

    return user;
}

// --- Bot Actions ---

export type CreateBotInput = {
    ownerAddress: string;
    name: string;
    type: 'GRID' | 'DCA';
    balanceManagerId: string;
    network?: string;
};

export async function registerBot(input: CreateBotInput) {
    const { ownerAddress, name, type, balanceManagerId, network = 'mainnet' } = input;

    await ensureUser(ownerAddress);

    try {
        const bot = await prisma.bot.create({
            data: {
                name,
                type,
                balanceManagerId,
                network,
                ownerAddress,
                status: 'ACTIVE',
                config: JSON.stringify({}), // Empty config initially
            },
        });

        revalidatePath('/bots');
        return { success: true, bot };
    } catch (error) {
        console.error('Failed to register bot:', error);
        return { success: false, error: 'Failed to create bot' };
    }
}

export async function getUserBots(ownerAddress: string) {
    if (!ownerAddress) return [];

    const bots = await prisma.bot.findMany({
        where: { ownerAddress },
        orderBy: { createdAt: 'desc' },
    });

    return bots;
}

export async function getBot(id: string) {
    const bot = await prisma.bot.findUnique({
        where: { id },
    });
    return bot;
}

export async function updateBotConfig(id: string, config: any) {
    try {
        const updated = await prisma.bot.update({
            where: { id },
            data: {
                config: JSON.stringify(config),
            },
        });
        revalidatePath(`/bots/${id}`);
        return { success: true, bot: updated };
    } catch (error) {
        return { success: false, error: 'Failed to update config' };
    }
}

/**
 * Get a user's bot by type (GRID or DCA)
 * Returns the first bot of that type, or null if none exists
 */
export async function getBotByType(ownerAddress: string, type: 'GRID' | 'DCA') {
    if (!ownerAddress) return null;

    const bot = await prisma.bot.findFirst({
        where: {
            ownerAddress,
            type
        },
        orderBy: { createdAt: 'desc' },
    });

    return bot;
}

