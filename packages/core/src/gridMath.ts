export function roundDownToTick(price: number, tick: number): number {
  return Math.floor(price / tick) * tick;
}
export function roundUpToTick(price: number, tick: number): number {
  return Math.ceil(price / tick) * tick;
}
export function roundDownToLot(size: number, lot: number): number {
  return Math.floor(size / lot) * lot;
}
