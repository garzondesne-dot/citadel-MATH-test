// ♻ 되살리기 계산 = 칸 합치기 A 와 같은 규칙 (o · f · x 는 안 바꿈 · - · n 만 방 제출로 채움)
import { describe, expect, it } from 'vitest';
import { patchOf } from '../src/school/restore';
describe('♻ 되살리기 칸', () => {
  it('- · n 칸만 채움 · 이미 o · f · x 는 그대로 · 안 낸 칸은 안 건드림', () => {
    const p = patchOf({ mons: { m1: 'n', m2: '-', m3: 'x', u4: 'o' } }, [{ mons: { m1: 'o', m2: 'f', m3: 'o' } }]);
    expect(p!.cells).toEqual(['m1', 'm2']); expect(p!.mons).toEqual({ m1: 'o', m2: 'f', m3: 'x', u4: 'o' });
  });
  it('방 여러 개 = 앞 방부터 · 처음 채운 값 유지', () => { expect(patchOf({ mons: { m1: 'n' } }, [{ mons: { m1: 'x' } }, { mons: { m1: 'o' } }])!.mons.m1).toBe('x'); });
  it('형성평가 = 문항마다 빈칸만 · 점수 다시 셈', () => { const p = patchOf({ mons: {}, bossM: 'nnn' }, [{ mons: {}, bossM: 'ox-' }], 3)!; expect([p.bossM, p.boss, p.cells]).toEqual(['oxn', 1, ['boss']]); });
  it('바뀌는 것 없음 = null', () => { expect(patchOf({ mons: { m1: 'o' } }, [{ mons: { m1: 'x' } }])).toBeNull(); });
});
