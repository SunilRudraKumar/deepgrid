import React from 'react';

export function Panel({
    title,
    right,
    children,
}: {
    title?: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="h-full flex flex-col rounded-lg border border-white/5 bg-[#0f141b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">
            {(title || right) && (
                <header className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 shrink-0">
                    <div className="text-sm font-medium text-zinc-200">{title}</div>
                    <div className="flex items-center gap-2">{right}</div>
                </header>
            )}
            <div className="flex-1 min-h-0 relative">{children}</div>
        </section>
    );
}
