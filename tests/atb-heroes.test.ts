// 🧙 게시판 던전 ATB 용사 수치 (📜 용사수치-초안 0절 로그 식 · 결정 V3)
import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/model/hero';
import { famOf, roleOf, statsOf, statRows } from '../src/board/atb/heroes';
import { G } from '../src/board/atb/tune';

describe('ATB 용사 수치', () => {
  it('로그 식 기준값 = 초안 표 (Lv.10 +20% · 강화 +10 +30% · Ⅳ +25% · Lv.10 속도 +10%)', () => {
    expect(G.lv(1)).toBe(0); expect(G.lv(10)).toBeCloseTo(0.2); expect(G.lv(3)).toBeCloseTo(0.095, 3);
    expect(G.enh(1)).toBeCloseTo(0.087, 3); expect(G.enh(10)).toBeCloseTo(0.33); // +10 = 각성 +3%
    expect(G.tier(4)).toBeCloseTo(0.25); expect(G.tier(2)).toBeCloseTo(0.125); expect(G.spd(10)).toBeCloseTo(0.1);
  });
  it('역할별 수치 = 초안 표 (Lv.1 · +0)', () => {
    const s = (name: string) => statsOf({ hero: HEROES.find((h) => h.name === name)!.id, lv: 1, enh: 0, tier: 1 });
    expect([s('로안').role, s('로안').maxHp, s('로안').def, s('로안').atbSec]).toEqual(['dealer', 100, 0, 8]);
    expect([s('발도르').role, s('발도르').maxHp, s('발도르').def, s('발도르').atbSec]).toEqual(['tank', 130, 0.2, 8.89]);
    expect([s('루멘').role, s('루멘').maxHp, s('루멘').atbSec]).toEqual(['healer', 90, 8.42]);
    expect([s('누아').role, s('누아').maxHp, s('누아').atbSec]).toEqual(['support', 95, 7.27]);
  });
  it('모든 학생 용사 = 역할 · 계열이 있음 · 역할 수 = 딜러 10 · 탱커 5 · 힐러 4 · 서포터 12 (각성 로안 · 올드윈 뺌)', () => {
    const n: Record<string, number> = {}; for (const h of HEROES) { n[roleOf(h.id)] = (n[roleOf(h.id)] || 0) + 1; expect(famOf(h.id)).toBeTruthy(); }
    expect(n).toEqual({ dealer: 10, tank: 5, healer: 4, support: 12 });
  });
  it('고르는 창: 방어 0 = 「0%」 · 딜러 ATB 8.0초', () => {
    const r = statRows(statsOf({ hero: 0, lv: 1, enh: 0, tier: 1 }));
    expect(r.find((x) => x.k === 'def')!.v).toBe('0%'); expect(r.find((x) => x.k === 'atb')!.v).toBe('8.0초');
  });
});
