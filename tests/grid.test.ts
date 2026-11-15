// 📊 한눈에 표 = 정식 dash.js COLS 그대로 (📜 2026-11-15 머리 🔨): 칸 제목 · ❗ 남은 문제 = 오답노트(허수아비와 같은 셈) · OX · 힌트 · 사다리 · 업적 · 카드 · 정렬 값 · CSV
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { view } from '../src/school/views';
import { fullLesson } from '../src/school/statsCells';
import { noteOf } from '../src/school/dummy';

describe('📊 한눈에 표', () => {
  it('칸 = 정식 COLS · 값 = 서버 기록', () => {
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 5: '가', 6: '나' });
    const rec5 = { no: 6, conc: { c1: [2, 4] }, boss: 4, bossN: 6, bossM: 'ooooxx', mons: { m1: 'o', m2: 'x', m3: 'f', u4: 'x', u5: 'o', u6: 'o', u7: 'n' }, ox: [3, 4], hints: 2, hg: 1, lad: { u4: 1, u5: 4 }, fixed: 3 };
    S.set('records/1-3', { 5: { 'set-06': rec5 } });
    S.set('bonus/1-3', { 5: { 'set-06': { m2: { clear: true, tries: 1 }, boss: { clear: true } } } });
    S.set('cards/1-3', { 5: { sub: true, emp: true } });
    const v = view(S, '1-3', 'grid'), T = v.table!;
    expect(T.sort).toBe(true);
    expect(T.head).toEqual(['번호 · 이름', '6차시', '❗ 남은 문제', '참여', '형성평가', '첫 시도', '⭕ OX', '고친 수', '💡 힌트', '💡 힌트 준', '🪜 사다리', '업적', '던전 도전', '카드', 'Lv']);
    const r5 = T.rows.find((r) => r.pick?.n === 5)!.cells.map((c) => c.t), r6 = T.rows.find((r) => r.pick?.n === 6)!.cells.map((c) => c.t);
    const left = noteOf(fullLesson('set-06')!, rec5, { m2: { clear: true }, boss: { clear: true } }).left;
    expect(left).toBeGreaterThan(0);
    expect(r5.slice(1)).toEqual(['4/6', `❗ ${left}`, '1/1', '67%', '50%', '75%', '3', '2', '1', '4👣 5✍', '1', '1', '2', expect.stringMatching(/^Lv\.\d+$/)]);
    expect(r6[1]).toBe('불참'); expect(r6[2]).toBe('✔');
    expect(v.csv!.rows[0]).toEqual(T.head); expect(v.csv!.rows.length).toBe(3);
  });
});

describe('🏆 랭킹', () => {
  it('판 6개(형성평가 · 첫 시도 · 참여 · 끈기 · 자기주도 · 성장) · 같은 값 = 같은 등수 · TOP 5 · 전체 = 반 대항전', () => {
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 1: '가', 2: '나', 3: '다' });
    S.set('records/1-3', { 1: { 'set-06': { no: 6, conc: { c1: [4, 4] }, boss: 6, bossN: 6, fixed: 2 } }, 2: { 'set-06': { no: 6, conc: { c1: [2, 4] }, boss: 6, bossN: 6 } }, 3: { 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 3, bossN: 6, fixed: 5 } } });
    const v = view(S, '1-3', 'rank');
    expect(v.boards!.map((b) => b.title)).toEqual(['🎯 형성평가', '✅ 첫 시도 정답률', '🙋 참여', '🔁 끈기 TOP 5', '🏆 자기주도 TOP 5', '⭐ 성장 TOP 5']);
    expect(v.boards![0]!.rows.map((r) => [r.rk, r.nm, r.val])).toEqual([[1, '1번 가', '100% (6/6)'], [1, '2번 나', '100% (6/6)'], [3, '3번 다', '50% (3/6)']]);
    expect(v.boards![3]!.rows[0]).toMatchObject({ rk: 1, nm: '3번 다', val: '5개' });
    expect(v.table).toBeUndefined();
    const all = view(S, '전체', 'rank'); expect(all.tableTitle).toMatch(/반 대항전/); expect(all.table!.head).toEqual(['반', '인원', '형성평가', '첫 시도', '참여', '평균 EXP']);
  });
});
