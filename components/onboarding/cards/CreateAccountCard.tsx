'use client';

export default function CreateAccountCard({
    mode,
    onPrimary,
}: {
    mode: 'disconnected' | 'create';
    onPrimary: () => void;
}) {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-4">
            <div className="text-sm font-semibold text-zinc-100">
                {mode === 'disconnected' ? 'Connect to continue' : 'Create Trading Account'}
            </div>

            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {mode === 'disconnected'
                    ? 'Connect a wallet to create and manage your trading account.'
                    : 'This creates a dedicated trading account used for deposits, balances, and order placement.'}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoBox label="Network" value="Testnet" />
                <InfoBox label="Account type" value="Balance Manager" />
                <InfoBox label="Permissions" value="Trade + withdraw" />
                <InfoBox label="Fee estimate" value="~ small gas" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <button
                    onClick={() => console.log('Button clicked: View details')}
                    className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                >
                    View details
                </button>

                <button
                    onClick={() => {
                        console.log(`Button clicked: ${mode === 'disconnected' ? 'Connect Wallet' : 'Create Trading Account'}`);
                        onPrimary();
                    }}
                    className="rounded-md bg-[#2b6ff7] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all"
                >
                    {mode === 'disconnected' ? 'Connect Wallet' : 'Create Trading Account'}
                </button>
            </div>
        </div>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/5 bg-white/5 p-3">
            <div className="text-[11px] text-zinc-500">{label}</div>
            <div className="mt-1 text-xs text-zinc-200">{value}</div>
        </div>
    );
}
