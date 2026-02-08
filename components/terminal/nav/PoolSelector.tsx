'use client';

import React from 'react';
import { POOLS } from '@/lib/config/pools';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { cn } from '@/lib/utils';

export function PoolSelector() {
    const { selectedPoolId, setSelectedPoolId } = usePoolSelector();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const selectedPool = POOLS.find(p => p.id === selectedPoolId);

    // Close dropdown on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
                    "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
                    "text-sm font-medium text-zinc-200"
                )}
            >
                <span className="text-zinc-400">Pool:</span>
                <span className="text-white">{selectedPool?.name || 'Select'}</span>
                <ChevronDownIcon className={cn("w-4 h-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-[#0d1117] border border-white/10 rounded-md shadow-xl overflow-hidden z-50">
                    {POOLS.map((pool) => (
                        <button
                            key={pool.id}
                            onClick={() => {
                                setSelectedPoolId(pool.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm transition-colors",
                                pool.id === selectedPoolId
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "text-zinc-300 hover:bg-white/5"
                            )}
                        >
                            {pool.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
