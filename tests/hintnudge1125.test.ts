// 💡 실마리 말풍선 (📜 11/25 · DECISIONS a9ef715): 같은 소문제 2번 틀림 → 말풍선 · 💡 를 써 본 기기 = 다시 안 뜸
import { beforeEach, describe, expect, it } from 'vitest';
import { NUDGE_AT, hintUsed, markHintUsed, nudgeOn, wrongTimes } from '../src/raid/hintNudge';

const mem: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
});

describe('💡 실마리 말풍선', () => {
  it('소문제마다 틀린 횟수 = 낸 차례 중 그 칸이 ✘', () => {
    const tries = [{ marks: [true, false, false] }, { marks: [true, false, true] }, { marks: [true, true, true] }];
    expect([0, 1, 2].map((i) => wrongTimes(tries, i))).toEqual([0, 2, 1]);
    expect(wrongTimes([{}, { marks: undefined }] as never, 0)).toBe(0);
  });
  it('2번째 틀림부터 뜸 · 1번은 안 뜸', () => {
    expect(NUDGE_AT).toBe(2);
    expect([nudgeOn(0, false), nudgeOn(1, false), nudgeOn(2, false), nudgeOn(5, false)]).toEqual([false, false, true, true]);
  });
  it('💡 를 한 번 쓰면 이 기기에서는 다시 안 뜸', () => {
    expect(hintUsed()).toBe(false);
    markHintUsed();
    expect(hintUsed()).toBe(true);
    expect(nudgeOn(3, hintUsed())).toBe(false);
  });
  it('저장 공간이 막혀도 화면은 그대로(안 씀 = 뜸)', () => {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(hintUsed()).toBe(false);
    expect(() => markHintUsed()).not.toThrow();
  });
});
