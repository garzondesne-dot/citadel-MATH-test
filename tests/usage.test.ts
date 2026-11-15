// 📈 활용 추이 = 정식 usage.js 그대로 (+ 「그 전 7일」 늘 0 버그 고침): 주별 합계 · 학생별 · 기록 전 ≈ 추정 · 날짜(KST)
import { describe, expect, it } from 'vitest';
import { addDays, backfill, day, monday, perStudent, weekly, type Days } from '../src/school/usage';

const T = Date.UTC(2026, 10, 15, 3, 0); // 2026-11-15 12:00 KST (일)
describe('📈 활용 추이', () => {
  it('날짜 = KST · 월요일 · 날 더하기', () => {
    expect(day(T)).toBe('20261115'); expect(day(Date.UTC(2026, 10, 14, 16, 0))).toBe('20261115'); // UTC 16시 = KST 다음 날 01시
    expect(monday('20261115')).toBe('20261109'); expect(addDays('20261101', -1)).toBe('20261031');
  });
  it('주별 = 활동 학생 · 풀이 · 접속 · 고침 · 참여 · 추정 표시', () => {
    const days: Days = { '20261110': { 1: { r: 2, v: 1 }, 2: { v: 1 } }, '20261114': { 1: { c: 1, f: 1, j: 1 } }, '20261103': { 3: { r: 1, est: 1 } } };
    const w = weekly(days, 2, '20261115');
    expect(w.map((x) => x.week)).toEqual(['20261102', '20261109']);
    expect(w[1]).toMatchObject({ active: 1, solves: 4, visits: 2, fixes: 1, joins: 1, est: false });
    expect(w[0]).toMatchObject({ active: 1, solves: 1, est: true });
  });
  it('학생별 = 최근 7일 · 그 전 7일(정식 버그 고침) · 마지막 활동일', () => {
    const days: Days = { '20261115': { 1: { r: 2 } }, '20261105': { 1: { c: 3 } }, '20261101': { 1: { v: 1 } } };
    expect(perStudent(days, '20261115')['1']).toEqual({ now: 2, prev: 3, last: '20261115', pf: 0 });
  });
  it('기록 전 ≈ 추정 = 💎 log(복습 → 고침 · 성채 → c) + 허수아비 · 성채 방 시각', () => {
    const est = backfill({ 1: { log: { review_20261110_0: { at: T }, room_eval_q1: { at: T, why: '성채 방 처치' } } } }, { 2: { 'set-02': { m1: { at: T } }, 'eval-1': { q1: { at: T } }, review: { x: { at: T } } } });
    expect(est['20261115']).toEqual({ 1: { r: 0, c: 1, f: 1, est: 1 }, 2: { r: 1, c: 1, f: 0, est: 1 } });
  });
});

describe('📈 활용 추이 보기 (서버)', () => {
  it('KPI · 막대 3개(≈ 추정 줄무늬) · 학생별 표 · CSV · 기록 시작 줄', async () => {
    const { memoryStore } = await import('../src/store/device');
    const { view } = await import('../src/school/views');
    const S = { ...memoryStore(), kind: 'server' as const, now: () => T };
    const cls = '1-3', sc0 = (await import('../src/school/views')).scope(S, cls);
    const n1 = sc0.studs[0]!.n, n2 = sc0.studs[1]!.n;
    S.set(`act/${cls}/20261114/${n1}`, { r: 2, v: 1 });
    S.set(`act/${cls}/20261106/${n1}`, { c: 1 });
    S.set(`act/${cls}/20261113/${n2}`, { v: 1, j: 1 });
    const v = view(S, cls, 'use');
    expect(v.note).toMatch(/기록 시작 11\/6/);
    expect(v.kpis!.map((k) => k.big)).toEqual([`1 / ${sc0.studs.length}명`, '2회', expect.stringMatching(/회$/), `2 / ${sc0.studs.length}명`]);
    expect(v.kpis![1]!.sub).toMatch(/그 전 7일 1/);
    expect(v.bars!.map((b) => b.title.slice(3))).toHaveLength(3);
    expect(v.bars![1]!.vals.at(-1)).toBe(2);
    expect(v.table!.rows[0]!.cells.slice(2, 5).map((c) => c.t)).toEqual(['2', '1', '▲ 1']);
    expect(v.csv!.rows[0]).toContain('최근7일 수업밖 풀이');
    expect(v.csv!.rows.length).toBe(sc0.studs.length + 1);
  });
});

describe('📈 반 비교 「수업 밖 7일 활동」 = 활용 추이 기록', () => {
  it('최근 7일에 풀이가 있는 학생 수', async () => {
    const { memoryStore } = await import('../src/store/device');
    const { classData } = await import('../src/school/dash');
    const S = { ...memoryStore(), kind: 'server' as const, now: () => T };
    S.set('roster/1-3', { 1: '가', 2: '나', 3: '다' });
    S.set('act/1-3/20261114/1', { r: 2 }); S.set('act/1-3/20261105/2', { c: 1 }); S.set('act/1-3/20261115/3', { v: 1 });
    const st = classData(S, '1-3').studs;
    expect(st.map((s) => [s.extra.days.slice(7).reduce((a, b) => a + b, 0), s.extra.days.slice(0, 7).reduce((a, b) => a + b, 0)])).toEqual([[2, 0], [0, 1], [0, 0]]);
  });
});
