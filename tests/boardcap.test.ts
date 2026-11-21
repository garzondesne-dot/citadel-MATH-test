import { describe, expect, it } from 'vitest';
import { BOARD_DAY, boardDayUsed, boardTake } from '../src/board/board';
describe('📜 게시판 💎 하루 200 (선생님 2026-11-21)', () => {
  const log = { board_20261121_a: { g: 150 }, rescue_20261121_0: { g: 10 }, rescued_20261121_0: { g: 3 }, board_20261120_x: { g: 190 }, keyp_set09: { g: 1 }, castle_x: { g: 99 }, war_1: { g: 300 } };
  it('그날 게시판 줄만 셈 (판 · 구조 · 구조 받음) · 다른 날 · 수업 · 성채 · 토벌 상 = 안 셈', () => { expect(BOARD_DAY).toBe(200); expect(boardDayUsed(log, '20261121')).toBe(163); expect(boardDayUsed(log, '20261120')).toBe(190); });
  it('남은 몫까지만 · 다 차면 0 · 이번 판에서 이미 셈한 것(extra) 빼기', () => {
    expect(boardTake(log, '20261121', 30)).toBe(30); expect(boardTake(log, '20261121', 60)).toBe(37);
    expect(boardTake(log, '20261121', 60, 37)).toBe(0); expect(boardTake({}, '20261122', 250)).toBe(200);
  });
});
