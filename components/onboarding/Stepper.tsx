'use client';

import { cn } from '@/lib/utils';

export default function Stepper({ stepIndex }: { stepIndex: number }) {
    const steps = [
        { title: 'Connect', desc: 'Wallet connection' },
        { title: 'Create', desc: 'Trading account' },
        { title: 'Fund', desc: 'Deposit assets' },
        { title: 'Confirm', desc: 'Balances ready' },
    ];

    return (
        <div className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex - 1;
                return (
                    <div key={s.title} className="rounded-lg border border-white/5 bg-black/20 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-100">{s.title}</div>
                            <div
                                className={cn(
                                    'rounded-md px-2 py-1 text-[11px] border',
                                    done
                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                                        : active
                                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                                            : 'border-white/10 bg-white/5 text-zinc-500',
                                )}
                            >
                                {done ? 'Done' : active ? 'Active' : 'Pending'}
                            </div>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">{s.desc}</div>
                    </div>
                );
            })}
        </div>
    );
}
