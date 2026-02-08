import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { PoolPicker } from "../../features/pools/PoolPicker";

import { TradingAccount } from "../../features/deepbook/components/TradingAccount";
import { OpenOrdersCard } from "../../features/deepbook/components/OpenOrdersCard";
import { MarketOrderCard } from "../../features/deepbook/MarketOrderCard";
import { ManagerBalancesCard } from "../../features/deepbook/components/ManagerBalancesCard";

export function TradePage() {
    const [poolKey, setPoolKey] = useState("SUI_DBUSDC");

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PoolPicker value={poolKey} onChange={setPoolKey} />
            </div>

            {/* Top row: chart (placeholder) + right panel */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                <Card>
                    <CardHeader>
                        <CardTitle>Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-[420px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                            Chart coming next
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <TradingAccount />
                    <MarketOrderCard poolKey={poolKey} />
                    <ManagerBalancesCard poolKey={poolKey} />
                </div>
            </div>

            {/* Bottom row: orderbook (placeholder) + open orders */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Book</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-[360px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                            Order book coming next
                        </div>
                    </CardContent>
                </Card>

                <OpenOrdersCard poolKey={poolKey} />
            </div>
        </div>
    );
}
