// 🐞 #112 각성 용사 10강 오라 = 그 용사 전용 aura10 (옛 공통 후광으로 떨어지지 않음) · 각성 로안만 옛 후광 + 빛살
import { describe, expect, it } from 'vitest';
import { aura10Of, auraName } from '../src/ui/fx/aura';
import { AURA_NAMES, AWK_HAVE, BLOND, heroOf, isAwkId } from '../src/model/hero';
describe('🐞 #112 각성 오라', () => {
  it('각성 외형이 있는 용사(100 + n) = 본래 용사의 10강 오라 그대로', () => {
    let n = 0;
    for (const b of AWK_HAVE) {
      const base = aura10Of(b); if (!base) continue;
      const id = 100 + b; expect(isAwkId(id), String(id)).toBe(true); expect(heroOf(id).sprite).toMatch(/-awk-/);
      expect(aura10Of(id), `${b} ${heroOf(b).name}`).toEqual(base); n++;
    }
    expect(n).toBeGreaterThanOrEqual(20);
  });
  it('각성 로안 = 옛 후광 + 빛살(전용 오라 없음) · 그냥 로안 = 자기 오라', () => {
    expect(aura10Of(BLOND.to)).toBeNull(); expect(aura10Of(0)).not.toBeNull();
  });
  it('이름: +10 = 「○○ 전용 오라」(각성도 본래 용사 이름) · 각성 로안 = 「성스러운 후광」 · 9 이하 = 단계 이름', () => {
    expect(auraName(10, 123)).toBe(`${heroOf(23).name} 전용 오라`); expect(auraName(10, 23)).toBe(`${heroOf(23).name} 전용 오라`);
    expect(auraName(10, BLOND.to)).toBe(AURA_NAMES[10]); expect(auraName(9, 123)).toBe(AURA_NAMES[9]);
  });
});
