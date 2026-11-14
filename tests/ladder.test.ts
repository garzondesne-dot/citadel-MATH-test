// 🏆 게시판 랭킹 (DECISIONS 2026-11-14 · 수호자 절대 · 도전자 성장)
import { describe, expect, it } from 'vitest';
import { addRun, growList, growOf, guardList, rowsOf, semOf, viewOf, type Agg } from '../src/board/ladder';

const A0: Agg = { cls: '1-3', hero: 0, enh: 0 };
describe('🏆 게시판 랭킹', () => {
  it('학기 = 3~8월 1학기 · 9~2월 2학기 (1 · 2월 = 앞 해)', () => {
    expect(semOf(Date.UTC(2026, 10, 15))).toBe('2026-2'); expect(semOf(Date.UTC(2027, 0, 10))).toBe('2026-2'); expect(semOf(Date.UTC(2027, 2, 2))).toBe('2027-1');
  });
  it('🛡 수호자 = 차시별 최고 등급(S4 A3 B2 C1) 합 → 정답률 → 시간', () => {
    let a = addRun(A0, { lid: 'l6', role: 'g', grade: 'B', acc: 0.7, sec: 300, base: null }).agg;
    a = addRun(a, { lid: 'l6', role: 'g', grade: 'S', acc: 0.95, sec: 250, base: null }).agg;
    a = addRun(a, { lid: 'l6', role: 'g', grade: 'A', acc: 0.99, sec: 100, base: null }).agg; // 등급이 낮으면 안 바뀜
    a = addRun(a, { lid: 'l7', role: 'g', grade: 'A', acc: 0.9, sec: 200, base: null }).agg;
    expect(a.g).toEqual({ l6: { gs: 4, acc: 0.95, sec: 250 }, l7: { gs: 3, acc: 0.9, sec: 200 } });
    const b = addRun(A0, { lid: 'l6', role: 'g', grade: 'S', acc: 0.95, sec: 200, base: null }).agg;
    const list = guardList([{ id: 'a', a }, { id: 'b', a: b }]);
    expect(list.map((x) => [x.id, x.score])).toEqual([['a', 7], ['b', 4]]);
    expect(guardList([{ id: 'a', a }, { id: 'b', a: b }], 'l6').map((x) => x.id)).toEqual(['b', 'a']); // 같은 S · 같은 정답률 → 시간 짧은 쪽
  });
  it('🌱 도전자 = 기준선(수업 정답률 · 없으면 첫 판) 대비 성장 · 최대 +60 · 80% 승급 뒤 고정', () => {
    let r = addRun(A0, { lid: 'l6', role: 'c', grade: 'C', acc: 0.3, sec: 0, base: 0.4 }); expect(r.agg.c!.l6).toEqual({ base: 0.4, best: 0.3 });
    r = addRun(r.agg, { lid: 'l6', role: 'c', grade: 'B', acc: 0.7, sec: 0, base: 0.4 }); expect(growOf(r.agg.c!.l6!)).toBe(30); expect(r.up).toBe(false);
    r = addRun(r.agg, { lid: 'l6', role: 'c', grade: 'A', acc: 0.85, sec: 0, base: 0.4 }); expect(r.up).toBe(true); expect(growOf(r.agg.c!.l6!)).toBe(45);
    r = addRun(r.agg, { lid: 'l6', role: 'c', grade: 'S', acc: 1, sec: 0, base: 0.4 }); expect(growOf(r.agg.c!.l6!)).toBe(45); // 승급 뒤 안 더함
    const big = addRun(A0, { lid: 'l7', role: 'c', grade: 'C', acc: 0.1, sec: 0, base: null }).agg; // 수업 기록 없음 → 첫 판이 기준선
    expect(growOf(addRun(big, { lid: 'l7', role: 'c', grade: 'S', acc: 0.79, sec: 0, base: null }).agg.c!.l7!)).toBe(60); // 최대 +60
    expect(growList([{ id: 'x', a: r.agg }, { id: 'y', a: big }]).map((x) => x.id)).toEqual(['x', 'y']);
  });
  it('보여 줄 줄 = 위 10 + 내 위아래 2 · 🧪 · 다른 반 거르기', () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}` }));
    const v = viewOf(list, 'p20'); expect(v.pos).toBe(21); expect(v.n).toBe(30); expect(v.rows.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21, 22, 23]);
    expect(rowsOf({ a: { ...A0 }, b: { ...A0, x: true }, c: { ...A0, cls: '1-4' } }, '1-3').map((x) => x.id)).toEqual(['a']);
  });
});
