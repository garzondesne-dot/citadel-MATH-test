import { describe, expect, it } from 'vitest';
import { josa } from '../src/board/josa';
describe('조사 (#70)', () => {
  it('받침 있음 · 없음', () => {
    expect(josa('붉은 사자단', '이/가')).toBe('붉은 사자단이');
    expect(josa('푸른 매', '이/가')).toBe('푸른 매가');
    expect(josa('황금 곰단', '과/와')).toBe('황금 곰단과');
    expect(josa('은빛 늑대', '을/를')).toBe('은빛 늑대를');
  });
});
