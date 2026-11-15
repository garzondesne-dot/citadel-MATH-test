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

// 🔓 교사 수동 해금 (DECISIONS 2026-11-15)
import { castleState, type CastlePack } from '../src/school/castle';
const room = (id: string, no: number, boss = false) => ({ id, no, title: id, sprite: '', ...(boss ? { boss: true } : {}), vers: [] }) as unknown as CastlePack['rooms'][number];
const PK = { kind: 'castle', id: 'eval-9', floor: 9, title: 't', unit: 'u', bossPct: 60, rooms: [room('q1', 2), room('q2', 4), room('q3', 8), room('q4', 9), room('qb', 9, true)], raw: {} } as unknown as CastlePack;
const ids = (s: ReturnType<typeof castleState>) => s.open.map((r) => r.id);
describe('🔓 교사 수동 해금', () => {
  it('자동만 = 진도까지 · 보스는 60% 뒤', () => { expect(ids(castleState(PK, 4, {}))).toEqual(['q1', 'q2']); });
  it('교사가 연 방 = 진도 밖이어도 열림 (자동에 더해짐)', () => { expect(ids(castleState(PK, 4, {}, false, { open: { q4: true }, auto: true }))).toEqual(['q1', 'q2', 'q4']); });
  it('교사가 연 👑 보스 = 60% 없이', () => { const s = castleState(PK, 4, {}, false, { open: { qb: true }, auto: true }); expect(s.bossOpen).toBe(true); });
  it('자동 끔 = 교사가 연 방만', () => { expect(ids(castleState(PK, 9, {}, false, { open: { q3: true }, auto: false }))).toEqual(['q3']); expect(castleState(PK, 9, { q3: { clear: true } as never }, false, { open: { q3: true }, auto: false }).bossOpen).toBe(false); });
  it('보스 60% = 교사가 연 방도 셈에 들어감', () => { const s = castleState(PK, 4, { q1: { clear: true } as never, q2: { clear: true } as never }, false, { open: { q3: true, q4: true }, auto: true }); expect([s.need, s.cleared]).toEqual([3, 2]); });
});
