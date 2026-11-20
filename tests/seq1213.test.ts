// 🔁 한 교시에 12 → 13 차례로 (📜 2026-11-20 · 1-4 = 11/24 화 2교시 · 1-2 = 화 4교시): 두 번째 방도 ⏳ 마감 = 그 교시 끝 (새 50분 아님)
//   goTo: 새 방은 deadline 이 비어 있음 → 수업 시작 때 classPeriodEnd(시간표, 반, 지금) → 시간표 스위치 켬 · 그 교시가 그 반이면 교시 끝
import { describe, expect, it } from 'vitest';
import { classPeriodEnd } from '../src/school/bells';

const WEEK = [null, [null, '1-5', null, '1-3', '1-4'], [null, '1-3', '1-4', null, '1-2', null, '1-1'], { 3: '1-3', 5: '1-4' }, [null, '1-5', '1-1', null, '1-2'], [null, '1-2', null, '1-5', null, '1-1']] as unknown as Record<string, Record<string, string>>;
const at = (hm: string) => Date.parse(`2026-11-24T${hm}:00+09:00`); // 화요일
describe('두 번째 수업 ⏳ 마감', () => {
  it('1-4 화 2교시: 10:02 시작(12) · 10:27 시작(13) 모두 10:50', () => {
    expect(classPeriodEnd(WEEK, '1-4', at('10:02'))).toBe(at('10:50'));
    expect(classPeriodEnd(WEEK, '1-4', at('10:27'))).toBe(at('10:50'));
  });
  it('1-2 화 4교시: 12:31 시작(13) = 12:50', () => expect(classPeriodEnd(WEEK, '1-2', at('12:31'))).toBe(at('12:50')));
  it('교시 밖 · 다른 반 칸 = null → 지금 + 50분 (스위치 끔과 같음)', () => {
    expect(classPeriodEnd(WEEK, '1-2', at('10:27'))).toBeNull();
    expect(classPeriodEnd(WEEK, '1-4', at('13:20'))).toBeNull();
  });
});
