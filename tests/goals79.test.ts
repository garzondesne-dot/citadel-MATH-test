import { describe, expect, it } from 'vitest';
import { fameLv, fameOf, legendOf, MAP_PTS, mapLessons, nextFame, noteLeftByNo, starsByNo, starTotal } from '../src/board/goals';
import { PACKS } from '../src/engine/packs';
import { earnedFrom } from '../src/model/titles';

// 🎯 #79 게시판 목표 3종
describe('🎯 게시판 목표', () => {
  it('⭐ = 차시마다 최고 등급 · 클리어만 · S3 A2 B1 C0', () => {
    const r = { a: { no: 2, grade: 'B', clear: true }, b: { no: 2, grade: 'S', clear: true }, c: { no: 3, grade: 'S', clear: false }, d: { no: 4, grade: 'C', clear: true }, e: { no: 5, grade: 'A', clear: true } };
    expect(starsByNo(r)).toEqual({ 2: 3, 5: 2 });
    expect(starTotal(starsByNo(r), [{ no: 2 }, { no: 3 }, { no: 5 }])).toBe(5);
  });
  it('지도 = 차시 번호마다 한 칸(쪼갠 팩도) · 돌 원 15 · 칸 수 ≤ 14', () => {
    const L = mapLessons(PACKS); expect(new Set(L.map((x) => x.no)).size).toBe(L.length); expect(MAP_PTS).toHaveLength(17); expect(L.length).toBeLessThanOrEqual(MAP_PTS.length - 1);
    MAP_PTS.forEach(([x, y]) => { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(100); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(100); });
  });
  it('🛡 명성 = 🛡 · 2명 이상 · 클리어 · 견습 3 · 기사 10 · 스승 25', () => {
    const recs = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, { role: 'g' as const, n: i % 4 === 0 ? 1 : 2, clear: i !== 5 }]));
    expect(fameOf(recs)).toBe(8); expect(fameLv(8)?.name).toBe('수호 견습'); expect(nextFame(8)?.n).toBe(10); expect(fameLv(2)).toBeNull(); expect(fameLv(25)?.name).toBe('수호 스승');
  });
  it('칭호: 별 · 전설 · 수호', () => {
    const L = mapLessons(PACKS), board = Object.fromEntries(L.map((l, i) => [`b${i}`, { no: l.no, grade: 'S', clear: true, role: 'g' as const, n: 2 }]));
    expect(legendOf(starsByNo(board), L)).toBe(true);
    const got = earnedFrom({ bonus: { board } } as never);
    for (const id of ['board_explore', 'board_conquer', 'board_legend', 'guard1']) expect(got).toContain(id);
    expect(got).not.toContain('guard2');
  });
});

describe('📕 남은 오답', () => {
  it('수업에서 안 푼 칸 = 남음 · 게시판 「복습 완료」(bonus/review) = 줄어듦 → 0', () => {
    const L = PACKS.find((p) => p.id === 'set-02')!, mids = L.steps.filter((s) => s.kind === 'monster' && !s.later).map((s) => s.id);
    const recs = { 'set-02': { mons: Object.fromEntries(mids.map((m) => [m, 'x'])), boss: 3, bossN: 3, bossM: 'ooo', miss: [], at: 1 } } as never;
    const a = noteLeftByNo(PACKS, recs, {} as never)[2]!;
    expect(a.had).toBe(true); expect(a.left).toBeGreaterThan(0);
    const b = noteLeftByNo(PACKS, recs, { review: { 'set-02': Object.fromEntries([...mids, 'boss'].map((m) => [m, 1])) } } as never)[2]!;
    expect(b.left).toBe(0);
  });
});
