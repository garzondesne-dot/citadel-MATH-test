import { beforeEach, describe, expect, it } from 'vitest';
import { testLoad, testSaveRun, testStar, testWho } from '../src/board/testRecs';
const mem: Record<string, string> = {};
beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } }; });
describe('🧪 #86 테스트 계정 게시판 ⭐ = 이 기기', () => {
  it('누구 = 반_번호 · 교사(반 없음) = teacher', () => { expect(testWho('1-6', 3)).toBe('1-6_3'); expect(testWho('', 0)).toBe('teacher'); });
  it('판 기록 · 최고 별 · 새 별 수 (학생과 같은 셈)', () => {
    const w = 'teacher';
    expect(testSaveRun(w, 'p1', { at: 1, lid: 'set-06', stars: 2 })).toBe(2);
    expect(testSaveRun(w, 'p2', { at: 2, lid: 'set-06', stars: 1 })).toBe(0);
    expect(testSaveRun(w, 'p3', { at: 3, lid: 'set-06', stars: 3 })).toBe(1);
    expect(testStar(w, 'set-06')).toBe(3); expect(Object.keys(testLoad(w).recs)).toHaveLength(3); expect(testStar('1-6_1', 'set-06')).toBe(0);
  });
});
