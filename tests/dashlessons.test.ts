// 🐞 2026-11-15 「대시보드에 학생들 6차시까지밖에 기록이 없어」 — 8 · 9차시(set-08 · 09) 기록이 「0차시」로 맨 앞에 묻히지 않고 차시 순서 · 이름으로 보임
import { describe, expect, it } from 'vitest';
import { build } from '../src/school/dash';
const r = (no: number) => ({ conc: { a: [1, 2] }, names: {}, boss: 1, bossN: 2, no }) as never;
describe('📊 대시보드 차시 목록', () => {
  it('과목 목록(2~7) 밖 차시도 번호 · 이름 · 순서대로', () => {
    const out = build('1-3', { 1: 'x' }, { 1: { 'set-09': r(9), 'set-06': r(6), 'set-08': r(8) } }, { 1: 0 }, { 1: { days: [], solves: 0 } as never }, () => false);
    expect(out.held.map((h) => h.no)).toEqual([6, 8, 9]);
    expect(out.held.every((h) => h.title && !/^set-/.test(h.title))).toBe(true);
    expect(out.studs[0]!.went).toBe(3);
  });
});
