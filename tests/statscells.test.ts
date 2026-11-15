// 📊 반 통계 = 수업에서 연 칸만 (📜 2026-11-15 DECISIONS 04ec16d) + 🔁 같은 차시 다시 열기 = 칸마다 합침
import { describe, expect, it } from 'vitest';
import { mergeRow, type RecRow } from '../src/school/records';
import { autoCells, includedCells, playedCells, setPick } from '../src/school/statsCells';
import { realClass } from '../src/school/dash';
import type { Store } from '../src/model/types';

function mem(init: Record<string, unknown> = {}): Store {
  const d: Record<string, unknown> = { ...init };
  const get = <T>(p: string): T | null => {
    if (p in d) return d[p] as T;
    const kids = Object.entries(d).filter(([k]) => k.startsWith(p + '/'));
    if (!kids.length) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of kids) { const parts = k.slice(p.length + 1).split('/'); let cur = out; parts.slice(0, -1).forEach((x) => (cur = (cur[x] ||= {}) as Record<string, unknown>)); cur[parts[parts.length - 1]!] = v; }
    return out as T;
  };
  return { kind: 'server', get, set: (p, v) => { if (v == null) delete d[p]; else d[p] = v; }, watch: () => () => {}, now: () => 0 };
}
const row = (mons: Record<string, string>, extra: Partial<RecRow> = {}): RecRow => ({ at: 1, code: 'a', no: 6, mons: mons as RecRow['mons'], miss: [], perfects: 0, right: 0, total: 0, ...extra });

describe('🔁 같은 차시 다시 열기 = 칸마다 합침', () => {
  it('앞 수업 o · f · x 칸은 새 수업의 - · n 로 안 덮임 · 새로 낸 칸만 바뀜', () => {
    const prev = row({ m1: 'o', m2: 'x', m3: 'f', u4: 'n' }, { conc: { c1: [1, 1] } } as never);
    const cur = row({ m1: '-', m2: 'o', m3: 'n', u4: 'o' }, { code: 'b' });
    const m = mergeRow(prev as never, cur);
    expect(m.mons).toEqual({ m1: 'o', m2: 'o', m3: 'f', u4: 'o' });
    expect(m.code).toBe('b'); expect((m as never as { conc: unknown }).conc).toEqual({ c1: [1, 1] }); // 정식 칸 그대로
    expect(m.miss).toEqual([]); expect(m.perfects).toBe(3);
  });
  it('이번 수업에서 형성평가 안 함 = 앞 형성평가 그대로 · 둘 다 하면 문항마다', () => {
    expect(mergeRow(row({}, { bossM: 'oox', boss: 2, bossN: 3 }) as never, row({}, { bossM: 'nnn', boss: 0, bossN: 3 })).boss).toBe(2);
    const m = mergeRow(row({}, { bossM: 'o-x', boss: 1, bossN: 3 }) as never, row({}, { bossM: '-o-', boss: 1, bossN: 3 }));
    expect([m.bossM, m.boss]).toEqual(['oox', 2]);
  });
});

