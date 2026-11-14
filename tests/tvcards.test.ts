// 📺 TV 개념 · 문제 카드 꼴 (2026-11-14 시안대로)
import { describe, expect, it } from 'vitest';
import { conceptParts, problemParts } from '../src/ui/tv/cards';
import { PACKS } from '../src/engine/packs';
import { items } from '../src/engine/lessons';

describe('TV 카드', () => {
  it('6차시 개념 1 = 드모르간 수식 상자 2 + 요약 한 줄 · 교사 말 조각 없음', () => {
    const L = PACKS.find((p) => p.no === 6)!, c = conceptParts(L.steps.find((s) => s.id === 'c1')!.say ?? '');
    expect(c.boxes).toEqual(['(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ', '(A ∩ B)ᶜ = Aᶜ ∪ Bᶜ']);
    expect(c.lines).toEqual(['괄호를 풀 때 ᶜ 이 각각 붙고 ∪ ↔ ∩ 가 바뀐다!']);
  });
  it('6차시 문제 1 = U · A · B 위에 한 번 · (1)~(3) ② 짧게', () => {
    const L = PACKS.find((p) => p.no === 6)!, p = problemParts(items(L, 'm1', 'T|u', 0).map((q) => q.question));
    expect(p.head).toEqual(['U = {1, 2, 3, 4, 5, 6}', 'A = {1, 2, 3}, B = {3, 4}']);
    expect(p.items[0]).toBe('(1) (A ∪ B)ᶜ 의 원소를 모두 고르시오.');
    expect(p.items[3]).toBe('(3) ② Aᶜ ∪ Bᶜ 의 원소를 모두 고르시오.');
  });
  it('모든 차시 개념 = 빈 카드 없음 · 공통 조건 없는 문제는 그대로', () => {
    for (const L of PACKS) for (const s of L.steps) if (s.kind === 'concept' && s.say) { const c = conceptParts(s.say); expect(c.boxes.length + c.lines.length, `${L.no} ${s.id}`).toBeGreaterThan(0); }
    expect(problemParts(['(1) 하나', '(2) 둘'])).toEqual({ head: [], items: ['(1) 하나', '(2) 둘'] });
  });
});
