'use client';
import ComingSoon from '@/components/ui/ComingSoon';
import TopNav from '@/components/terminal/TopNav';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14]">
            <TopNav />
            <ComingSoon
                title="Settings & Preferences"
                description="Advanced configuration options, API management, and notification settings will be available here soon."
            />
        </div>
    );
}
