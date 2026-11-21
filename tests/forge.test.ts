// ⚒ 모루 연성법 (#148): 정식 tests/unit.test.js 원문을 정식 lessons/unit-set.js 원문(과목 팩 forge)으로 그대로 돌림 · 채점 = 우리 엔진 grade
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { SUBJ } from '../src/engine/subject';
import { grade } from '../src/engine/grade';
import FUNC from '../src/subjects/common-math2/forge/unit-func.json';

describe('정식 모루 시험 그대로', () => {
  it('카드 54 · 레시피 · 배포 차시 · 엄격 순서 · 실수 메시지 · 마력 예제 (tests/unit.test.js)', () => {
    const U0 = SUBJ.forge!.unit, setOnly = { ...U0, CARDS: U0.CARDS.filter((c) => (c.unit ?? 'set') === 'set'), MATS: U0.MATS.slice(0, 13), OPS: U0.OPS.slice(0, 24), MISTAKES: Object.fromEntries(Object.entries(U0.MISTAKES).filter(([k]) => !(k in FUNC.MISTAKES))) }; // 📈 #58 함수 단원은 아래 따로 (정식 시험 = 집합 54장 그대로)
    const DS = { Unit: setOnly, Quiz: { grade: (q: never, g: never) => grade(q, g) } }, bad: string[] = [], out: string[] = [];
    const log = (...a: unknown[]) => { const t = a.join(' '); (/FAIL|실패/.test(t) ? bad : out).push(t); };
    runInNewContext(readFileSync(new URL('./official/forge-unit.test.js', import.meta.url), 'utf8'), { require: (m: string) => (m === './load' ? () => DS : require(m)), console: { log, error: log }, process: { exit: (c: number) => { if (c) bad.push(`exit ${c}`); } }, Object, Array, Math, JSON, Set, String, Number });
    expect(bad).toEqual([]);
    expect(out.join('\n')).toMatch(/OK: 집합 단원 연성법 — 카드 54장/);
  });
  it('재료 13 · 연산 24 · 카드 54 · 카드 그림 칸 = 54장 모두', () => {
    const U = SUBJ.forge!.unit, K = SUBJ.forge!.kit, set = U.CARDS.filter((c) => c.unit === 'set');
    expect([U.MATS.slice(0, 13).length, U.OPS.slice(0, 24).length, set.length]).toEqual([13, 24, 54]);
    expect(set.every((c) => K.arts.map[c.id] != null)).toBe(true);
  });
});

// 📈 #58 함수 단원 (FORGE-FUNC-v1 · 23장 · 레시피 29 · 재료 8 · 새 연산 7)
describe('모루 함수 단원', () => {
  const U = SUBJ.forge!.unit, F = U.CARDS.filter((c) => c.unit === 'func');
  const mat = (x: string) => (x.startsWith('card:') ? x : x);
  it('카드 23 (14 = 6 · 15 = 6 · 16 = 5 · 17 = 6) · 재료 21 · 연산 31 · 단원 탭 2', () => {
    expect(F.length).toBe(23);
    expect([14, 15, 16, 17].map((n) => F.filter((c) => c.no === n).length)).toEqual([6, 6, 5, 6]);
    expect([U.MATS.length, U.OPS.length]).toEqual([21, 31]);
    expect(U.UNITS?.map((u) => u.id)).toEqual(['set', 'func']);
  });
  it('모든 레시피 = 그 카드가 나옴 (엄격 순서 · 재료 카드는 같은 차시이거나 앞)', () => {
    let n = 0;
    for (const c of F) for (const r of U.recipes(c)) {
      n++;
      const op = U.opOf(r.op)!; const [l, rr] = op.unary ? [r.in[0]!, null] : [r.in[0]!, r.in[1]!];
      const got = U.forge(r.op, mat(l), rr ? mat(rr) : null, 17);
      expect(got.ok && got.card.id, `${c.name} ${r.op} ${r.in}`).toBe(c.id);
      for (const x of r.in) if (x.startsWith('card:')) expect(U.card(x.slice(5))!.no).toBeLessThanOrEqual(c.no);
      if (r.ordered && !op.unary && r.in[0] !== r.in[1]) { const back = U.forge(r.op, r.in[1]!, r.in[0]!, 17); expect(back.ok && back.card.id === c.id, `${c.name} 순서 바꿈`).toBe(false); }
    }
    expect(n).toBe(25); // 카드 23 + 다른 레시피 2 (합성함수의 값 · 역함수와 합성)
  });
  it('실수 안내 17 = 정답 레시피와 안 겹침 · 메시지 나옴', () => {
    const keys = Object.keys(U.MISTAKES).filter((k) => ['then|SY,SX', 'app|x,f', 'inv|f', 'inv|card:func', 'o|card:compose,h'].includes(k));
    expect(keys.length).toBe(5);
    expect((U.forge('then', 'SY', 'SX', 17) as { msg: string }).msg).toMatch(/정의역이 왼쪽/);
    expect((U.forge('inv', 'f', null, 17) as { msg: string }).msg).toMatch(/일대일대응/);
  });
  it('차시 전엔 연산 · 카드 잠김 (∘ = 16 · ⁻¹ = 17)', () => {
    expect(U.forge('o', 'g', 'f', 15).ok).toBe(false);
    expect(U.forge('o', 'g', 'f', 16).ok).toBe(true);
    expect(U.forge('inv', 'card:bij', null, 16).ok).toBe(false);
  });
  it('예제 정답 (계산 문항 독립 검산)', () => {
    const ex = (id: string) => (U.card(id) as unknown as { ex: { type: string; answer?: unknown; answerIndex?: number; choices?: string[] } }).ex;
    const f = (x: number) => 3 * x - 4; expect(String(ex('fval').answer)).toBe(String(f(5)));
    expect(String(ex('compval').answer)).toBe(String(2 * (1 + 3)));
    expect(String(ex('invval').answer)).toBe(String((10 - 6) / 2));
    expect(String(ex('ident').answer)).toBe('7'); expect(String(ex('const').answer)).toBe('6');
    for (const c of F) { const e = ex(c.id); expect(e, c.name).toBeTruthy(); if (e.type === 'choice') expect(e.choices![e.answerIndex!], c.name).toBeTruthy(); }
  });
});
