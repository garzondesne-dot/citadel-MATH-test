// 🐞 교사 화면 레벨 = 학생 캠프 레벨 (정식 grow.js level 하나 · 2026-11-15)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { level } from '../src/model/hero';
import { realClass } from '../src/school/dash';
describe('📊 대시보드 Lv', () => {
  it('정식 경계값 (40 · 100 · 180) 과 같음', () => { expect([0, 39, 40, 99, 100, 179, 180, 987].map((x) => level(x).lv)).toEqual([1, 1, 2, 2, 3, 3, 4, 9]); });
  it('교사 학생 탭 Lv = 학생 캠프 Lv', () => {
    const S: Store = { ...memoryStore(), kind: 'memory' };
    S.set('school/roster/1-2', { 3: '가나다' }); S.set('xp/1-2/3', { total: 987 });
    const st = realClass(S, '1-2').studs.find((x) => x.n === 3);
    expect(st?.lv).toBe(level(987).lv);
  });
});
