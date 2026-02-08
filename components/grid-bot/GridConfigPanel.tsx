// components/grid-bot/GridConfigPanel.tsx
// Configuration form for grid bot parameters

'use client';

import { cn } from '@/lib/utils';
import type { UseGridConfigReturn } from '@/lib/hooks/useGridConfig';

interface GridConfigPanelProps {
    gridConfig: UseGridConfigReturn;
    isAccountReady: boolean;
    onCreateBot?: () => void;
    requiredFunds?: { base: number, quote: number };
    availableFunds?: { base: number, quote: number };
}

export default function GridConfigPanel({
    gridConfig,
    isAccountReady,
    onCreateBot,
    requiredFunds,
    availableFunds
}: GridConfigPanelProps) {
    const hasSufficientFunds = (() => {
        if (!requiredFunds || !availableFunds) return true; // Skip check if data missing
        // Use a small epsilon for float comparison, and handle the case where required is very close to available
        // We use 0.001 as epsilon to be safe with UI display rounding
        const epsilon = 0.001;

        const hasBase = availableFunds.base >= requiredFunds.base - epsilon;
        const hasQuote = availableFunds.quote >= requiredFunds.quote - epsilon;

        return hasBase && hasQuote;
    })();
    return (
        <div className="rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
                <span className="text-sm font-medium text-white">Grid Configuration</span>
            </div>

            <div className="p-4 space-y-4">
                {/* Price Range */}
                <PriceRangeInputs
                    min={gridConfig.config.min}
                    max={gridConfig.config.max}
                    onMinChange={gridConfig.setMin}
                    onMaxChange={gridConfig.setMax}
                />

                {/* Number of Grids */}
                <GridCountInput
                    value={gridConfig.config.grids}
                    onChange={gridConfig.setGrids}
                />

                {/* Investment Amount */}
                <InvestmentInput
                    value={gridConfig.config.totalInvestment || 0}
                    onChange={gridConfig.setInvestment}
                />

                {/* Error Display */}
                {gridConfig.error && (
                    <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                        {gridConfig.error}
                    </div>
                )}

                {/* Calculated Stats */}
                {gridConfig.isValid && (
                    <GridStats gridConfig={gridConfig} />
                )}

                {/* Funds Check */}
                {isAccountReady && requiredFunds && availableFunds && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Required</span>
                            <span className="text-white">
                                {requiredFunds.base.toFixed(2)} SUI + {requiredFunds.quote.toFixed(2)} USDC
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Available</span>
                            <span className={cn(
                                hasSufficientFunds ? "text-green-400" : "text-red-400"
                            )}>
                                {availableFunds.base.toFixed(2)} SUI + {availableFunds.quote.toFixed(2)} USDC
                            </span>
                        </div>
                        {!hasSufficientFunds && (
                            <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-400 leading-tight space-y-1">
                                <div>Insufficient funds for this strategy:</div>
                                {availableFunds.base < requiredFunds.base && (
                                    <div>• Missing {(requiredFunds.base - availableFunds.base).toFixed(4)} SUI</div>
                                )}
                                {availableFunds.quote < requiredFunds.quote && (
                                    <div>• Missing {(requiredFunds.quote - availableFunds.quote).toFixed(4)} USDC</div>
                                )}
                                <div className="text-white/40 pt-1">
                                    Tip: Use Quick Swap to rebalance your portfolio.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={onCreateBot}
                    disabled={!gridConfig.isValid || !isAccountReady || !hasSufficientFunds}
                    className={cn(
                        'w-full mt-4 py-3 rounded font-medium text-sm transition-colors',
                        gridConfig.isValid && isAccountReady && hasSufficientFunds
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                >
                    {!isAccountReady
                        ? 'Setup Account First'
                        : 'Start Bot'}
                </button>
            </div>
        </div>
    );
}

// --- Sub-components ---

function PriceRangeInputs({
    min,
    max,
    onMinChange,
    onMaxChange
}: {
    min: number;
    max: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
}) {
    return (
        <div>
            <label className="block text-xs text-white/40 mb-2">Price Range (USDC)</label>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <span className="text-[10px] text-white/30 uppercase">Lower</span>
                    <input
                        type="number"
                        step="0.01"
                        value={min || ''}
                        onChange={(e) => onMinChange(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full mt-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
                <div>
                    <span className="text-[10px] text-white/30 uppercase">Upper</span>
                    <input
                        type="number"
                        step="0.01"
                        value={max || ''}
                        onChange={(e) => onMaxChange(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full mt-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>
        </div>
    );
}

function GridCountInput({
    value,
    onChange
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    const presets = [5, 10, 15, 20];

    return (
        <div>
            <label className="block text-xs text-white/40 mb-2">Number of Grids</label>
            <div className="flex gap-2 mb-2">
                {presets.map((n) => (
                    <button
                        key={n}
                        onClick={() => onChange(n)}
                        className={cn(
                            'flex-1 py-1.5 rounded text-xs font-medium border transition-colors',
                            value === n
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        )}
                    >
                        {n}
                    </button>
                ))}
            </div>
            <input
                type="number"
                min="2"
                max="100"
                value={value || ''}
                onChange={(e) => onChange(Number(e.target.value))}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
        </div>
    );
}

function InvestmentInput({
    value,
    onChange
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div>
            <label className="block text-xs text-white/40 mb-2">Investment (USDC)</label>
            <input
                type="number"
                step="10"
                value={value || ''}
                onChange={(e) => onChange(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
        </div>
    );
}

function GridStats({ gridConfig }: { gridConfig: UseGridConfigReturn }) {
    return (
        <div className="space-y-2 pt-2 border-t border-white/5">
            <StatRow label="Grid Spacing" value={`$${gridConfig.stepPrice.toFixed(4)}`} />
            <StatRow label="Size per Grid" value={`${gridConfig.sizePerGrid.toFixed(4)} SUI`} />
            <StatRow label="Buy Orders" value={String(gridConfig.pivotIndex + 1)} valueClass="text-green-400" />
            <StatRow label="Sell Orders" value={String(gridConfig.config.grids - gridConfig.pivotIndex)} valueClass="text-red-400" />
            <div className="pt-2 border-t border-white/5">
                <StatRow label="Est. Profit/Cycle" value={`$${gridConfig.estimatedProfit.toFixed(2)}`} valueClass="text-emerald-400" />
            </div>
        </div>
    );
}

function StatRow({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex justify-between text-xs">
            <span className="text-white/40">{label}</span>
            <span className={cn('font-mono', valueClass)}>{value}</span>
        </div>
    );
}
