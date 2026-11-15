// 🔎 오개념 분류 = 정식 lessons/curriculum.js DS.Mis.classify 그대로
import { describe, expect, it } from 'vitest';
import { bossTag, classify } from '../src/subjects/common-math2/mis';
describe('🔎 오개념 분류', () => {
  it('부분집합 개수 2ⁿ ↔ 2ⁿ − 1 = M04', () => { expect(classify({ type: 'number', answer: 8 } as never, 7)).toEqual(['M04']); expect(classify({ type: 'number', answer: 7 } as never, 8)).toEqual(['M04']); expect(classify({ type: 'number', answer: 8 } as never, 5)).toEqual([]); });
  it('빈칸 ∈ ↔ ⊂ = M01 · ⊂ ↔ ⊄ = M02 · = ↔ ≠ = M06', () => {
    expect(classify({ type: 'blanks', items: [{ answer: '∈' }, { answer: '⊂' }, { answer: '=' }] } as never, ['⊂', '⊄', '≠']).sort()).toEqual(['M01', 'M02', 'M06']);
  });
  it('부분집합 모두 쓰기: ∅ · 자기 자신 빠뜨림 = M03 · M04', () => { expect(classify({ type: 'subsets', base: [1, 2] } as never, [[1], [2]]).sort()).toEqual(['M03', 'M04']); });
  it('형성평가 꼬리표: 6차시 1번 = 드모르간 M11 · 2번 숫자 7 = M10 · 꼬리표 없는 차시 = 자동 규칙만', () => {
    expect(classify({ type: 'choice', answer: 0 } as never, 2, bossTag('set-06', 1, 0))).toEqual(['M11']);
    expect(classify({ type: 'number', answer: 20 } as never, 7, bossTag('set-06', 1, 1))).toEqual(['M10']);
    expect(bossTag('ex-11', 1, 0)).toBeNull();
  });
});
