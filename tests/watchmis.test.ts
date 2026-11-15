// 👀 주의 학생 · 🔎 오개념 = 정식 dash.js 그대로 (📜 2026-11-15 머리 🔨 (c)): 5 기준 · 👍 없어요 · 오개념 = 수업 + 🏰 성채(eval-) · 🎯 허수아비 빼기
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { view } from '../src/school/views';
import { MIS } from '../src/school/dash';

const [M1, M2] = Object.keys(MIS) as [string, string];
const srv = () => ({ ...memoryStore(), kind: 'server' as const });
describe('👀 주의 학생 · 🔎 오개념', () => {
  it('5 기준: 최근 불참 · 형성평가 50↓ · 첫 시도 50↓ · 허수아비 · 성채 0회 · 🔍 고침 패턴', () => {
    const S = srv();
    S.set('roster/1-3', { 5: '가', 6: '나', 7: '다' });
    S.set('records/1-3', {
      5: { 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 1, bossN: 4 } },
      6: { 'set-05': { no: 5, conc: { c1: [1, 4] }, boss: 6, bossN: 6, fixed: 4 }, 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 6, bossN: 6, fixed: 3 } },
      7: { 'set-05': { no: 5, conc: { c1: [4, 4] }, boss: 4, bossN: 4 }, 'set-06': { no: 6, conc: { c1: [4, 4] }, boss: 4, bossN: 4 } },
    });
    S.set('bonus/1-3', { 6: { 'eval-1': { r1: { tries: 2 } } }, 7: { 'set-06': { u1: { tries: 1 } } } });
    const v = view(S, '1-3', 'watch'), by = Object.fromEntries(v.list!.map((x) => [x.nm, x.sub]));
    expect(Object.keys(by).sort()).toEqual(['가', '나']);
    expect(by['가']).toMatch(/최근 불참: 5차시/); expect(by['가']).toMatch(/형성평가 평균 25%/); expect(by['가']).toMatch(/첫 시도 정답률 25%/); expect(by['가']).toMatch(/허수아비 · 성채 0회/);
    expect(by['나']).toMatch(/🔍 고침 패턴 확인 \(형성평가 100% · 레이드 첫 시도 25% · 고친 7개\)/); expect(by['나']).not.toMatch(/0회|불참/);
    S.set('records/1-3/5', null); S.set('records/1-3/6', null); S.set('roster/1-3', { 7: '다' });
    const w = view(S, '1-3', 'watch'); expect(w.list).toEqual([]); expect(w.note).toBe('👍 지금 눈에 띄는 학생이 없어요.');
  });
  it('오개념 = 수업 기록 + 성채(eval-) · 허수아비는 빼기 · 바로잡음 % · 학생별 태그', () => {
    const S = srv();
    S.set('roster/1-3', { 5: '가', 6: '나' });
    S.set('records/1-3', { 5: { 'set-06': { no: 6, conc: { c1: [1, 2] }, boss: 1, bossN: 2, mis: { [M1]: [3, 1] } } }, 6: { 'set-06': { no: 6, conc: { c1: [1, 2] }, boss: 1, bossN: 2 } } });
    S.set('bonus/1-3', { 5: { 'eval-1': { r1: { tries: 1, mis: { [M1]: [1, 1] } } } }, 6: { 'set-06': { u1: { tries: 1, mis: { [M2]: [5, 0] } } } } });
    const v = view(S, '1-3', 'mis');
    expect(v.table!.rows.map((r) => r.cells.map((c) => c.t))).toEqual([[M1, MIS[M1]!.name, '4', '1명', '50%']]);
    expect(v.list!.map((x) => [x.nm, x.sub])).toEqual([['가', `${M1} 4 · ✔2`]]);
    const e = view(srv(), '1-3', 'mis'); expect(e.note).toBe('아직 쌓인 오개념 기록이 없어요.');
  });
});
