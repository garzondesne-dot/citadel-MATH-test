import { expect, it } from 'vitest';
import type { LessonPack } from '../src/model/types';
import pack from '../src/packs/set-06.json';
import { groups, total } from '../src/ui/teacher/flow';
it('오늘 흐름 묶음 (6차시)', () => {
  const g = groups(pack as LessonPack, null);
  expect(g.map((x) => x.label)).toEqual(['개념 1~3 · 문제 1~3', '개념 4 · 문제 4~7 ⚔', '👑 형성평가']);
  expect(g.reduce((a, x) => a + x.min, 0)).toBe(total(pack as LessonPack, null));
});
