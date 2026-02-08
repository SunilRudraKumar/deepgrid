'use client';

export default function ConfirmCard() {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <div className="text-xs font-medium text-zinc-200">Confirm</div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                After deposit, show: Trading account address, available balances, and last refresh time.
                Add a “Refresh balances” button (UI only here).
            </p>

            <div className="mt-3 space-y-2 text-xs">
                <Row k="Trading account" v="0x…(mock)" />
                <Row k="Available USDC" v="—" />
                <Row k="Available SUI" v="—" />
                <Row k="Last updated" v="—" />
            </div>

            <button
                onClick={() => console.log('Button clicked: Refresh balances')}
                className="mt-3 w-full rounded-md bg-white/5 py-2 text-xs text-zinc-200 hover:bg-white/10 transition-colors"
            >
                Refresh (mock)
            </button>
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">{k}</span>
            <span className="text-zinc-200">{v}</span>
        </div>
    );
}
