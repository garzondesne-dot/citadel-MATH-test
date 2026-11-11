// 시드 난수 — 정식 js/engine/ui.js DS.Rng 그대로 (LCG + FNV-1a 해시)
// 같은 시드 → 같은 문제. 학생 폰과 종합실이 같은 문제를 각자 만든다
export interface Rng {
  (): number;
  int(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
}

export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seed: string | number): Rng {
  let n = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  const next = (() => {
    n = (Math.imul(1664525, n) + 1013904223) >>> 0;
    return n / 4294967296;
  }) as Rng;
  next.int = (a, b) => a + Math.floor(next() * (b - a + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)] as (typeof arr)[number];
  next.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j] as (typeof a)[number], a[i] as (typeof a)[number]];
    }
    return a;
  };
  return next;
}
