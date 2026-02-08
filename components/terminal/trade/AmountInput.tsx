// components/terminal/trade/AmountInput.tsx
// Amount input with SUI/USD toggle

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type AmountUnit = 'base' | 'quote';

interface AmountInputProps {
    /** Current value in the selected unit */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Current unit mode */
    unit: AmountUnit;
    /** Callback when unit changes */
    onUnitChange: (unit: AmountUnit) => void;
    /** Base token symbol (e.g., "SUI") */
    baseToken: string;
    /** Quote token symbol (e.g., "USDC") */
    quoteToken: string;
    /** Current price for conversion display */
    currentPrice?: number;
    /** Max available balance (for percentage buttons) */
    maxBalance?: number;
    /** Placeholder */
    placeholder?: string;
    /** Label */
    label?: string;
}

export function AmountInput({
    value,
    onChange,
    unit,
    onUnitChange,
    baseToken,
    quoteToken,
    currentPrice,
    maxBalance = 0,
    placeholder = '0.0',
    label = 'Amount',
}: AmountInputProps) {
    // Calculate equivalent in the other unit
    const getEquivalent = (): string => {
        const numValue = parseFloat(value) || 0;
        if (!currentPrice || !numValue) return '≈ 0.00';

        if (unit === 'base') {
            // Convert base to quote
            return `≈ ${(numValue * currentPrice).toFixed(2)} ${quoteToken}`;
        } else {
            // Convert quote to base
            return `≈ ${(numValue / currentPrice).toFixed(4)} ${baseToken}`;
        }
    };

    // Handle percentage buttons
    const handlePercentage = (percent: number) => {
        const amount = maxBalance * percent;
        onChange(amount.toString());
    };

    const activeToken = unit === 'base' ? baseToken : quoteToken;

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <span className="text-zinc-500">{getEquivalent()}</span>
            </div>

            <div className="relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2.5 pr-24 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-white/20 focus:bg-black/30 transition-all font-mono"
                />

                {/* Unit Toggle */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        onClick={() => onUnitChange('base')}
                        className={cn(
                            'px-2 py-1 text-xs rounded transition-colors',
                            unit === 'base'
                                ? 'bg-white/10 text-zinc-100 font-medium'
                                : 'text-zinc-500 hover:text-zinc-300'
                        )}
                    >
                        {baseToken}
                    </button>
                    <button
                        onClick={() => onUnitChange('quote')}
                        className={cn(
                            'px-2 py-1 text-xs rounded transition-colors',
                            unit === 'quote'
                                ? 'bg-white/10 text-zinc-100 font-medium'
                                : 'text-zinc-500 hover:text-zinc-300'
                        )}
                    >
                        {quoteToken}
                    </button>
                </div>
            </div>

            {/* Percentage Buttons */}
            <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-zinc-400">
                {[0.25, 0.5, 0.75, 1].map((p) => (
                    <button
                        key={p}
                        onClick={() => handlePercentage(p)}
                        className="rounded-md bg-white/5 py-1.5 hover:bg-white/10 hover:text-zinc-200 transition"
                    >
                        {p * 100}%
                    </button>
                ))}
            </div>
        </div>
    );
}
