import { describe, expect, it } from 'vitest';
import { expFrom, expLine, expOf, explorers, veteranN } from '../src/school/explore';
import { earnedFrom } from '../src/model/titles';
import type { Room } from '../src/model/types';
// 🔥 #67 탐사대 = 그 차시 예습 처치 2 이상 · 노련한 탐험가 = 예습 3개 차시(차시마다 처치 2+)
describe('🔥 #67 탐사대', () => {
  it('예습 기록 → 처치 수 (kills 없으면 clear = 1)', () => {
    expect(expFrom({ m1: { tries: 3, clear: true, kills: 2 }, m2: { tries: 1, clear: true }, m3: { tries: 2 } })).toEqual({ n: 2, m: { m1: 2, m2: 1 } });
    expect(expFrom(null).n).toBe(0);
  });
  it('방 안 탐사대 = exp.n 2 이상만 · 들어온 순서', () => {
    const R = { players: { a: { exp: { n: 2 } }, b: { exp: { n: 1 } }, c: {}, d: { exp: { n: 3, m: { m1: 2 } } } } } as unknown as Room;
    expect(explorers(R)).toEqual(['a', 'd']);
    expect(expOf(R, 'b')).toBeNull();
    expect(expLine(expOf(R, 'd'), 'm1')).toBe('🔥 탐사 때 이 몬스터를 2번 쓰러뜨렸어요');
    expect(expLine(expOf(R, 'd'), 'm9')).toBe('🔥 이 던전을 탐사했어요');
    expect(expLine(null, 'm1')).toBe('');
  });
  it('노련한 탐험가 = 예습 3개 차시 (차시마다 처치 2+) · 2개 = 아직', () => {
    const two = { m1: { clear: true }, m2: { clear: true } };
    const rv = { 'prep_set-08': two, 'prep_set-09': two, 'prep_set-10': { m1: { clear: true } }, 'keyp_set-09': { n: 3 } };
    expect(veteranN(rv)).toBe(2);
    expect(earnedFrom({ bonus: { review: rv } as never })).not.toContain('explorer');
    expect(earnedFrom({ bonus: { review: { ...rv, 'prep_set-10': two } } as never })).toContain('explorer');
  });
});
