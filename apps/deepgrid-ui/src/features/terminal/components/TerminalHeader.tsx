import { ConnectButton } from "@mysten/dapp-kit-react";

type Tab = "trade" | "grid";

export function TerminalHeader({
    activeTab,
    onTabChange,
    poolKey,
    onPoolChange,
}: {
    activeTab: Tab;
    onTabChange: (t: Tab) => void;
    poolKey: string;
    onPoolChange: (k: string) => void;
}) {
    return (
        <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
                <div className="font-semibold tracking-tight">deepgrid</div>

                <div className="ml-2 flex items-center gap-2">
                    <button
                        className={`px-3 py-1.5 rounded-md border text-sm ${activeTab === "trade" ? "bg-muted" : ""
                            }`}
                        onClick={() => onTabChange("trade")}
                    >
                        Trade
                    </button>
                    <button
                        className={`px-3 py-1.5 rounded-md border text-sm ${activeTab === "grid" ? "bg-muted" : ""
                            }`}
                        onClick={() => onTabChange("grid")}
                    >
                        Grid Bot
                    </button>
                </div>

                <div className="ml-4 flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Pool</label>
                    <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={poolKey}
                        onChange={(e) => onPoolChange(e.target.value)}
                    >
                        <option value="SUI_DBUSDC">SUI / DBUSDC</option>
                        {/* add more pool keys later */}
                    </select>
                </div>

                <div className="ml-auto">
                    <ConnectButton />
                </div>
            </div>
        </div>
    );
}
