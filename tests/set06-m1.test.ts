// 6차시 문제 1 독립 검산 — 정식 tests/lesson6.test.js 의 m1 부분을 그대로 옮김
// (1) 첫 시도 = 학습지 ★ 칸 정답 (2) 재도전 300 시드 × 3판: 문제 글에서 U · A · B 를 읽어 원소마다 정의대로 따로 계산
// 차시 팩 · 생성기의 계산 결과를 쓰지 않는다
import { describe, expect, it } from 'vitest';
import type { LessonPack, Question } from '../src/model/types';
import pack from '../src/packs/set-06-m1.json';
import { items, validate } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';

const L = pack as LessonPack;
type Multi = Extract<Question, { type: 'multi' }>;

// ── 독립 계산 도구 (정식 시험과 같은 글) ──
const parseSet = (s: string) => (s.trim() === '∅' ? [] : s.replace(/[{}]/g, '').split(',').map((t) => t.trim()).filter(Boolean).map(Number));
const readU = (q: string) => parseSet((/U = (\{[^}]*\})/.exec(q) as RegExpExecArray)[1] as string);
const readSet = (q: string, n: string) => parseSet((new RegExp(`${n} = (\\{[^}]*\\})`).exec(q) as RegExpExecArray)[1] as string);
const chosen = (q: Multi) => q.answer.map((i) => Number(q.options[i]));
function evalExpr(expr: string, U: number[], A: number[], B: number[]) {
  const inA = (x: number) => A.includes(x), inB = (x: number) => B.includes(x);
  const f = ({
    '(A ∪ B)ᶜ': (x: number) => !(inA(x) || inB(x)), 'Aᶜ': (x: number) => !inA(x), 'Bᶜ': (x: number) => !inB(x),
    'Aᶜ ∩ Bᶜ': (x: number) => !inA(x) && !inB(x), '(A ∩ B)ᶜ': (x: number) => !(inA(x) && inB(x)), 'Aᶜ ∪ Bᶜ': (x: number) => !inA(x) || !inB(x),
  } as Record<string, (x: number) => boolean>)[expr];
  if (!f) throw new Error('모르는 식 ' + expr);
  return U.filter(f);
}

function verify(q: Question, tag: string) {
  expect(q.type, tag).toBe('multi');
  const m = q as Multi;
  const U = readU(m.question), A = readSet(m.question, 'A'), B = readSet(m.question, 'B'), expr = String(m.check?.expr);
  expect(chosen(m), `${tag} ${expr}`).toEqual(evalExpr(expr, U, A, B));
  expect(m.options.map(Number), `${tag}: 보기는 U 의 원소`).toEqual(U);
  // 정식 gradeOk: 정답은 맞음 · 빈 답은 틀림
  expect(grade(m, m.answer), `${tag}: 정답 채점`).toBe(true);
  expect(grade(m, []), `${tag}: 오답이 정답 처리됨`).toBe(false);
}

describe('6차시 문제 1 (드모르간)', () => {
  it('차시 팩이 올바름', () => {
    expect(validate(L)).toEqual([]);
  });

  it('첫 시도 = 학습지 ★ 칸 (A∪B)ᶜ · Aᶜ∩Bᶜ · (A∩B)ᶜ · Aᶜ∪Bᶜ', () => {
    const first = items(L, 'm1', 'seed', 0);
    const ans = first.map((q) => `{${chosen(q as Multi).join(',')}}`);
    expect(ans).toEqual(['{5,6}', '{5,6}', '{1,2,4,5,6}', '{1,2,4,5,6}']);
    first.forEach((q, i) => verify(q, `m1#0.${i}`));
  });

  it('재도전 300 시드 × 3판 독립 검산', () => {
    let n = 0;
    for (let s = 0; s < 300; s++) for (let a = 1; a <= 3; a++) items(L, 'm1', `s${s}`, a).forEach((q, i) => { n++; verify(q, `m1#${s}.${a}.${i}`); });
    expect(n).toBe(300 * 3 * 4);
  });

  it('같은 시드 = 같은 문제 · 다른 시드는 대체로 다른 문제', () => {
    expect(JSON.stringify(items(L, 'm1', 'ABCD|u1', 1))).toBe(JSON.stringify(items(L, 'm1', 'ABCD|u1', 1)));
    const texts = new Set<string>();
    for (let s = 0; s < 100; s++) texts.add((items(L, 'm1', `d${s}`, 1)[0] as Question).question);
    expect(texts.size).toBeGreaterThanOrEqual(20);
  });
});
