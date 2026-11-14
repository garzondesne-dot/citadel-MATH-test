// 📝 제출 모드 v2 덧붙임 (2026-11-14 · B 공부 증거 한 줄 · D 모드 바꾼 기록)
import { beforeEach, describe, expect, it } from 'vitest';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const { daySolved, lastWeekOf, logMode, modeLogs, modeSummary, noteSolved, proofLine } = await import('../src/school/study');

const DAY = 864e5, T = Date.UTC(2026, 10, 14, 3, 0); // 2026-11-14 12:00 KST
beforeEach(() => mem.clear());

describe('B 공부 증거 한 줄', () => {
  it('지난주 없음 = 앞만 · 늘면 +k · 같거나 줄면 뒤를 뺌', () => {
    expect(proofLine(12, null)).toBe('오늘 푼 문제 12개');
    expect(proofLine(12, 9)).toBe('오늘 푼 문제 12개 · 지난주보다 +3');
    expect(proofLine(12, 12)).toBe('오늘 푼 문제 12개');
    expect(proofLine(5, 9)).toBe('오늘 푼 문제 5개');
  });
  it('같은 날 수업 여럿 = 더함 · 같은 수업 = 덮어씀 · 지난주 = 7일 전 같은 요일', () => {
    noteSolved('1-3-5', 'A', 7, T); noteSolved('1-3-5', 'A', 9, T); noteSolved('1-3-5', 'B', 4, T + 3600e3);
    expect(daySolved('1-3-5', T)).toBe(13);
    expect(lastWeekOf('1-3-5', T)).toBeNull();
    noteSolved('1-3-5', 'C', 10, T - 7 * DAY);
    expect(lastWeekOf('1-3-5', T)).toBe(10);
    expect(proofLine(daySolved('1-3-5', T)!, lastWeekOf('1-3-5', T))).toBe('오늘 푼 문제 13개 · 지난주보다 +3');
    expect(daySolved('1-3-6', T)).toBeNull(); // 다른 학생 섞이지 않음
  });
});

describe('D 모드 바꾼 기록', () => {
  it('반별: 제출 모드 n명(마지막 방향) · 오늘 바꾼 횟수 · 학생별', () => {
    logMode({ who: '1-3-1', cls: '1-3', num: 1, at: T - DAY, dir: 'g2s', screen: '오늘 할 일' });
    logMode({ who: '1-3-1', cls: '1-3', num: 1, at: T, dir: 's2g', screen: '6차시 · 문제 1' });
    logMode({ who: '1-3-1', cls: '1-3', num: 1, at: T + 60e3, dir: 'g2s', screen: '6차시 · 문제 1' });
    logMode({ who: '1-3-2', cls: '1-3', num: 2, at: T, dir: 'g2s', screen: '오늘 할 일' });
    logMode({ who: '1-3-2', cls: '1-3', num: 2, at: T + 1, dir: 's2g', screen: '오늘 할 일' });
    logMode({ who: '1-4-1', cls: '1-4', num: 1, at: T, dir: 'g2s', screen: '오늘 할 일' });
    expect(modeLogs()).toHaveLength(6);
    const m = modeSummary(modeLogs(), '1-3', T + 120e3);
    expect(m.submitN).toBe(1); expect(m.todayN).toBe(4);
    expect(m.rows.map((r) => `${r.num}:${r.n}/${r.today}/${r.last}`)).toEqual(['1:3/2/submit', '2:2/2/game']);
    expect(modeSummary(modeLogs(), null, T).submitN).toBe(2); // 전체 = 반 섞어서
  });
});
