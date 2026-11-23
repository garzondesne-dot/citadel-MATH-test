// 🐞 11/23 「서술형 기준표 15개에서 안 늘어나」 — 교사 목록 = 코드 + 서버에만 있는 기준표 + 차시 팩 소레이드(기준 글 없음)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { codeRubrics, rubricRows } from '../src/school/photo';
import type { LessonPack } from '../src/model/types';

describe('사진 채점 기준표 목록', () => {
  it('코드 15개 + 서버만 + 팩 소레이드', () => {
    const S = memoryStore();
    S.set('photo_rubric/set-13/m4', { on: true, title: '문제 4 · 최솟값', total: 4, pass: 3 });
    const P = { id: 'ex-14', no: 14, monsters: { m1: { first: [] }, m3: { title: '문제 3', chain: { pool: [] } } } } as unknown as LessonPack;
    const rows = rubricRows(S, [P]);
    const n0 = Object.values(codeRubrics()).reduce((a, r) => a + Object.keys(r).length, 0);
    expect(rows.filter((y) => y.x).length).toBe(n0 + 1); // 서버에만 있는 13차시 = 켤 수 있음
    const r13 = rows.find((y) => y.l === 'set-13' && y.r === 'm4')!; expect(r13.fb?.on).toBe(true); expect(r13.no).toBe(13);
    const r14 = rows.find((y) => y.r === 'm3' && y.no === 14)!; expect(r14.x).toBeNull(); expect(r14.t).toContain('14차시 소레이드');
    expect(rows.some((y) => y.r === 'm1' && y.no === 14)).toBe(false); // 소레이드 아닌 몬스터 = 없음
    expect(rows.map((y) => y.no)).toEqual([...rows.map((y) => y.no)].sort((a, b) => a - b));
  });
});
