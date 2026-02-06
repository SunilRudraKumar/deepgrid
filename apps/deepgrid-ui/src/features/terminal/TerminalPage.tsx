import { useState } from "react";
import { TerminalHeader } from "./components/TerminalHeader";
import { ChartPlaceholder } from "./components/ChartPlaceholder";
import { OrderBookPlaceholder } from "./components/OrderBookPlaceholder";

import { OpenOrdersCard } from "../deepbook/OpenOrdersCard";
import { TradingAccount } from "../deepbook/components/TradingAccount"
import { MarketOrderCard } from "../deepbook/MarketOrderCard";

export function TerminalPage() {
    const [activeTab, setActiveTab] = useState<"trade" | "grid">("trade");
    const [poolKey, setPoolKey] = useState<string>("SUI_DBUSDC");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <TerminalHeader
                activeTab={activeTab}
                onTabChange={setActiveTab}
                poolKey={poolKey}
                onPoolChange={setPoolKey}
            />

            <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
                {activeTab === "trade" ? (
                    <>
                        <div className="grid grid-cols-12 gap-4">
                            {/* LEFT: chart placeholder */}
                            <div className="col-span-12 lg:col-span-8">
                                <ChartPlaceholder />
                            </div>

                            {/* RIGHT: orderbook + trade */}
                            <div className="col-span-12 lg:col-span-4 space-y-4">
                                <OrderBookPlaceholder />
                                <MarketOrderCard poolKey={poolKey} />
                            </div>
                        </div>

                        {/* BOTTOM: open orders + trading account */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 lg:col-span-8">
                                <OpenOrdersCard poolKey={poolKey} />
                            </div>
                            <div className="col-span-12 lg:col-span-4">
                                <TradingAccount />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Grid Bot UI goes here (next).
                    </div>
                )}
            </div>
        </div>
    );
}
