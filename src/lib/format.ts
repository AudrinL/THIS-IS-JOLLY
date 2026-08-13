/** 338.54 -> "5:38" */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 33 -> "33", 7 -> "07" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
