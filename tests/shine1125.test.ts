// 🌟 나의 빛나는 순위 (📜 2026-11-25 · 머리 🔨): 7갈래 셈 · 사다리 3단 · 12/5 켜짐 · 반 비교(선생님 폰 A 안) 띠 글자
import { describe, expect, it } from 'vitest';
import { SHINE_CATS, classMarks, monthDone, shineBand, shineOn, shineScores, weekGain, type ShineScores } from '../src/school/shine';
import type { TitleData } from '../src/model/titles';

const T = (d: string) => Date.parse(`${d}T03:00:00Z`); // KST 정오
const NOW = T('2026-12-08');
const rec = (at: number, mons: Record<string, string>, bossM = '') => ({ at, code: 'x', no: 7, mons, ...(bossM ? { bossM } : {}) });

describe('🌟 빛나는 순위', () => {
  it('갈래 = 7 · 도움 없음', () => {
    expect(SHINE_CATS.map((c) => c.k).sort()).toEqual(['exact', 'explore', 'finish', 'grit', 'grow', 'steady', 'write']);
    expect(SHINE_CATS.some((c) => c.name === '도움')).toBe(false);
  });
  it('7갈래 점수 = 내 기록에서만', () => {
    const d: TitleData = {
      records: {
        a: rec(T('2026-11-03'), { m1: 'o', m2: 'x', m3: 'f', m4: 'x' }, 'ox-'), // 첫 주 첫 시도 1/4
        b: rec(T('2026-12-01'), { m1: 'o', m2: 'o', m3: 'f' }, 'oxo'), //  마지막 주 2/3
      },
      bonus: { 'set-07': { m1: { clear: true, at: T('2026-11-20') }, m2: { at: T('2026-11-20') } }, 'eval-1': { q01: { clear: true, at: T('2026-11-22'), ph2: true } }, review: { prep_x: { m: { at: T('2026-11-29') } } } } as never,
    };
    const s = shineScores(d, { ult_a_v: true, other: 1 });
    expect(s).toEqual({ grow: 42, grit: 2, steady: 2, explore: 1, exact: 3, write: 2, finish: 1 });
  });
  it('사다리: ① 선생님 칸 → ② 지난주보다 → ③ 이번 달 몬스터 · 0 = 기다리는 중', () => {
    const empty: TitleData = {};
    expect(shineBand(empty, NOW)).toMatchObject({ text: '🙋 첫 몬스터를 기다리는 중', step: 3 });
    const old: TitleData = { records: { a: rec(T('2026-12-01'), { m1: 'o', m2: 'f', m3: 'x' }) } };
    expect(weekGain(old, NOW)).toBeNull(); // 12/1 = 지난 7일 밖
    expect(shineBand(old, NOW).text).toBe('🙋 이번 달 끝까지 해낸 몬스터 2마리');
    expect(monthDone(old, T('2027-01-02'))).toBe(0);
    const up: TitleData = { records: { a: rec(T('2026-11-28'), { m1: 'f' }), b: rec(T('2026-12-05'), { m1: 'f', m2: 'f', m3: 'f' }) } };
    expect(shineBand(up, NOW)).toMatchObject({ text: '📈 지난주의 나보다 끈기 +2', step: 2 });
    const mk: TitleData = { ...up, bonus: { shine: { cat: 'steady', tier: 'top3', at: 1 } } as never };
    expect(shineBand(mk, NOW)).toMatchObject({ text: '🔥 우리 반 꾸준함 TOP 3', step: 1 });
    expect(shineBand({ bonus: { shine: { cat: 'grit', tier: 'p30' } } as never }, NOW).text).toBe('✨ 우리 반 끈기 상위 30%');
    expect(shineBand({ bonus: { shine: { cat: 'help', tier: 'top3' } } as never }, NOW).step).toBe(3); // 모르는 갈래 = 무시
    for (const t of [shineBand(up, NOW).text, shineBand(mk, NOW).text]) expect(t).not.toMatch(/\d+등|\d+위/); // 등수 숫자 없음
  });
  it('켜짐 = 12/5 00:00 KST 부터 · 🧪 = 날짜 무시', () => {
    expect(shineOn(Date.parse('2026-12-04T14:59:00Z'), false)).toBe(false);
    expect(shineOn(Date.parse('2026-12-04T15:00:00Z'), false)).toBe(true);
    expect(shineOn(Date.parse('2026-11-25T00:00:00Z'), true)).toBe(true);
  });
  it('(A 안) 반 띠: 상위 30% 안 가장 좋은 갈래 하나 · 0점 · 30% 밖 = 칸 없음', () => {
    const z = (o: Partial<ShineScores>): ShineScores => ({ grow: 0, grit: 0, steady: 0, explore: 0, exact: 0, write: 0, finish: 0, ...o });
    const all: Record<string, ShineScores> = {};
    for (let i = 1; i <= 20; i++) all[String(i)] = z({ grit: i, exact: 21 - i });
    all['21'] = z({});
    const m = classMarks(all, 5);
    expect(m['20']).toEqual({ cat: 'grit', tier: 'top3', at: 5 });
    expect(m['1']).toEqual({ cat: 'exact', tier: 'top3', at: 5 });
    expect(m['16']?.tier).toBe('p30'); // grit 위 4명 = 19% < 30%
    expect(m['10']).toBeUndefined(); // 어느 갈래도 30% 밖
    expect(m['21']).toBeUndefined();
    expect(classMarks({ a: z({ grit: 1 }), b: z({}) }, 1)).toEqual({}); // 3명 미만 = 없음
  });
});
