'use client';
import ComingSoon from '@/components/ui/ComingSoon';
import TopNav from '@/components/terminal/TopNav';

export default function PortfolioPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14]">
            <TopNav />
            <ComingSoon
                title="Portfolio Analytics"
                description="We're building comprehensive portfolio tracking, PnL analysis, and historical performance charts. Stay tuned!"
            />
        </div>
    );
}
