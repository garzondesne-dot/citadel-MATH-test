import { describe, expect, it } from 'vitest';
import { CHALS, chalReady, chalState, claimOf, type ChalCtx } from '../src/school/challenges';
import { earnedFrom } from '../src/model/titles';
// 🏆 #68 도전과제: 기록에서 셈 · 받기 = gem log chal_{id} 한 번 · 칭호 = 받은 뒤
const ch = (id: string) => CHALS.find((c) => c.id === id)!;
const base = (): ChalCtx => ({ d: { bonus: {
  'set-02': { m1: { tries: 3, clear: true, fixAt: 1 }, m2: { tries: 2 } },
  'eval-1': { q01: { clear: true, ph2: 'ok' }, q12: { clear: true } },
  board: { a: { n: 1 }, b: { n: 3 }, c: { n: 2, left: true } },
  review: { 'prep_set-10': { m1: { tries: 1, clear: true } } },
} as never, cards: { c1: true, c2: true }, xr: { st: { 'set-02': { a: 6, b: 5 } } }, gem: { log: { keychest_A: { g: 6 }, s_ph_x: { s: 1 }, rescue_d_0: { g: 5 }, streak10_x: { g: 30 } } } }, gifts: { 'ult_set-02_m1_v': { s: 1, got: true } }, castles: [] });
describe('🏆 #68 도전과제', () => {
  it('진행 = 기록에서', () => {
    const c = base();
    expect(chalState(ch('castle1'), c)).toMatchObject({ n: 1, done: true, got: false });
    expect(chalState(ch('review1'), c).done).toBe(true);
    expect(chalState(ch('note1'), c).done).toBe(true);
    expect(chalState(ch('review30'), c)).toMatchObject({ n: 5, m: 30, done: false });
    expect(chalState(ch('solo1'), c).done).toBe(true);
    expect(chalState(ch('team1'), c).n).toBe(1); // 나간 판(left) = 안 셈
    expect(chalState(ch('sym10'), c)).toMatchObject({ n: 10, done: true });
    expect(chalState(ch('chest1'), c).n).toBe(1); expect(chalState(ch('chest5'), c).n).toBe(2);
    expect(chalState(ch('floor1'), c).done).toBe(true); expect(chalState(ch('floor2'), c).done).toBe(false);
    expect(chalState(ch('photo1'), c)).toMatchObject({ done: true, got: true }); // 해금 = 받기 없이 끝
    expect(chalState(ch('rewrite3'), c).n).toBe(2);
    expect(chalState(ch('prep1'), c).done).toBe(true);
    expect(chalState(ch('streak10'), c).done).toBe(true);
    expect(CHALS.find((x) => x.id === 'castleall')!.hide!(c)).toBe(true); // 성채 팩 없음 = 숨김
  });
  it('받기 = 한 번 · 하루 한도 밖 · 받은 뒤 = 다시 못 받음 · 칭호', () => {
    const c = base(), k = claimOf(ch('castle1'), c, 5)!;
    expect(k).toEqual({ key: 'chal_castle1', row: { g: 20, at: 5, why: '🏆 도전과제 · 성채의 문' } });
    (c.d.gem!.log as Record<string, unknown>)[k.key] = k.row;
    expect(claimOf(ch('castle1'), c, 6)).toBeNull();
    expect(chalState(ch('castle1'), c).got).toBe(true);
    const f = claimOf(ch('floor1'), c, 7)!; expect(f.row).toMatchObject({ g: 0, s: 1 });
    expect(claimOf(ch('review30'), c, 7)).toBeNull(); // 아직
    const p = claimOf(ch('prep1'), c, 8)!; (c.d.gem!.log as Record<string, unknown>)[p.key] = p.row;
    expect(earnedFrom(c.d)).toContain('ahead');
  });
  it('받을 것 수 = 끝났는데 안 받은 것 (해금 · 숨김 빼기)', () => { expect(chalReady(base())).toBeGreaterThanOrEqual(10); });
});
