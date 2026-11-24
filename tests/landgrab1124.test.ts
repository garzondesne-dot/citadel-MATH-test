// 🏁 땅따먹기 (📜 2026-11-24 · 설계 DESIGN-v1 · sim.py 순서)
import { describe, expect, it } from 'vitest';
import { deal, LG, moveTurn, ownAt, ranking, scores, sizeFor, startLg, stepLg, addLate, type Lg } from '../src/rest/landgrab';
import { GAMES, GAME_FEAT, rewardOf } from '../src/rest/run';

let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const mk = (own: Record<string, number>, team: Record<string, number>, pos: Record<string, [number, number]>, size = 9): Lg => {
  const a = Array(size * size).fill('.'); for (const [k, t] of Object.entries(own)) { const [x, y] = k.split(',').map(Number); a[y! * size + x!] = String(t); }
  return { ...startLg(0), phase: 'pick', turn: 1, size, nTeam: 4, own: a.join(''), team, pos, last: Object.fromEntries(Object.keys(team).map((u) => [u, 0])), mine: {}, stars: [], starHit: [0, 0, 0, 0], alive: {}, total: Object.keys(team).length };
};
describe('🏁 판 · 팀', () => {
  it('판 크기 = 4 ~ 12명 9 · 13 ~ 24명 11 · 25명 이상 13', () => { expect([sizeFor(4), sizeFor(12), sizeFor(13), sizeFor(24), sizeFor(25), sizeFor(32)]).toEqual([9, 9, 11, 11, 13, 13]); });
  it('4팀 · 인원 차이 최대 1 · 귀퉁이 · 한 명 적은 팀 = 2칸 미리 칠함 · 4명 미만 = 2팀', () => {
    const f = deal(startLg(0), Array.from({ length: 10 }, (_, i) => `u${i}`), 0, rnd), cnt = [0, 1, 2, 3].map((t) => Object.values(f.team).filter((x) => x === t).length);
    expect(Math.max(...cnt) - Math.min(...cnt)).toBeLessThanOrEqual(1); expect(f.size).toBe(9);
    const sc = scores(f); cnt.forEach((c, t) => { if (c < Math.max(...cnt)) expect(sc[t]).toBe(c + 2); else expect(sc[t]).toBe(c); });
    expect(deal(startLg(0), ['a', 'b', 'c'], 0, rnd).nTeam).toBe(2);
  });
});
describe('🏁 한 턴 (sim.py 순서)', () => {
  it('움직여 들어간 칸 = 우리 색 · 남의 칸 뺏음 · 안 고르면 지난 방향 · 벽 = 제자리', () => {
    const f = mk({ '4,4': 1, '5,4': 2 }, { a: 0, b: 3 }, { a: [4, 4], b: [0, 0] });
    const g = moveTurn({ ...f, last: { a: 3, b: 0 } }, {}, rnd); // a 오른쪽(지난 방향) · b 위 = 벽
    expect(g.pos.a).toEqual([5, 4]); expect(ownAt(g, 5, 4)).toBe(0); expect(g.pos.b).toEqual([0, 0]); expect(g.mine.a).toBe(1);
  });
  it('다른 팀과 같은 칸으로 = 둘 다 제자리 · 같은 팀은 겹쳐도 됨 · 자리 맞바꿈은 됨', () => {
    const f = mk({}, { a: 0, b: 1, c: 0 }, { a: [3, 4], b: [5, 4], c: [4, 3] });
    const g = moveTurn(f, { a: 3, b: 2, c: 1 }, rnd); // a → (4,4) · b → (4,4) 겹침 = 둘 다 제자리 · c → (4,4)
    expect(g.pos.a).toEqual([3, 4]); expect(g.pos.b).toEqual([5, 4]); expect(g.pos.c).toEqual([4, 3]); expect(ownAt(g, 4, 4)).toBe(-1); // sim.py 그대로: 다른 팀(b)과 같은 칸을 노린 a · c 모두 제자리
    const h = moveTurn(mk({}, { a: 0, c: 0 }, { a: [3, 4], c: [4, 3] }), { a: 3, c: 1 }, rnd); expect(h.pos.a).toEqual([4, 4]); expect(h.pos.c).toEqual([4, 4]); // 같은 팀 = 겹침 됨
    const k = moveTurn(mk({}, { a: 0, b: 1 }, { a: [3, 4], b: [4, 4] }), { a: 3, b: 2 }, rnd); expect(k.pos.a).toEqual([4, 4]); expect(k.pos.b).toEqual([3, 4]); // 맞바꿈 = 됨
  });
  it('⭐ 밟으면 둘레 3×3 · ⭐ 는 7 · 13 · 19 · 25턴에 3개', () => {
    const f = { ...mk({}, { a: 2 }, { a: [3, 3] }), stars: [[4, 3]] as [number, number][] };
    const g = moveTurn(f, { a: 3 }, rnd); let n = 0; for (let x = 3; x <= 5; x++) for (let y = 2; y <= 4; y++) if (ownAt(g, x, y) === 2) n++;
    expect(n).toBe(9); expect(g.starHit[2]).toBe(1); expect(g.stars.length).toBe(0);
    expect(moveTurn({ ...mk({}, { a: 0 }, { a: [0, 0] }), turn: 7 }, {}, rnd).stars.length).toBe(3);
  });
  it('동점 = ⭐ 많은 팀 → 그래도 같으면 공동', () => {
    const f = { ...mk({ '0,0': 0, '1,0': 1 }, {}, {}), starHit: [0, 1, 0, 0] }; expect(ranking(f).winTeams).toEqual([1]);
    expect(ranking({ ...f, starHit: [0, 0, 0, 0] }).winTeams.sort()).toEqual([0, 1]);
  });
});
describe('🏁 흐름 · 보상', () => {
  it('모이기 → 출발(2명부터) → 준비 10초 → 30턴 × (3 + 2초) → 결과 · 늦게 온 학생 = 가장 적은 팀', () => {
    let f: Lg = startLg(0); let t = 0;
    expect(stepLg(f, { a: 1 }, null, 1)).toBeNull(); // 출발 안 누름
    f = { ...f, go: 1 }; expect(stepLg(f, { a: 1 }, null, 1)).toBeNull(); // 1명
    f = stepLg(f, { a: 1, b: 1, c: 1, d: 1, e: 1 }, null, (t = 10), rnd)!; expect(f.phase).toBe('ready'); expect(f.nTeam).toBe(4);
    f = stepLg(f, null, null, (t += LG.readyMs))!; expect(f.phase).toBe('pick'); expect(f.turn).toBe(1);
    f = stepLg(f, { a: 1, b: 1, c: 1, d: 1, e: 1, late: 1 }, null, t + 1)!; expect(f.team.late).toBeDefined();
    for (let k = 0; k < LG.turns; k++) { f = stepLg(f, null, {}, (t += LG.pickMs))!; expect(f.phase).toBe('move'); f = stepLg(f, null, null, (t += LG.moveMs))!; }
    expect(f.phase).toBe('end'); expect(f.winTeams!.length).toBeGreaterThanOrEqual(1);
    const w = Object.keys(f.team).find((u) => f.winTeams!.includes(f.team[u]!))!, l = Object.keys(f.team).find((u) => !f.winTeams!.includes(f.team[u]!));
    expect(rewardOf(f as never, w)?.gem).toBe(30); if (l) expect(rewardOf(f as never, l)?.gem).toBe(10); expect(rewardOf(f as never, 'nobody')).toBeNull();
    expect(addLate(f, 'a')).toBe(f);
  });
  it('놀이 목록 · 스위치', () => { expect(GAMES.some((g) => g.k === 'lg')).toBe(true); expect(GAME_FEAT.lg).toBe('rest-landgrab'); });
});
