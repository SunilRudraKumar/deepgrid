'use client';
import TopNav from '@/components/terminal/TopNav';
const OnboardingGate = dynamic(
    () => import('@/components/onboarding/OnboardingGate'),
    { ssr: false },
);

import dynamic from 'next/dynamic';

const DAppKitClientProvider = dynamic(
    () => import('@/src/config/DAppKitClientProvider').then((mod) => mod.DAppKitClientProvider),
    { ssr: false },
);

export default function ProfilePage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-100">
            <TopNav />
            <main className="flex-1 p-6 flex flex-col items-center">
                <div className="w-full max-w-4xl flex-1 flex flex-col">
                    <h1 className="text-2xl font-bold mb-6 text-zinc-100">Profile & Account Setup</h1>
                    <div className="flex-1 min-h-[500px] border border-white/5 rounded-lg overflow-hidden bg-[#0f141b] shadow-2xl">
                        <DAppKitClientProvider>
                            <OnboardingGate />
                        </DAppKitClientProvider>
                    </div>
                </div>
            </main>
        </div>
    );
}
