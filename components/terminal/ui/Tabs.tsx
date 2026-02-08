'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function Tabs<T extends string>({
    value,
    onChange,
    items,
}: {
    value: T;
    onChange: (v: T) => void;
    items: { value: T; label: string }[];
}) {
    return (
        <div className="flex rounded-md bg-black/20 p-1">
            {items.map((t) => {
                const active = t.value === value;
                return (
                    <button
                        key={t.value}
                        onClick={() => onChange(t.value)}
                        className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition',
                            active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200',
                        )}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