describe('📊 통계에 넣는 칸', () => {
  it('자동 = 수업 기록에 낸 칸(o · f · x · -) + 연 칸', () => {
    expect([...playedCells([{ mons: { m1: 'o', m2: 'n', u4: '-' }, bossM: 'nnn' }])].sort()).toEqual(['m1', 'u4']);
    const S = mem({ 'school/opened/1-9/set-06/m3': true });
    expect([...autoCells(S, '1-9', 'set-06', [{ mons: { m1: 'o' } }])].sort()).toEqual(['m1', 'm3']);
  });
  it('지난 수업 = 정식 보관 rooms 에서 뽑은 연 칸 (6차시 형성평가 = 1-5 만)', () => {
    const S = mem();
    expect(autoCells(S, '1-5', 'set-06', []).has('boss')).toBe(true);
    for (const c of ['1-1', '1-2', '1-3', '1-4']) expect([c, autoCells(S, c, 'set-06', []).has('boss')]).toEqual([c, false]);
    expect(['u4', 'u5', 'u6', 'u7'].every((k) => autoCells(S, '1-4', 'set-06', []).has(k))).toBe(true);
  });
  it('교사 스위치가 자동보다 우선 · 자동으로 되돌리기', () => {
    const S = mem(), all = ['m1', 'm2', 'boss'];
    expect([...includedCells(S, '1-9', 'x', [{ mons: { m1: 'o' } }], all)]).toEqual(['m1']);
    setPick(S, '1-9', 'x', 'boss', true); setPick(S, '1-9', 'x', 'm1', false);
    expect([...includedCells(S, '1-9', 'x', [{ mons: { m1: 'o' } }], all)]).toEqual(['boss']);
    setPick(S, '1-9', 'x', 'm1', null); expect([...includedCells(S, '1-9', 'x', [{ mons: { m1: 'o' } }], all)].sort()).toEqual(['boss', 'm1']);
  });
});

describe('📊 대시보드 = 안 연 칸은 「— 수업 안 함」', () => {
  const base = { 'roster/1-2': { 1: '가', 2: '나' } };
  const rec = (bossM: string, boss: number) => ({ at: Date.UTC(2026, 10, 12), code: 'a', no: 6, mons: { m1: 'o', m2: 'o', m3: 'x', u4: 'o', u5: 'n', u6: 'n', u7: 'n' }, bossM, boss, bossN: 6, conc: { c1: [1, 1], c2: [1, 1], c3: [0, 1], c4: [3, 4] } });
  it('1-2 6차시: 형성평가 안 엶 = 점수 0 이 아니라 빠짐 · 문제 7(u7) 안 엶 · 개념 칸은 남은 문제가 있으면 그대로', () => {
    const S = mem({ ...base, 'records/1-2/1/set-06': rec('nnnnnn', 0), 'records/1-2/2/set-06': rec('nnnnnn', 0) });
    const { studs } = realClass(S, '1-2');
    const r = studs[0]!.rec['set-06']!;
    expect(r.noBoss).toBe(true); expect([r.boss, r.bossN]).toEqual([0, 0]);
    expect(Object.keys(r.conc).sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
  });
  it('교사가 「통계에 넣기」로 형성평가를 넣으면 점수로 보임', () => {
    const S = mem({ ...base, 'records/1-2/1/set-06': rec('oooxx-', 3), 'school/statsPick/1-2/set-06/boss': true });
    const r = realClass(S, '1-2').studs[0]!.rec['set-06']!;
    expect(r.noBoss).toBeFalsy(); expect([r.boss, r.bossN]).toEqual([3, 6]);
  });
  it('개념의 문제를 하나도 안 열었으면 그 개념 칸 빠짐', () => {
    const S = mem({ ...base, 'records/1-2/1/set-06': { ...rec('nnnnnn', 0), mons: { m1: 'o', m2: 'n', m3: 'n', u4: 'n', u5: 'n', u6: 'n', u7: 'n' } }, 'school/statsPick/1-2/set-06/m2': false, 'school/statsPick/1-2/set-06/m3': false, 'school/statsPick/1-2/set-06/u4': false, 'school/statsPick/1-2/set-06/u5': false, 'school/statsPick/1-2/set-06/u6': false });
    expect(Object.keys(realClass(S, '1-2').studs[0]!.rec['set-06']!.conc)).toEqual(['c1']);
  });
  it('🎯 허수아비 기록 = 학생 시트 표시만 (오개념에 안 합침)', () => {
    const S = mem({ ...base, 'records/1-2/1/set-06': rec('nnnnnn', 0), 'bonus/1-2/1/set-06/boss': { tries: 1, mis: { M1: [2, 0] } } });
    const s = realClass(S, '1-2').studs[0]!;
    expect(s.extra.dummy).toEqual([{ lid: 'set-06', no: 6, cells: ['boss'] }]); expect(s.mis.M1).toBeUndefined();
  });
});
