// ⚔ 기말 대비 기간 (📜 2026-11-25 · 머리 🔨): 시험 날짜 · KST 날짜 셈 · 기간 15일 · 띠 글
import { describe, expect, it } from 'vitest';
import { EXAM_DEFAULT, EXAM_PATH, bandText, daysLeft, examDateOf, inPeriod, kstDate } from '../src/school/examEvent';

const at = (iso: string) => Date.parse(iso); // UTC 시각
const S = (v: unknown) => ({ get: <T,>(p: string) => (p === EXAM_PATH ? (v as T) : (null as T)) });
describe('⚔ 기말 대비 기간', () => {
  it('KST 자정 경계: UTC 11/24 15:00 = KST 11/25 0시', () => {
    expect(kstDate(at('2026-11-24T14:59:59Z'))).toBe('2026-11-24');
    expect(kstDate(at('2026-11-24T15:00:00Z'))).toBe('2026-11-25');
  });
  it('남은 날 · 기간 = 15일 전 ~ 시험 날 · 다음 날 사라짐', () => {
    expect(daysLeft('2026-12-10', at('2026-11-24T15:00:00Z'))).toBe(15);
    expect(inPeriod('2026-12-10', at('2026-11-24T14:59:00Z'))).toBe(false); // KST 11/24 = D-16
    expect(inPeriod('2026-12-10', at('2026-11-24T15:00:00Z'))).toBe(true);
    expect(bandText('2026-12-10', at('2026-12-09T15:00:00Z'))).toMatch(/D-DAY/); // KST 12/10 0시
    expect(bandText('2026-12-10', at('2026-12-09T14:59:00Z'))).toMatch(/D-1$/);
    expect(bandText('2026-12-10', at('2026-12-10T15:00:00Z'))).toBe(''); // KST 12/11
  });
  it('시험 날짜: 서버 값 · off = 끔 · 없으면 우리 학교 12/10 · 학교판 = 비어 있음 · 이상한 값 = 처음 값', () => {
    expect(examDateOf(S('2026-12-12'), false)).toBe('2026-12-12');
    expect(examDateOf(S('off'), false)).toBe('');
    expect(examDateOf(S(null), false)).toBe(EXAM_DEFAULT);
    expect(examDateOf(S(null), true)).toBe('');
    expect(examDateOf(S('12/10'), false)).toBe(EXAM_DEFAULT);
  });
});
