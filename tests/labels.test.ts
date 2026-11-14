// 🔢 소문제 번호가 겹치지 않음 (🐞 머리 🔨 2026-11-14 「(1)(2)(3)(3)」 · 모든 차시 · 판 0~3)
import { describe, expect, it } from 'vitest';
import { PACKS } from '../src/engine/packs';
import { items } from '../src/engine/lessons';

describe('소문제 번호', () => {
  it('모든 차시 몬스터 · 판 0~3 = 같은 번호 두 번 없음', () => {
    const bad: string[] = [];
    for (const L of PACKS) for (const mid of Object.keys(L.monsters)) for (let v = 0; v < 4; v++) {
      const labs = items(L, mid, 'T|u', v).map((q) => /^(\(\d+\)(?: [①-⑨])?)\s/.exec(q.question)?.[1]).filter(Boolean) as string[];
      if (new Set(labs).size !== labs.length) bad.push(`${L.id} ${mid} 판${v}: ${labs.join(' ')}`);
    }
    expect(bad).toEqual([]);
  });
  it('6차시 문제 1 = (1) (2) (3) ① (3) ②', () => {
    const L = PACKS.find((p) => p.no === 6)!;
    expect(items(L, 'm1', 'T|u', 0).map((q) => q.question.slice(0, 7))).toEqual(['(1) U =', '(2) U =', '(3) ① U', '(3) ② U']);
  });
});
