// 집합 도구 — 정식 js/engine/setgen.js 의 표시 · 부분집합 부분
export const MINUS = '−';
export const num = (v: number | string): string => (typeof v === 'number' && v < 0 ? MINUS + Math.abs(v) : String(v));
export const setStr = (arr: readonly (number | string)[]): string => (arr.length ? `{${arr.map(num).join(', ')}}` : '∅');
// 정식과 같게 글자 정렬 (부분집합 같은지 비교용 이름표)
export const key = (arr: readonly (number | string)[]): string => arr.map(String).sort().join(',');

export function allSubsets(base: readonly number[]): number[][] {
  const out: number[][] = [];
  for (let m = 0; m < 1 << base.length; m++) out.push(base.filter((_, i) => m & (1 << i)));
  return out;
}

export const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const sorted = (a: readonly number[]): number[] => a.slice().sort((x, y) => x - y);
export const inter = (A: readonly number[], B: readonly number[]): number[] => sorted(A.filter((x) => B.includes(x)));
export const union = (A: readonly number[], B: readonly number[]): number[] => sorted([...new Set([...A, ...B])]);
export const comp = (U: readonly number[], A: readonly number[]): number[] => sorted(U.filter((x) => !A.includes(x)));
