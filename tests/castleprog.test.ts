// 🏰 성채 진도 = 정식 unlock/{반} 과 같은 값 (베타 = held/{반} 의 가장 큰 차시 · 출시 뒤 「진도 0차시 · 모든 방 잠김」 고침)
import { describe, expect, it } from 'vitest';
import { progressOf } from '../src/school/castle';
import type { Store } from '../src/model/types';
const mem = (d: Record<string, unknown>): Store => ({ kind: 'memory', get: <T>(p: string) => (d[p] ?? null) as T | null, set: () => {}, watch: () => () => {}, now: () => 0 });
// 정식 07:31 백업의 held · unlock (반 6개 · 그대로)
const HELD: Record<string, string[]> = { '1-1': ['set-03', 'set-04', 'set-05', 'set-06', 'set-08'], '1-2': ['set-04', 'set-05', 'set-06', 'set-08'], '1-3': ['set-03', 'set-04', 'set-05', 'set-06', 'set-08'], '1-4': ['set-02', 'set-03', 'set-04', 'set-05', 'set-06'], '1-5': ['set-04', 'set-05', 'set-06', 'set-08', 'set-09'], '1-6': ['set-02', 'set-04', 'set-05', 'set-06', 'set-08'] };
const UNLOCK: Record<string, number> = { '1-1': 8, '1-2': 8, '1-3': 8, '1-4': 6, '1-5': 9, '1-6': 8 };
const S = mem(Object.fromEntries(Object.entries(HELD).map(([c, ids]) => [`held/${c}`, Object.fromEntries(ids.map((i) => [i, true]))])));
describe('🏰 성채 진도', () => {
  it('반마다 = 정식 unlock 과 같음', () => { for (const c of Object.keys(UNLOCK)) expect([c, progressOf(S, c)]).toEqual([c, UNLOCK[c]]); });
  it('반 없음 = 모든 반 중 큰 것 · 교사 캠프 = 모두 열림(99)', () => { expect(progressOf(S, '')).toBe(9); expect(progressOf(S, '', {}, true)).toBe(99); });
  it('held 가 없어도 내 수업 기록 차시로', () => { expect(progressOf(mem({}), '1-3', { 'set-05': {} })).toBe(5); expect(progressOf(mem({}), '1-3')).toBe(0); });
});
