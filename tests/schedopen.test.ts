// 📅 시간표 켜도 수동 열기 · ⏳ 보스 타임바 = 그 반 시간표 교시 안이면 그 교시 끝 · 아니면 50분 (📜 2026-11-15)
import { describe, expect, it } from 'vitest';
import { classPeriodEnd, kst } from '../src/school/bells';
const mon1010 = Date.UTC(2026, 10, 16, 1, 10); // 2026-11-16 (월) 10:10 KST = 2교시(10:00~10:50)
describe('⏳ 보스 타임바 끝', () => {
  it('그 반 시간표 교시 안 = 그 교시 끝 · 다른 반 · 빈 교시 · 수업 밖 = null(50분)', () => {
    expect(kst(mon1010).dow).toBe(1);
    const W = { 1: { 2: '1-3' } };
    const end = classPeriodEnd(W, '1-3', mon1010)!; expect(kst(end).hm).toBe(10 * 60 + 50);
    expect(classPeriodEnd(W, '1-4', mon1010)).toBeNull();
    expect(classPeriodEnd({}, '1-3', mon1010)).toBeNull();
    expect(classPeriodEnd(W, '1-3', Date.UTC(2026, 10, 16, 10, 0))).toBeNull(); // 19:00 KST
  });
});
