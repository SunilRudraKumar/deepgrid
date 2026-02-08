// lib/hooks/useGridConfig.ts
// Hook for managing grid bot configuration and calculations

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    type GridConfig,
    type GridLevel,
    type GridOrder,
    type BookParams,
    calculateGridLevels,
    calculatePivotIndex,
    calculateInitialOrders,
    microToPrice
} from '@/lib/grid-bot';

interface UseGridConfigOptions {
    defaultMin?: number;
    defaultMax?: number;
    defaultGrids?: number;
    defaultInvestment?: number;
}

export interface UseGridConfigReturn {
    // Config state
    config: GridConfig;
    setMin: (val: number) => void;
    setMax: (val: number) => void;
    setGrids: (val: number) => void;
    setInvestment: (val: number) => void;

    // Calculated values
    levels: GridLevel[];
    orders: GridOrder[];
    pivotIndex: number;
    stepPrice: number;
    sizePerGrid: number;
    estimatedProfit: number;

    // Status
    isValid: boolean;
    error: string | null;

    // Actions
    reset: () => void;
    updateMidPrice: (price: number) => void;
}

// Default book params (will be fetched from DeepBook in real usage)
const DEFAULT_BOOK_PARAMS: BookParams = {
    tickSize: 0.0001,
    lotSize: 0.01,
    minSize: 0.1,
};

export function useGridConfig(options: UseGridConfigOptions = {}): UseGridConfigReturn {
    const {
        defaultMin = 3.50,
        defaultMax = 4.50,
        defaultGrids = 10,
        defaultInvestment = 100,
    } = options;

    // Config state
    const [min, setMin] = useState(defaultMin);
    const [max, setMax] = useState(defaultMax);
    const [grids, setGrids] = useState(defaultGrids);
    const [investment, setInvestment] = useState(defaultInvestment);
    const [midPrice, setMidPrice] = useState((defaultMin + defaultMax) / 2);

    const config: GridConfig = useMemo(() => ({
        min,
        max,
        grids,
        sizePerGrid: 0, // Will be calculated
        totalInvestment: investment,
    }), [min, max, grids, investment]);

    // Calculate grid levels and orders
    const calculation = useMemo(() => {
        try {
            if (min >= max) {
                return { error: 'Min price must be less than max price' };
            }
            if (grids < 2 || grids > 100) {
                return { error: 'Grids must be between 2 and 100' };
            }
            if (investment <= 0) {
                return { error: 'Investment must be greater than 0' };
            }

            const { levels, stepMicro } = calculateGridLevels(config, DEFAULT_BOOK_PARAMS);
            const pivotIndex = calculatePivotIndex(levels, midPrice);

            // Calculate size per grid based on TOTAL investment value (USDC + SUI value)
            const numBuyOrders = pivotIndex + 1;
            const numSellOrders = levels.length - 1 - pivotIndex;

            // Value of Buy Side (USDC needed) = Size * Sum(Buy Prices)
            const sumBuyPrices = levels.slice(0, numBuyOrders).reduce((sum, l) => sum + l.price, 0);

            // Value of Sell Side (SUI needed) = Size * Num Sells * Current Price
            // We use midPrice as the valuation for SUI
            const valueFactorSells = numSellOrders * midPrice;

            // Total Investment = Size * (SumBuyPrices + ValueFactorSells)
            // Size = Total Investment / (SumBuyPrices + ValueFactorSells)
            // Prevent division by zero
            const denominator = sumBuyPrices + valueFactorSells;
            const sizePerGrid = denominator > 0 ? investment / denominator : 0;

            // Ensure connection with lot size (from params)
            if (sizePerGrid < DEFAULT_BOOK_PARAMS.minSize) {
                // If investment is too small, we might get size < minSize. 
                // We could clamp it, but then investment usage exceeds input.
                // For now, let it be exact, but the UI might skip orders.
                // Ideally we should warn.
            }

            const orders = calculateInitialOrders(levels, pivotIndex, sizePerGrid);
            const stepPrice = microToPrice(stepMicro);
            const estimatedProfit = stepPrice * sizePerGrid * grids;

            return {
                levels,
                orders,
                pivotIndex,
                stepPrice,
                sizePerGrid,
                estimatedProfit,
                error: null,
            };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Calculation error' };
        }
    }, [config, midPrice, min, max, grids, investment]);

    const reset = useCallback(() => {
        setMin(defaultMin);
        setMax(defaultMax);
        setGrids(defaultGrids);
        setInvestment(defaultInvestment);
        setMidPrice((defaultMin + defaultMax) / 2);
    }, [defaultMin, defaultMax, defaultGrids, defaultInvestment]);

    return {
        config,
        setMin,
        setMax,
        setGrids,
        setInvestment,
        levels: calculation.levels || [],
        orders: calculation.orders || [],
        pivotIndex: calculation.pivotIndex || 0,
        stepPrice: calculation.stepPrice || 0,
        sizePerGrid: calculation.sizePerGrid || 0,
        estimatedProfit: calculation.estimatedProfit || 0,
        isValid: !calculation.error,
        error: calculation.error || null,
        reset,
        updateMidPrice: setMidPrice,
    };
}
