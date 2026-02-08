import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit-react";

function linkClass({ isActive }: { isActive: boolean }) {
    return [
        "text-sm px-3 py-2 rounded-md",
        isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
    ].join(" ");
}

export function AppHeader() {
    return (
        <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="font-semibold tracking-tight">deepgrid</div>

                    <nav className="flex items-center gap-1">
                        <NavLink to="/" className={linkClass} end>
                            Trade
                        </NavLink>
                        <NavLink to="/grid" className={linkClass}>
                            Grid Bot
                        </NavLink>
                        <NavLink to="/debug" className={linkClass}>
                            Debug
                        </NavLink>
                    </nav>
                </div>

                <ConnectButton />
            </div>
        </header>
    );
}
