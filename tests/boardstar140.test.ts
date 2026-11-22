// 🐞 #140 지도 ⭐ · 칭호 · 기록 표 · 대시보드 = 옛 판 등급(S/A/B) + 새 전투 stars 둘 다 · 차시마다 최고 · 옛 별 안 깎음
import { describe, expect, it } from 'vitest';
import { recMark, recStar, starsByNo, starTotal } from '../src/board/goals';
import { atbRec } from '../src/board/atbLink';
import { boardStu } from '../src/school/boardDash';
import type { LessonPack } from '../src/model/types';

const L = { id: 'set-06', no: 6 } as unknown as LessonPack;
const end = (stars: number, win = true) => ({ role: 'dps', win, sec: 300, right: 5, total: 6, first: 4, stars, merit: [], gem: [] }) as never;

describe('#140 게시판 별', () => {
  it('새 전투 기록(atbRec) 별 = 결과 화면 별 = 지도 칸 별', () => {
    for (const s of [0, 1, 2, 3]) {
      const r = atbRec({ L, n: 1 }, end(s), 1, s, 0);
      expect(recStar(r)).toBe(s);
      expect(starsByNo({ a: r })[6] ?? 0).toBe(s);
    }
  });
  it('옛 판 등급 별은 그대로 · 새 전투가 낮아도 안 깎임 · 높으면 올라감', () => {
    const old = { at: 1, no: 6, lid: 'set-06', grade: 'A', clear: true };
    expect(starsByNo({ o: old })[6]).toBe(2);
    expect(starsByNo({ o: old, n: atbRec({ L, n: 1 }, end(1), 2, 1, 0) })[6]).toBe(2);
    expect(starsByNo({ o: old, n: atbRec({ L, n: 1 }, end(3), 2, 3, 0) })[6]).toBe(3);
    expect(starsByNo({ o: { ...old, clear: false } })[6] ?? 0).toBe(0);
    expect(starTotal(starsByNo({ o: old }), [{ no: 6 }, { no: 7 }])).toBe(2);
  });
  it('기록 표 글 = 옛 판 등급 · 새 전투 ⭐n', () => {
    expect(recMark({ grade: 'S' })).toBe('S');
    expect(recMark(atbRec({ L, n: 1 }, end(2), 1, 2, 0))).toBe('⭐2');
  });
  it('교사 대시보드도 같은 셈 (옛 등급 + 새 stars + boardStar)', () => {
    const o = boardStu({ o: { at: 1, no: 6, grade: 'S', clear: true }, n: atbRec({ L, n: 1 }, end(1), 2, 1, 0) as never }, { 'set-07': 2 }, (lid) => (lid === 'set-07' ? 7 : 6));
    expect(o.stars).toEqual({ 6: 3, 7: 2 });
    expect(o.starSum).toBe(5);
  });
});
