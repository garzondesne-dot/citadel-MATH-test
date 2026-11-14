// 💎 · 🌱 수업 보상 (출시 막는 것 3 · 정식 값 그대로)
import { describe, expect, it } from 'vitest';
import { G, levelInfo, levelOf, settle, streakOf, xpOf } from '../src/school/reward';

const rw = (correct: number, extra: { perfects?: number; boss?: boolean } = {}) => {
  const parts = { join: 1, submit: 3, correct, fixed: 0, bossWin: 1, perfect: extra.boss ? 1 : 0 };
  const gems: { key: string; g: number; why: string; upsert?: boolean; free?: boolean }[] = [{ key: 'raid_1', g: G.join + Math.min(G.solvedMax, correct), why: '레이드', upsert: true }];
  if (extra.perfects) gems.push({ key: 'perfect_1', g: G.perfect, why: '⚡' });
  if (extra.boss) gems.push({ key: 'bossperfect_1', g: G.bossPerfect, why: '👑' });
  return { parts, perfects: extra.perfects ?? 0, gems, firstXp: 0, xp: { key: 'raid_1', n: xpOf(parts) } };
};
const st0 = { gem: 0, xp: 0, day: undefined, gemLog: {}, xpLog: {} };
describe('💎 · 🌱 수업 보상', () => {
  it('정식 값: 참여 4 + 맞힌 소문제(최대 12) · 퍼펙트 6 · 형성평가 만점 6 · EXP 표', () => {
    expect(settle(rw(7), st0, 'd', 1).gem).toBe(11);
    expect(settle(rw(30), st0, 'd', 1).gem).toBe(16);
    expect(settle(rw(10, { perfects: 1, boss: true }), st0, 'd', 1).gem).toBe(14 + 6 + 6);
    expect(xpOf({ join: 1, submit: 3, correct: 7, fixed: 2, bossWin: 1, perfect: 1 })).toBe(10 + 6 + 14 + 0 + 10 + 5);
    expect(xpOf({ join: 1, submit: 500, correct: 0, fixed: 0, bossWin: 0, perfect: 0 })).toBe(300);
  });
  it('같은 수업 = 늘어난 만큼만 · 퍼펙트는 한 번', () => {
    const a = settle(rw(5, { perfects: 1 }), st0, 'd', 1);
    const st1 = { gem: a.gem, xp: a.xp, day: a.day, gemLog: { raid_1: { g: 9 }, perfect_1: { g: 6 } }, xpLog: { raid_1: { xp: a.xp } } };
    const b = settle(rw(8, { perfects: 1 }), st1, 'd', 2);
    expect(b.gem).toBe(3); expect(b.writes['gem/log/raid_1']).toMatchObject({ g: 12 }); expect(b.writes['gem/log/perfect_1']).toBeUndefined();
    expect(settle(rw(8, { perfects: 1 }), { ...st1, gemLog: { raid_1: { g: 12 }, perfect_1: { g: 6 } }, xpLog: { raid_1: { xp: 999 } } }, 'd', 3).gem).toBe(0);
  });
  it('하루 한도 100 · 레벨 5 보너스는 한도 밖', () => {
    expect(settle(rw(12), { ...st0, day: { d: 95 } }, 'd', 1).gem).toBe(5);
    expect(settle(rw(12), { ...st0, day: { d: 100 } }, 'd', 1).gem).toBe(0);
    expect(levelOf(0)).toBe(1); expect(levelOf(40)).toBe(2); expect(levelOf(40 + 60 + 80 + 100)).toBe(5);
    const r = settle(rw(12), { ...st0, xp: 279, day: { d: 100 } }, 'd', 1);
    expect(r.gem).toBe(G.level5); expect(r.writes['gem/log/lv5']).toMatchObject({ g: 6 });
  });
  it('🔁 연속 참여 = held 차시 끝에서부터 기록이 이어진 수 · 💎 4 · 6 · 12 는 한도 밖', () => {
    const Ls = [1, 2, 3, 4, 5].map((no) => ({ id: `l${no}`, no })).concat([{ id: 'ev', no: 6, eval: true } as never]);
    expect(streakOf({ l3: 1, l4: 1, l5: 1 }, { l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, ev: 1 }, Ls)).toBe(3);
    expect(streakOf({ l1: 1, l2: 1, l4: 1 }, { l1: 1, l2: 1, l3: 1, l4: 1 }, Ls)).toBe(1); // l3 결석이면 끊김
    expect(streakOf({ l1: 1, l2: 1 }, { l1: 1, l2: 1, l3: 0 }, Ls)).toBe(2); // 수업 안 한 차시(held 없음)는 건너뜀
    const r = rw(12); r.gems.push({ key: 'streak3_l5', g: G.streak[3]!, why: '3차시 연속', free: true });
    const s1 = settle(r, { ...st0, day: { d: 100 } }, 'd', 1); expect(s1.gem).toBe(4); expect(s1.day.d).toBe(100);
  });
  it('🎁 첫 출정 EXP = 다음 레벨까지(최소 40) · 한 수업 최대 300', () => {
    expect(levelInfo(0)).toEqual({ lv: 1, into: 0, next: 40 });
    expect(xpOf({ first: 40, join: 1, submit: 0, correct: 0, fixed: 0, bossWin: 0, perfect: 0 })).toBe(50);
    expect(xpOf({ first: 400, join: 1, submit: 0, correct: 0, fixed: 0, bossWin: 0, perfect: 0 })).toBe(300);
  });
});
