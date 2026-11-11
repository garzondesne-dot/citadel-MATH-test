import type { Question } from '../model/types';
import type { Rng } from '../engine/rng';
import { comp, inter, range, setStr, sorted, union } from '../engine/sets';

// 6차시 문제 1 (드모르간 · U 의 원소 골라 담기) — 정식 lessons/set-06.js m1Make · m1Retry · KEEP 그대로
const st = (a: number[]) => (a.length ? setStr(a) : '∅');
const C = 'ᶜ';

function pick(head: string, label: string, want: number[], U: number[], sol: string, check: Record<string, unknown>): Question {
  return {
    type: 'multi',
    question: `${head}${label} 의 원소를 모두 고르시오.`,
    options: U.map(String),
    answer: U.map((x, i) => (want.includes(x) ? i : -1)).filter((i) => i >= 0),
    solution: `${sol} → ${label} = ${st(want)}`,
    check: Object.assign({ expr: label }, check),
  };
}

export function m1Make(U: number[], A: number[], B: number[]): Question[] {
  const head = `U = ${st(U)}, A = ${st(A)}, B = ${st(B)} 일 때 `;
  const k = { U, sets: { A, B } };
  const AuB = union(A, B), AnB = inter(A, B), Ac = comp(U, A), Bc = comp(U, B);
  return [
    pick(`(1) ${head}`, `(A ∪ B)${C}`, comp(U, AuB), U, `A ∪ B = ${st(AuB)} 의 바깥`, k),
    pick(`(2) ${head}`, `A${C}`, Ac, U, 'U 에서 A 빼기', k),
    pick(`(2) ${head}`, `B${C}`, Bc, U, 'U 에서 B 빼기', k),
    pick(`(2) ${head}`, `A${C} ∩ B${C}`, inter(Ac, Bc), U, `${st(Ac)} 와 ${st(Bc)} 에 둘 다 있는 것 = (1)과 같다 (드모르간)`, k),
    pick(`(3) ${head}`, `(A ∩ B)${C}`, comp(U, AnB), U, `A ∩ B = ${st(AnB)} 의 바깥`, k),
    pick(`(3) ${head}`, `A${C} ∪ B${C}`, union(Ac, Bc), U, `${st(Ac)} 와 ${st(Bc)} 를 모으기 = (A ∩ B)${C} (드모르간)`, k),
  ];
}

export function m1Retry(r: Rng): Question[] {
  for (;;) {
    const U = range(1, r.int(6, 7));
    const A = sorted(r.shuffle(U.slice()).slice(0, 3));
    const B = sorted(r.shuffle(U.slice()).slice(0, r.int(2, 3)));
    if (inter(A, B).length !== 1 || union(A, B).length >= U.length - 1) continue;
    return m1Make(U, A, B);
  }
}

/** 학습지 ★ 칸만 게임에 (정식 KEEP.m1) */
export const M1_KEEP = [0, 3, 4, 5];
const keep = (arr: Question[]) => M1_KEEP.map((i) => arr[i] as Question);

/** 등록 생성기: 판 0 = 학습지 원문 U={1..6}, A={1,2,3}, B={3,4} · 판 1~ = 새 숫자 */
export const set06m1 = (variant: number, r: Rng): Question[] =>
  keep(variant === 0 ? m1Make(range(1, 6), [1, 2, 3], [3, 4]) : m1Retry(r));
