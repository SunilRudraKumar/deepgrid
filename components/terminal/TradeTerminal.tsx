// components/terminal/TradeTerminal.tsx
// Main trading terminal layout with live data

'use client';

import TopNav from './TopNav';
import ChartPanel from './panels/ChartPanel';
import OrderBookPanel from './panels/OrderBookPanel';
import OrdersPanel from './panels/OrdersPanel';
import WalletSidebar from './panels/WalletSidebar';
import { useManagerId } from '@/lib/hooks/useManagerId';

export default function TradeTerminal() {
    // Get the user's Balance Manager ID for order execution
    const { managerId, hasAccount } = useManagerId();

    return (
        <div className="h-screen flex flex-col bg-[#0b0f14] text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-100">
            <TopNav />

            {/* Terminal area - ensure it takes remaining space */}
            <main className="flex-1 min-h-0 p-3 overflow-hidden">
                <div
                    className="grid h-full w-full gap-3"
                    style={{
                        gridTemplateColumns: '1fr 320px 320px',
                        gridTemplateRows: '1fr 200px',
                    }}
                >
                    {/* Left: chart */}
                    <div className="min-h-0 overflow-hidden relative">
                        <ChartPanel />
                    </div>

                    {/* Middle: order book */}
                    <div className="min-h-0 overflow-hidden relative">
                        <OrderBookPanel />
                    </div>

                    {/* Right: wallet + trade form (spans both rows) */}
                    <div className="row-span-2 min-h-0 overflow-hidden relative">
                        <WalletSidebar managerId={managerId} />
                    </div>

                    {/* Bottom: orders table (spans left + middle columns) */}
                    <div className="col-span-2 min-h-0 overflow-hidden relative bg-[#0f141b] rounded-lg border border-white/5">
                        <OrdersPanel managerId={managerId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
