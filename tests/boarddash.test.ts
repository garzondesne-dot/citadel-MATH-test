// 📊 #56 대시보드 게시판 던전: 판 · 이긴 판 · 차시별 최고 별 · 첫 시도 · 활약 · 약한 차시 · 대시보드 보기 · 엑셀 시트
import { describe, expect, it } from 'vitest';
import { boardStu, weakNos } from '../src/school/boardDash';

const noOf = (lid: string) => Number(/(\d+)$/.exec(lid)?.[1]) || 0;
describe('📋 학생 게시판 기록', () => {
  it('ATB 판 = first · 옛 팀전 = right · 별 = 기록과 boardStar 중 큰 것 · 활약 합', () => {
    const b = boardStu({
      a: { at: 1, lid: 'set-06', no: 6, win: true, right: 9, total: 10, first: 7, stars: 2, merit: 30, atb: true, acts: { block: 2, rescue: 1, cut: 1, brk: 3 } },
      b: { at: 2, lid: 'set-06', no: 6, win: false, right: 4, total: 10, first: 3, stars: 0, merit: 5, atb: true, acts: { block: 1 } },
      c: { at: 3, lid: 'set-07', no: 7, clear: true, right: 8, total: 10 }, // 옛 팀전
      d: null,
    }, { 'set-06': 3, 'set-09': 1 }, noOf);
    expect(b).toMatchObject({ runs: 3, wins: 2, merit: 35, first: 18, firstTotal: 30, acts: { block: 3, rescue: 1, cut: 1, brk: 3 } });
    expect(b.stars).toEqual({ 6: 3, 9: 1 });
    expect(b.starSum).toBe(4);
    expect(b.byNo).toEqual({ 6: [10, 20], 7: [8, 10] });
  });
  it('약한 차시 = 반 전체 첫 시도 낮은 순', () => {
    const x = boardStu({ a: { at: 1, no: 6, first: 2, total: 10, atb: true }, b: { at: 1, no: 7, first: 9, total: 10, atb: true } }, null, noOf);
    const y = boardStu({ a: { at: 1, no: 6, first: 4, total: 10, atb: true } }, null, noOf);
    expect(weakNos([x, y]).map((w) => [w.no, w.pct])).toEqual([[6, 30], [7, 90]]);
  });
  it('🛡 #101 「실드 깨기」 칸 = 새 판 shd + 옛 판 brk 합', () => {
    const b = boardStu({ a: { at: 1, no: 6, atb: true, acts: { block: 0, rescue: 0, cut: 0, brk: 0, shd: 3 } }, b: { at: 2, no: 6, atb: true, acts: { block: 0, rescue: 0, cut: 0, brk: 2 } } } as never, null, noOf);
    expect(b.acts.brk).toBe(5);
  });
  it('기록 없음 = 0', () => { expect(boardStu(null, null, noOf)).toMatchObject({ runs: 0, wins: 0, starSum: 0, firstTotal: 0 }); });
});

import { memoryStore } from '../src/store/device';
import { view } from '../src/school/views';
import { addCastles } from '../src/school/castles.svelte';
import type { CastlePack } from '../src/school/castle';
describe('🏰 대시보드 성채 던전 (#56 덧)', () => {
  it('층마다 깬 방 / 열린 방 · 👑 · ✅ · 반 평균', () => {
    const P = { kind: 'castle', id: 'eval-9', floor: 9, title: '시험 층', unit: 'u', bossPct: 60, rooms: [{ id: 'a', no: 1, title: 'A', sprite: 'x:0', vers: [] }, { id: 'b', no: 1, title: 'B', sprite: 'x:0', vers: [] }, { id: 'k', no: 1, title: 'K', sprite: 'x:0', boss: true, vers: [] }] } as unknown as CastlePack;
    addCastles([P]);
    const S = memoryStore(); S.set('held/1-1', { 'set-02': true });
    const v0 = view(S, '1-1', 'castle'), st = v0.table!.rows[1]!.pick!;
    S.set(`bonus/1-1/${st.n}/eval-9`, { a: { clear: true }, b: { clear: true }, k: { clear: true } });
    const v = view(S, '1-1', 'castle'), row = v.table!.rows.find((r) => r.pick?.n === st.n)!;
    expect(v.table!.head).toContain('9층 시험 층');
    expect(row.cells[1]!.t).toBe('2/2 👑 ✅');
    expect(v.kpis![0]!.sub).toMatch(/👑 1명 · ✅ 1명/);
  });
});
