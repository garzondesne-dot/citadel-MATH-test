import { describe, expect, it } from 'vitest';
import { resvDays, resvLabel } from '../src/board/resv';
const KST = (s: string) => Date.parse(`${s}+09:00`);
describe('📅 #73 예약 시각 칩', () => {
  it('평일 16:00 ~ 21:30 · 주말 9:00 ~ 21:30 · 30분 · 7일', () => {
    const d = resvDays(KST('2026-11-20T10:00:00')); // 금
    expect(d.length).toBe(7);
    expect(d[0]!.label).toBe('오늘'); expect(d[0]!.times[0]!.label).toBe('오후 4:00'); expect(d[0]!.times.at(-1)!.label).toBe('오후 9:30'); expect(d[0]!.times.length).toBe(12);
    expect(d[1]!.label).toBe('내일'); expect(d[1]!.times[0]!.label).toBe('오전 9:00'); expect(d[1]!.times.length).toBe(26);
  });
  it('지난 시각 · 5분 안 = 빼기 · 오늘 끝났으면 오늘 칸 없음', () => {
    expect(resvDays(KST('2026-11-20T19:58:00'))[0]!.times[0]!.label).toBe('오후 8:30');
    expect(resvDays(KST('2026-11-20T21:40:00'))[0]!.label).toBe('내일');
  });
  it('글 꼴 「11/22(일) 오후 8:00」 (2026-11-22 = 일요일)', () => { expect(resvLabel(KST('2026-11-22T20:00:00'))).toBe('11/22(일) 오후 8:00'); });
});
import { sweepOf, RESV, resvWaiting, type Post } from '../src/board/team';
describe('📅 #73 예약 판 정리', () => {
  const t0 = Date.parse('2026-11-22T20:00:00+09:00');
  const p = (when: number, seen = 0): Post => ({ pid: 'p', lesson: 'x', no: 9, at: t0 - 86400e3, host: 'a', phase: 'wait', when, act: t0 - 86400e3, mem: { a: { uid: 'a', cls: '1-1', num: 1, hero: 0, role: 'c', why: '', at: t0 - 86400e3, seen } as never } });
  it('시각 전 = 하루 전에 만들어도 해산 안 함 · 목록에만', () => { expect(sweepOf(p(t0), t0 - 3600e3)).toBeNull(); expect(resvWaiting(p(t0), t0 - 1)).toBe(true); });
  it('시각 지나 아무도 안 옴 = +30분까지 기다림 · 그 뒤 해산', () => { expect(sweepOf(p(t0), t0 + 10 * 60e3)).toBeNull(); expect(sweepOf(p(t0), t0 + RESV.dropAfter)?.kind).toBe('dissolve'); });
});
