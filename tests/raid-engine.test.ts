// 🏰 성채 레이드 엔진 (📜 11/24 선생님 · DECISIONS 7968385 · 14415bc · castle-raid/DESIGN-v1 10절 컨펌 8)
//   실드 2막(80% 3칸 ×0.3 → 50% 4칸 ×0.2) · 2막이 뜨는 순간 분노 · 큰 구슬 2 · 1 · 0 · 도망 10분 · 🕯 균열 −10% (최대 −30%) · 일반 판은 그대로
import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/model/hero';
import { attack, capOf, earn, newBattle, tick, type State } from '../src/board/atb/engine';
import { statsOf } from '../src/board/atb/heroes';
import { BOSSES, RAID, RAID_BOSSES, T, crackMul, rage } from '../src/board/atb/tune';

const id = (n: string) => HEROES.find((h) => h.name === n)!.id;
const party = () => ['로안', '발도르', '루멘', '누아'].map((n) => statsOf({ hero: id(n), lv: 1, enh: 1, tier: 1 }));
const raid = (f: 1 | 2 | 3 = 1, hpMul?: number) => newBattle({ boss: RAID_BOSSES[f], diff: 'normal', party: party(), seed: 3, hpMul });
/** 보스 HP 를 목표 비율 바로 위로 내려 두고 한 방 */
const hitTo = (S: State, frac: number) => { S.bossHp = Math.round(S.bossMax * frac) + 1; S.heroes[0]!.atb = 1; attack(S, 0, 'ok'); };

describe('🏰 성채 레이드 엔진', () => {
  it('층 보스 3 = 이름 · 실드 1막 3칸(약점 2 + 1) · 2막 4칸(다른 순서 · 1막에 없던 계열)', () => {
    expect(Object.values(RAID_BOSSES).map((b) => b.name)).toEqual(['겹침의 성문지기', '참과 거짓의 쌍두 기사', '증명의 용왕']);
    for (const b of Object.values(RAID_BOSSES)) {
      const [a1, a2] = b.raid!.acts;
      expect([a1.at, a1.fams.length, a1.dmg, a2.at, a2.fams.length, a2.dmg, !!a2.rage]).toEqual([0.8, 3, 0.3, 0.5, 4, 0.2, true]);
      expect(a1.fams.slice(0, 2)).toEqual(b.weak);
      expect(a2.fams.some((f) => !a1.fams.includes(f))).toBe(true);
      expect(a2.fams.join()).not.toBe(a1.fams.join());
    }
  });
  it('체력 = 일반 차시 평균 × 1.5 · 공격 = × 1.1 · 🕯 균열 −10% 씩 최대 −30%', () => {
    const nos = Object.keys(T.bossHpByNo).map(Number).filter((n) => n < 100), avg4 = nos.reduce((a, n) => a + T.bossHpByNo[n]![3], 0) / nos.length;
    expect(Math.abs(raid().bossMax - avg4 * RAID.hp * RAID.floorHp[1])).toBeLessThanOrEqual(2);
    expect([crackMul(0), crackMul(1), crackMul(2), crackMul(3), crackMul(5)]).toEqual([1, 0.9, 0.8, 0.7, 0.7]);
    expect(raid(1, crackMul(2)).bossMax).toBe(Math.round(raid().bossMax * 0.8));
    const atk = nos.reduce((a, n) => a + (T.bossAtkByNo[n] ?? 1), 0) / nos.length;
    expect(T.bossAtkByNo[101]).toBeCloseTo(atk * 1.1, 1);
  });
  it('실드 1막 = 80% · 3칸 · 피해 ×0.3 · 앞 막이 남으면 2막 안 뜸 · 다 깨면 50% 에서 2막 4칸 ×0.2 + 분노', () => {
    const S = raid();
    hitTo(S, 0.81); expect(S.cells.length).toBe(0);
    hitTo(S, 0.8); expect([S.act, S.cells.length, S.actDmg, S.rage ?? false]).toEqual([1, 3, 0.3, false]);
    expect(S.ev.some((e) => e.k === 'shieldUp' && (e as { act?: number }).act === 1)).toBe(true);
    hitTo(S, 0.45); expect([S.act, S.cells.length]).toEqual([1, 3]); // 1막이 남음 = 2막 안 뜸 · 분노 없음 (일반 30% 분노도 없음)
    S.bossHp = Math.round(S.bossMax * 0.25); hitTo(S, 0.25); expect(S.rage ?? false).toBe(false);
    S.cells.forEach((c) => (c.broken = true)); S.bossHp = Math.round(S.bossMax * 0.6); hitTo(S, 0.5);
    expect([S.act, S.cells.length, S.actDmg, S.rage]).toEqual([2, 4, 0.2, true]);
    expect(S.cells.map((c) => c.fam)).toEqual(RAID_BOSSES[1].raid!.acts[1].fams);
    hitTo(S, 0.1); expect(S.bossHp).toBeGreaterThanOrEqual(1); expect(S.end).toBeNull(); // 실드 남으면 HP 1 에서 멈춤
    S.cells.forEach((c) => (c.broken = true)); S.bossHp = 1; hitTo(S, 0); expect(S.end?.win).toBe(true);
  });
  it('2막 피해 = 1막보다 단단함 (×0.2 < ×0.3)', () => {
    const one = (act2: boolean) => { const S = raid(); S.act = act2 ? 2 : 1; S.actDmg = act2 ? 0.2 : 0.3; S.shieldUp = true; S.cells = [{ fam: 'arms', broken: false }]; S.bossHp = S.bossMax * 0.4; const b = S.bossHp; S.heroes[0]!.atb = 1; attack(S, 0, 'ok'); return b - S.bossHp; };
    expect(one(true)).toBeLessThan(one(false));
  });
  it('🔮 큰 구슬 = 첫 시도 +2 · 한 번 틀림 +1 · 두 번 이상 0 (일반 판 = 1 · ½ · 0 그대로)', () => {
    const gain = (S: State, miss: number) => { const h = S.heroes[0]!; h.ch = 0; earn(S, 0, { done: false, perfect: false, right: true, miss }); return h.ch; };
    const R = raid(), N = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(), seed: 3 });
    expect([gain(R, 0), gain(R, 1), gain(R, 2)]).toEqual([2, 1, 0]);
    expect([gain(N, 0), gain(N, 1), gain(N, 2)]).toEqual([1, 0.5, 0]);
  });
  it('💨 도망 = 레이드 10분(7:00 경고 · 9:00 부름) · 일반 판 = T.cap 그대로', () => {
    const R = raid(), N = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(), seed: 3 });
    expect([capOf(R).warn, capOf(R).call, capOf(R).end]).toEqual([420, 540, 600]);
    expect(capOf(N)).toBe(T.cap);
    R.t = 599.95; R.heroes.forEach((h) => (h.hp = 1e9)); tick(R, 0.1); expect(R.end?.why).toBe('후퇴');
  });
  it('일반 판 = 실드 70% · 분노 30% 그대로', () => {
    const S = newBattle({ boss: BOSSES[2]!, diff: 'normal', party: party(), seed: 3 });
    hitTo(S, T.shieldAt); expect([S.cells.length > 0, S.act ?? 0]).toEqual([true, 0]);
    S.cells.forEach((c) => (c.broken = true)); hitTo(S, rage.at); expect(S.rage).toBe(true);
  });
});
