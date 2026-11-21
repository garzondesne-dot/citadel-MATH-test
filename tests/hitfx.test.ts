// 💥 피격 손맛 공용 조각 (📜 #54) — 단계 · 금 · 숫자 글
import { describe, expect, it } from 'vitest';
import { crackLevel, crackStep, hitText, hitTier } from '../src/ui/fx/hitfx';
describe('피격 손맛 공용 (요청 #54)', () => {
  it('단계 = 빗나감 > 각성 > 스킬 > 치명 > 약점 > 보통', () => {
    expect([hitTier({ miss: true, crit: true }), hitTier({ ult: true, skill: true }), hitTier({ skill: true, crit: true }), hitTier({ crit: true, weak: true }), hitTier({ weak: true }), hitTier({})]).toEqual(['miss', 'ult', 'sk', 'crit', 'weak', 'norm']);
    expect([hitText(20, 'crit'), hitText(7, 'weak'), hitText(5, 'norm'), hitText(0, 'miss')]).toEqual(['💥 치명! −20', '약점! −7', '−5', '빗나감']);
  });
  it('금 = 75 · 50 · 25% · 넘을 때만 새 단계', () => {
    expect([crackLevel(100, 100), crackLevel(75, 100), crackLevel(50, 100), crackLevel(10, 100)]).toEqual([0, 1, 2, 3]);
    expect([crackStep(0, 70, 100), crackStep(1, 70, 100), crackStep(1, 40, 100)]).toEqual([1, null, 2]);
  });
});
