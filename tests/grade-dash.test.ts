import { describe, expect, it } from 'vitest';
import { grade, normAns } from '../src/engine/grade';
import type { Question } from '../src/model/types';

describe('📜 2026-11-14 빈칸 · 글 답: 하이픈 - · 빼기 − · 대시 – · 띄어쓰기 같게', () => {
  const q = { type: 'blanks', question: '', items: [{ answer: 'a - 1' }], options: ['a - 1', 'a + 1'] } as unknown as Question;
  it('blanks: 「a − 1」 · 「a-1」 · 「a – 1」 = 정답 「a - 1」', () => {
    for (const g of ['a - 1', 'a − 1', 'a-1', 'a – 1', ' a  −1 ']) expect(grade(q, [g])).toBe(true);
    expect(grade(q, ['a + 1'])).toBe(false);
    expect(grade(q, ['a1'])).toBe(false);
  });
  it('text: 같은 규칙', () => {
    const t = { type: 'text', question: '', answers: ['x − 2'] } as unknown as Question;
    expect(grade(t, 'x-2')).toBe(true); expect(grade(t, 'X - 2')).toBe(true); expect(grade(t, 'x+2')).toBe(false);
  });
  it('normAns 는 정답 표기를 바꾸지 않음(비교용)', () => { expect(normAns('a − 1')).toBe('a-1'); });
});
