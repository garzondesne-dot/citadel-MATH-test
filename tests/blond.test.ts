// 🌟 #29 각성한 로안 (📜 2026-11-17 선생님 「로안장착 +10강 4쌍월참 으로 기준」 → 「만번째베기 넣어줘」) — 조건 4 · 보이는 모습만 · 고르는 칸 아님
import { describe, expect, it } from 'vitest';
import { attrOf, blondChecks, BLOND, heroOf, HEROES, isBlond, ladder, lookId } from '../src/model/hero';

describe('각성한 로안', () => {
  it('넷 다 맞으면 16 · 하나라도 빠지면 고른 용사', () => {
    expect(lookId({ hero: 0, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(16);
    expect(lookId({ hero: 0, enh: 12, fx: 'twin', title: 'slash10k' })).toBe(16);
    expect(lookId({ hero: 0, enh: 9, fx: 'twin', title: 'slash10k' })).toBe(0);
    expect(lookId({ hero: 0, enh: 10, fx: 'slash', title: 'slash10k' })).toBe(0);
    expect(lookId({ hero: 3, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(3);
    expect(lookId({ hero: 0, enh: null, fx: 'twin', title: 'slash10k' })).toBe(0); // 강화 기록 없음 = 0강
    expect(lookId({ hero: 0, enh: 10, fx: 'twin', title: 'none' })).toBe(0); // 호칭 안 닮 = 로안
    expect(lookId({ hero: 0, enh: 10, fx: 'twin' })).toBe(0);
  });
  it('체크 4칸 = 로안 · +10 · 쌍월 참 · 만 번째 베기', () => {
    expect(blondChecks({ hero: 0, enh: 4, fx: 'twin', title: 'slash10k' }).map((c) => c.ok)).toEqual([true, false, true, true]);
    expect(blondChecks({ hero: 0, enh: 10, fx: 'twin', title: 'none' }).map((c) => c.ok)).toEqual([true, true, true, false]);
    expect(isBlond({ hero: 0, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(true);
  });
  it('모습만 바뀜 = 속성 · 사다리는 로안 그대로 · 금발 시트', () => {
    expect(heroOf(BLOND.to).sprite).toBe('hero-blond-v1.webp');
    expect(heroOf(BLOND.to).name).toBe('각성한 로안');
    expect(attrOf(16)).toBe(attrOf(0));
    expect(ladder(16)).toEqual(ladder(0));
  });
  it('고르는 용사 목록에는 없음', () => {
    expect(HEROES.some((h) => h.id === 16)).toBe(false);
  });
});
