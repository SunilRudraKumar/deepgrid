import { expect, test } from 'vitest';
import { roundDownToTick, roundUpToTick, roundDownToLot } from '../src/gridMath';

test('tick rounding', () => {
  expect(roundDownToTick(1.23456, 0.00001)).toBeCloseTo(1.23456, 10);
  expect(roundDownToTick(1.234567, 0.00001)).toBeCloseTo(1.23456, 10);
  expect(roundUpToTick(1.234567, 0.00001)).toBeCloseTo(1.23457, 10);
});

test('lot rounding', () => {
  expect(roundDownToLot(1.04, 0.1)).toBeCloseTo(1.0, 10);
  expect(roundDownToLot(0.99, 0.1)).toBeCloseTo(0.9, 10);
});
