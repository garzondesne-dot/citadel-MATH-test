// ⚒ 모루 연성법 (#148): 정식 tests/unit.test.js 원문을 정식 lessons/unit-set.js 원문(과목 팩 forge)으로 그대로 돌림 · 채점 = 우리 엔진 grade
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { SUBJ } from '../src/engine/subject';
import { grade } from '../src/engine/grade';

describe('정식 모루 시험 그대로', () => {
  it('카드 54 · 레시피 · 배포 차시 · 엄격 순서 · 실수 메시지 · 마력 예제 (tests/unit.test.js)', () => {
    const DS = { Unit: SUBJ.forge!.unit, Quiz: { grade: (q: never, g: never) => grade(q, g) } }, bad: string[] = [], out: string[] = [];
    const log = (...a: unknown[]) => { const t = a.join(' '); (/FAIL|실패/.test(t) ? bad : out).push(t); };
    runInNewContext(readFileSync(new URL('./official/forge-unit.test.js', import.meta.url), 'utf8'), { require: (m: string) => (m === './load' ? () => DS : require(m)), console: { log, error: log }, process: { exit: (c: number) => { if (c) bad.push(`exit ${c}`); } }, Object, Array, Math, JSON, Set, String, Number });
    expect(bad).toEqual([]);
    expect(out.join('\n')).toMatch(/OK: 집합 단원 연성법 — 카드 54장/);
  });
  it('재료 13 · 연산 24 · 카드 54 · 카드 그림 칸 = 54장 모두', () => {
    const U = SUBJ.forge!.unit, K = SUBJ.forge!.kit;
    expect([U.MATS.length, U.OPS.length, U.CARDS.length]).toEqual([13, 24, 54]);
    expect(U.CARDS.every((c) => K.arts.map[c.id] != null)).toBe(true);
  });
});
