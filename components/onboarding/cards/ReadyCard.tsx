'use client';

export default function ReadyCard({
    onReset,
    balances,
    onRefresh,
    onDeposit
}: {
    onReset: () => void;
    balances?: { coinKey: string; balance: number }[];
    onRefresh?: () => void;
    onDeposit?: () => void;
}) {
    // Show all balances if available, otherwise show a loading/empty state
    const displayBalances = balances || [];
    const hasBalances = displayBalances.length > 0;

    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-zinc-100">You’re ready to trade</div>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                        Trading account active.
                    </p>
                </div>
                <div className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200 border border-emerald-500/20">
                    Ready
                </div>
            </div>

            <div className="mt-6 mb-2">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                    Balances
                </div>
                <div className="space-y-1">
                    {hasBalances ? (
                        displayBalances.map((b) => (
                            <BalanceRow key={b.coinKey} label={b.coinKey} value={b.balance} />
                        ))
                    ) : (
                        <div className="px-3 py-4 text-center text-xs text-zinc-500 italic rounded-md border border-white/5 bg-white/5">
                            Fetching balances...
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                <button
                    onClick={() => {
                        console.log('Button clicked: Reset');
                        onReset();
                    }}
                    className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                >
                    Reset
                </button>
                <div className="flex gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                        >
                            Refresh
                        </button>
                    )}
                    {onDeposit && (
                        <button
                            onClick={onDeposit}
                            className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                        >
                            Deposit
                        </button>
                    )}
                    <button
                        onClick={() => console.log('Button clicked: Open Trading Terminal')}
                        className="rounded-md bg-[#2b6ff7] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all"
                    >
                        Trade
                    </button>
                </div>
            </div>
        </div>
    );
}

function BalanceRow({ label, value }: { label: string; value: number }) {
    const isZero = value === 0;
    return (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
            <div className="flex items-center gap-3">
                {/* Fallback icon / placeholder */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isZero ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600/20 text-blue-400'}`}>
                    {label[0]}
                </div>
                <div className={`text-sm font-medium ${isZero ? 'text-zinc-500' : 'text-zinc-200'}`}>
                    {label}
                </div>
            </div>
            <div className={`text-sm font-mono ${isZero ? 'text-zinc-600' : 'text-zinc-100'}`}>
                {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
        </div>
    );
}
