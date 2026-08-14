/*
 * There is deliberately no clock formatter here. The walk is never quoted back
 * to the visitor as a running time — position is carried by the chapter rail
 * and the progress line instead.
 */

/** 33 -> "33", 7 -> "07" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
