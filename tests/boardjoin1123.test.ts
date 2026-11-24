import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { joinList, type Post, type Member } from '../src/board/team';

// 👥 📜 11/23 팀 참가 (예약 모집 없앰 · 암호 = 모집 때 선택)
const T = 1_800_000_000_000;
const m = (uid: string): Member => ({ uid, cls: '1-3', num: 1, nick: uid, hero: 0, role: 'c', why: '', at: T });
const post = (o: Partial<Post>): Post => ({ pid: 'p', lesson: 'set-08', no: 8, at: T, host: 'a', phase: 'wait', mem: { a: m('a') }, ...o });
const src = fs.readFileSync('src/ui/board/Board.svelte', 'utf8');

describe('👥 팀 참가 목록', () => {
  it('여러 차시가 한 목록 · 새 팀 위 · 혼자 판 · 진행 중 · 옛 예약 글 빠짐', () => {
    const L = joinList([
      post({ pid: 'a', no: 8, at: T }), post({ pid: 'b', lesson: 'set-11', no: 11, at: T + 9 }),
      post({ pid: 'c', solo: true, at: T + 5 }), post({ pid: 'd', phase: 'play', at: T + 6 }), post({ pid: 'e', when: T + 1e6, at: T + 7 }),
    ]);
    expect(L.map((p) => p.pid)).toEqual(['b', 'a']);
  });
  it('🔒 암호 팀도 목록에 · 표시 남음', () => { expect(joinList([post({ pid: 'x', lk: true })])[0]!.lk).toBe(true); });
  it('빈 목록 = 안내 한 줄', () => {
    expect(joinList([])).toEqual([]);
    expect(src).toContain('지금 열린 팀이 없어요'); expect(src).toContain('➕ 내가 모집하기'); // 📜 11/24 출정 시안
  });
  it('화면: 예약 모집 없음 · 팀 참가 단추 · 모집 시트에 🔒 암호 걸기(기본 끔) · 진도 전 안내', () => {
    expect(src).not.toMatch(/board-resv|joinResv|openResv|예약 모집 글/);
    expect(src).toContain('data-k="board-tab-join"'); expect(src).toContain('data-k="board-tab-make"'); expect(src).toContain("goTab = $state<'join' | 'make'>('join')"); // 📜 11/24 팀 참가 = 왼쪽 · 기본
    expect(src).toContain('data-k="board-lock-opt"');
    expect(src).toContain('lockOn = false; pin = \'\'; sheet = \'post\'');
    expect(src).toContain('안 배움'); expect(src).toContain('꽉 참');
    expect(src).toContain('createLockedPost(S, L1');
  });
});
