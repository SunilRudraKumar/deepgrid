// lib/grid-bot/grid-math.ts
// Grid calculation utilities (ported from legacy)

import type { GridConfig, GridLevel, GridOrder, GridCalculationResult, BookParams, Side } from './types';

const PRICE_SCALE = 1_000_000; // DeepBook price micro scale

// --- Price Conversion ---

export function priceToMicro(price: number): number {
    return Math.round(price * PRICE_SCALE);
}

export function microToPrice(micro: number): number {
    return micro / PRICE_SCALE;
}

// --- Rounding Utilities ---

export function roundToTickMicro(micro: number, tickMicro: number): number {
    return Math.round(micro / tickMicro) * tickMicro;
}

export function floorToTickMicro(micro: number, tickMicro: number): number {
    return Math.floor(micro / tickMicro) * tickMicro;
}

export function ceilToTickMicro(micro: number, tickMicro: number): number {
    return Math.ceil(micro / tickMicro) * tickMicro;
}

export function roundDownToLot(size: number, lot: number): number {
    return Math.floor(size / lot) * lot;
}

// --- Grid Calculation ---

/**
 * Calculate grid price levels from min/max/grids config
 */
export function calculateGridLevels(
    config: GridConfig,
    bookParams: BookParams
): { levels: GridLevel[]; tickMicro: number; stepMicro: number } {
    const { min, max, grids } = config;
    const { tickSize } = bookParams;

    const tickMicro = Math.max(1, Math.round(tickSize * PRICE_SCALE));
    const minMicro = floorToTickMicro(priceToMicro(min), tickMicro);
    const maxMicro = ceilToTickMicro(priceToMicro(max), tickMicro);

    if (maxMicro <= minMicro) {
        throw new Error('Max price must be greater than min price');
    }
    if (grids < 2) {
        throw new Error('Number of grids must be at least 2');
    }

    // Calculate step size (grids = number of intervals, so grids+1 = number of levels)
    const rawStep = (maxMicro - minMicro) / grids;
    const stepMicro = Math.max(tickMicro, floorToTickMicro(rawStep, tickMicro));

    if (stepMicro <= 0) {
        throw new Error('Grid step too small for tick size');
    }

    // Generate price levels
    const levels: GridLevel[] = [];
    for (let i = 0; i <= grids; i++) {
        const priceMicro = i === grids ? maxMicro : minMicro + i * stepMicro;
        levels.push({
            index: i,
            price: microToPrice(priceMicro),
            priceMicro,
            side: null, // Will be set after pivot calculation
        });
    }

    return { levels, tickMicro, stepMicro };
}

/**
 * Find pivot index based on current mid price
 * Pivot divides buy orders (below) from sell orders (above)
 */
export function calculatePivotIndex(levels: GridLevel[], midPrice: number): number {
    const midMicro = priceToMicro(midPrice);

    // Binary search for greatest i where levels[i].priceMicro <= midMicro
    let lo = 0;
    let hi = levels.length - 1;

    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (levels[mid].priceMicro <= midMicro) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }

    return lo;
}

/**
 * Generate initial orders based on pivot position
 * BUY orders at levels below/at pivot
 * SELL orders at levels above pivot
 */
export function calculateInitialOrders(
    levels: GridLevel[],
    pivotIndex: number,
    sizePerGrid: number
): GridOrder[] {
    const orders: GridOrder[] = [];

    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];

        if (i <= pivotIndex) {
            // BUY at this level
            level.side = 'BUY';
            orders.push({
                side: 'BUY',
                price: level.price,
                priceMicro: level.priceMicro,
                size: sizePerGrid,
                status: 'pending',
            });
        } else {
            // SELL at this level  
            level.side = 'SELL';
            orders.push({
                side: 'SELL',
                price: level.price,
                priceMicro: level.priceMicro,
                size: sizePerGrid,
                status: 'pending',
            });
        }
    }

    return orders;
}

/**
 * Main function to calculate complete grid setup
 */
export function calculateGrid(
    config: GridConfig,
    midPrice: number,
    bookParams: BookParams
): GridCalculationResult {
    // Calculate levels
    const { levels, tickMicro, stepMicro } = calculateGridLevels(config, bookParams);

    // Find pivot
    const pivotIndex = calculatePivotIndex(levels, midPrice);

    // Calculate size per grid if totalInvestment is provided
    let sizePerGrid = config.sizePerGrid;
    if (config.totalInvestment && config.grids > 0) {
        // Rough estimate: split investment across all buy orders
        sizePerGrid = config.totalInvestment / (pivotIndex + 1) / midPrice;
    }

    // Generate initial orders
    const initialOrders = calculateInitialOrders(levels, pivotIndex, sizePerGrid);

    return {
        levels,
        initialOrders,
        pivotIndex,
        stepSize: microToPrice(stepMicro),
        tickMicro,
    };
}

/**
 * Calculate replacement order when an order fills
 */
export function calculateReplacementOrder(
    filledOrder: GridOrder,
    levels: GridLevel[],
    sizePerGrid: number
): GridOrder | null {
    // Find level index for filled order
    const levelIndex = levels.findIndex(l => l.priceMicro === filledOrder.priceMicro);
    if (levelIndex === -1) return null;

    if (filledOrder.side === 'BUY') {
        // BUY filled → place SELL at next level up
        const sellIndex = levelIndex + 1;
        if (sellIndex < levels.length) {
            return {
                side: 'SELL',
                price: levels[sellIndex].price,
                priceMicro: levels[sellIndex].priceMicro,
                size: sizePerGrid,
                status: 'pending',
            };
        }
    } else {
        // SELL filled → place BUY at next level down
        const buyIndex = levelIndex - 1;
        if (buyIndex >= 0) {
            return {
                side: 'BUY',
                price: levels[buyIndex].price,
                priceMicro: levels[buyIndex].priceMicro,
                size: sizePerGrid,
                status: 'pending',
            };
        }
    }

    return null;
}

/**
 * Estimate profit per grid (spread between levels)
 */
export function estimateProfitPerGrid(stepPrice: number, sizePerGrid: number): number {
    return stepPrice * sizePerGrid;
}

/**
 * Calculate ROI per complete cycle
 */
export function estimateROI(
    config: GridConfig,
    stepPrice: number,
    cycles: number = 1
): number {
    const profitPerCycle = stepPrice * config.grids;
    const totalInvestment = config.totalInvestment || (config.sizePerGrid * config.grids * ((config.min + config.max) / 2));
    return (profitPerCycle * cycles) / totalInvestment * 100;
}
