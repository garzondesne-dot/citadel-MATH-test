// 🏁 땅따먹기 연출 기록 fx (📜 2026-11-24 🔨 #18 「연출만 세게」 · 규칙은 그대로 · 화면만 읽음)
import { describe, expect, it } from 'vitest';
import { fxCells, fxLine, moveTurn, startLg, type Lg } from '../src/rest/landgrab';

const rnd = () => 0.5;
const mk = (own: Record<string, number>, team: Record<string, number>, pos: Record<string, [number, number]>, stars: [number, number][] = [], size = 9): Lg => {
  const a = Array(size * size).fill('.'); for (const [k, t] of Object.entries(own)) { const [x, y] = k.split(',').map(Number); a[y! * size + x!] = String(t); }
  return { ...startLg(0), phase: 'move', turn: 2, size, nTeam: 4, own: a.join(''), team, pos, last: Object.fromEntries(Object.keys(team).map((u) => [u, 0])), mine: {}, stars, starHit: [0, 0, 0, 0], alive: {}, total: Object.keys(team).length };
};

describe('🎆 fx', () => {
  it('다른 팀끼리 같은 칸 = bump 칸 1개 · 두 용사 bu = 가려던 쪽 · 둘 다 제자리(규칙 그대로)', () => {
    const g = moveTurn(mk({}, { a: 0, b: 1 }, { a: [3, 4], b: [5, 4] }), { a: 3, b: 2 }, rnd);
    expect(g.pos.a).toEqual([3, 4]); expect(g.pos.b).toEqual([5, 4]);
    expect(g.fx?.bump).toEqual([[4, 4]]); expect(g.fx?.bu).toEqual({ a: [1, 0], b: [-1, 0] });
    expect(fxLine({ ...g, turn: 3, phase: 'pick' })).toMatch(/⚔ 쾅! 1곳/);
  });
  it('남의 칸에 들어가면 steal · 빈칸은 steal 아님', () => {
    const g = moveTurn(mk({ '4,4': 2 }, { a: 0, c: 0 }, { a: [3, 4], c: [6, 6] }), { a: 3, c: 3 }, rnd);
    expect(g.fx?.steal).toEqual([[4, 4, 0]]);
    expect(fxCells(g.fx)['4,4']).toBe('steal');
    expect(fxLine({ ...g, turn: 3, phase: 'pick' })).toMatch(/🔴 붉은 팀이 1칸을 뺏었다/);
  });
  it('⭐ = star 기록 · 9칸 파도(가운데 wave0 · 옆 wave1 · 대각 wave2) · 해설 1순위', () => {
    const g = moveTurn(mk({ '4,4': 2 }, { a: 0 }, { a: [3, 4] }, [[4, 4]]), { a: 3 }, rnd);
    expect(g.fx?.star).toEqual([[4, 4, 0]]);
    const m = fxCells(g.fx); expect(m['4,4']).toBe('wave0'); expect(m['5,4']).toBe('wave1'); expect(m['5,5']).toBe('wave2');
    expect(fxLine({ ...g, turn: 3, phase: 'pick' })).toMatch(/⭐/);
  });
  it('지난 턴 fx 가 오래되면 해설 = 기본 줄', () => {
    const g = moveTurn(mk({}, { a: 0, b: 1 }, { a: [3, 4], b: [5, 4] }), { a: 3, b: 2 }, rnd);
    expect(fxLine({ ...g, turn: 9, phase: 'pick' })).toMatch(/다음 칸으로/);
  });
});
