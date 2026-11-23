// 🐞 11/23 「서술형 기준표 15개에서 안 늘어나」 — 교사 목록 = 코드 + 서버에만 있는 기준표 + 차시 팩 소레이드(기준 글 없음) · 18 · 19차시 = 가짜(아직 없는 차시)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { codeRubrics, rubricRows } from '../src/school/photo';
import type { LessonPack } from '../src/model/types';

describe('사진 채점 기준표 목록', () => {
  it('코드 기준표 + 서버만 + 팩 소레이드', () => {
    const S = memoryStore();
    S.set('photo_rubric/set-18/m2', { on: true, title: '문제 2', total: 4, pass: 3 });
    const P = { id: 'ex-19', no: 19, monsters: { m1: { first: [] }, m3: { title: '문제 3', chain: { pool: [] } } } } as unknown as LessonPack;
    const rows = rubricRows(S, [P]);
    const n0 = Object.values(codeRubrics()).reduce((a, r) => a + Object.keys(r).length, 0);
    expect(rows.filter((y) => y.x).length).toBe(n0 + 1); // 서버에만 있는 18차시 = 켤 수 있음
    const r18 = rows.find((y) => y.l === 'set-18' && y.r === 'm2')!; expect(r18.fb?.on).toBe(true); expect(r18.no).toBe(18);
    const r19 = rows.find((y) => y.r === 'm3' && y.no === 19)!; expect(r19.x).toBeNull(); expect(r19.t).toContain('19차시 소레이드');
    expect(rows.some((y) => y.r === 'm1' && y.no === 19)).toBe(false); // 소레이드 아닌 몬스터 = 없음
    expect(rows.map((y) => y.no)).toEqual([...rows.map((y) => y.no)].sort((a, b) => a - b));
  });
});
