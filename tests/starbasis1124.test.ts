// ⭐ 게시판 별 근거 한 줄 (📜 11/24 머리 🔨 「학생들이 납득할 만한 뚜렷한 근거」) · 별 계산 = #140 그대로
import { describe, expect, it } from 'vitest';
import { atbStars, starBasis, STAR_RULE_TEXT } from '../src/board/goals';
describe('⭐ 근거 줄', () => {
  it('처치 못 함 = 「처치해야」', () => { expect(starBasis(false, { ok: 9, bad: 0 })).toMatch(/처치해야/); });
  it('낸 소문제 5개 미만 = 5개 이상 안내 · ⭐1', () => { expect(atbStars(true, { ok: 4, bad: 0 })).toBe(1); expect(starBasis(true, { ok: 4, bad: 0 })).toBe('내가 낸 소문제 4개 · 5개 이상 풀면 ⭐⭐ 부터 받아요'); });
  it('70% = ⭐⭐ · 다음 90%', () => { expect(starBasis(true, { ok: 7, bad: 3 })).toBe('내가 낸 소문제 10개 중 첫 시도 정답 7개 = 70% → ⭐⭐ (⭐⭐⭐ 까지 90%)'); });
  it('69% = ⭐ · 다음 70%', () => { expect(starBasis(true, { ok: 9, bad: 4 })).toMatch(/= 69% → ⭐ \(⭐⭐ 까지 70%\)/); });
  it('90% 이상 = ⭐⭐⭐ · ⏭ 넘김은 틀림으로 표시', () => { expect(starBasis(true, { ok: 9, bad: 1 }, 1)).toBe('내가 낸 소문제 10개 중 첫 시도 정답 9개 = 90% → ⭐⭐⭐ (⏭ 넘김 1개는 틀림으로)'); });
  it('출정 카드 조건 = 5문제 이상까지', () => { expect(STAR_RULE_TEXT).toBe('⭐ 처치 · ⭐⭐ 70% · ⭐⭐⭐ 90% · 5문제 이상'); });
});
