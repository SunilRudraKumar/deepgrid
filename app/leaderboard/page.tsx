'use client';
import ComingSoon from '@/components/ui/ComingSoon';
import TopNav from '@/components/terminal/TopNav';

export default function LeaderboardPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14]">
            <TopNav />
            <ComingSoon
                title="Trader Leaderboard"
                description="Compete with other traders and see top performing strategies. The leaderboard is under construction."
            />
        </div>
    );
}
