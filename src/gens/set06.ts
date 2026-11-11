import type { Question } from '../model/types';
import { makeRng, type Rng } from '../engine/rng';
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

// ── 공용 문항 만들기 (정식 set-06.js ch · nq · multi) ─────────
const ch = (question: string, choices: string[], ans: string, solution: string, check: Record<string, unknown>): Question =>
  ({ type: 'choice', question, choices, answerIndex: choices.indexOf(ans), answer: ans, solution, check });
const nq = (question: string, answer: number, solution: string, check: Record<string, unknown>): Question =>
  ({ type: 'number', question, answer, solution, check });
const show = (x: number | string) => String(x).replace(/^-/, '−');
const multi = (question: string, opts: (number | string)[], want: (number | string)[], solution: string, check: Record<string, unknown>): Question => {
  const o = opts.map(show), w = want.map(show);
  return { type: 'multi', question, options: o, answer: o.map((x, i) => (w.includes(x) ? i : -1)).filter((i) => i >= 0), solution, check };
};
const divs = (n: number) => range(1, n).filter((d) => n % d === 0);
const mults = (k: number, N: number) => range(1, N).filter((x) => x % k === 0);
const minus = (A: number[], B: number[]) => sorted(A.filter((x) => !B.includes(x)));

// ── 문제 2: 여집합 · 차집합의 원소의 개수 ─────────────────────
export function m2Make(u: number, a: number, b: number, ab: number): Question[] {
  const head = `n(U) = ${u}, n(A) = ${a}, n(B) = ${b}, n(A ∩ B) = ${ab} 일 때 `, k = { n: { U: u, A: a, B: b, AB: ab } };
  const aub = a + b - ab;
  return [
    nq(`(1) ${head}n(A${C}) = ?`, u - a, `n(U) − n(A) = ${u} − ${a}`, Object.assign({ q: 'Ac' }, k)),
    nq(`(2) ${head}n(A − B) = ?`, a - ab, `n(A) − n(A ∩ B) = ${a} − ${ab}`, Object.assign({ q: 'A-B' }, k)),
    nq(`(3) ${head}n(B − A) = ?`, b - ab, `n(B) − n(A ∩ B) = ${b} − ${ab}`, Object.assign({ q: 'B-A' }, k)),
    nq(`(4) ${head}n(A ∪ B) = ?`, aub, `${a} + ${b} − ${ab}`, Object.assign({ q: 'AuB' }, k)),
    nq(`(5) ${head}n(A${C} ∩ B${C}) = n((A ∪ B)${C}) = ?`, u - aub, `드모르간 → n(U) − n(A ∪ B) = ${u} − ${aub}`, Object.assign({ q: 'AcnBc' }, k)),
  ];
}
export function m2Retry(r: Rng): Question[] {
  for (;;) {
    const u = r.int(25, 40), a = r.int(8, 16), b = r.int(8, 16), ab = r.int(2, 6);
    if (ab >= a || ab >= b || a + b - ab >= u || a === b || (u === 30 && a === 12 && b === 15 && ab === 5)) continue; // 학습지 그대로 빼기
    return m2Make(u, a, b, ab);
  }
}

// ── 문제 3: 생활 속 문제 (둘 다 칸부터) ──────────────────────
export const CLUBS: [string, string][] = [['축구', '밴드'], ['미술', '음악'], ['농구', '독서'], ['댄스', '코딩'], ['요리', '사진']];
export function m3Make(T: number, x: number, y: number, both: number, [p, q]: [string, string]): Question[] {
  const head = `1학년 ${T}명 중 ${p} 동아리 ${x}명, ${q} 동아리 ${y}명, 둘 다 ${both}명이다. `, k = { T, x, y, both };
  return [
    nq(`(1) ${head}${p} 또는 ${q} 동아리 학생 수는?`, x + y - both, `${x} + ${y} − ${both}`, Object.assign({ q: 'or' }, k)),
    nq(`(2) ${head}${p}만 하는 학생 수는?`, x - both, `${x} − ${both}`, Object.assign({ q: 'only' }, k)),
    nq(`(3) ${head}둘 다 하지 않는 학생 수는?`, T - (x + y - both), `${T} − (${x} + ${y} − ${both})`, Object.assign({ q: 'none' }, k)),
  ];
}
export function m3Retry(r: Rng): Question[] {
  for (;;) {
    const T = r.int(30, 40), x = r.int(10, 20), y = r.int(8, 16), both = r.int(2, 7);
    if (both >= x || both >= y || x + y - both >= T) continue;
    return m3Make(T, x, y, both, r.pick(CLUBS));
  }
}

const M2_KEEP = [0, 1, 4], M3_KEEP = [0, 2];
export const set06m2 = (variant: number, r: Rng): Question[] => {
  const all = variant === 0 ? m2Make(30, 12, 15, 5) : m2Retry(r);
  return M2_KEEP.map((i) => all[i] as Question);
};
export const set06m3 = (variant: number, r: Rng): Question[] => {
  const all = variant === 0 ? m3Make(40, 18, 12, 5, CLUBS[0] as [string, string]) : m3Retry(r);
  return M3_KEEP.map((i) => all[i] as Question);
};

// ── 형성평가 6문항 (보스) — 시도 0 = 학습지(1 · 2) · 교과서 원문(3~6) · 시도 1~3 = 같은 꼴 새 값 ──
const FLIP: Record<string, string> = { '∪': '∩', '∩': '∪' };
const LET: [string, string][] = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['X', 'Y']];
const fix = (q: Question, no: number): Question => Object.assign(q, { question: `${no}. ${q.question}` });
const chS = (question: string, wrongs: string[], ans: string, solution: string, check: Record<string, unknown>, r: Rng) =>
  ch(question, r.shuffle([ans, ...wrongs]), ans, solution, check);
function dm1(X: string, Y: string, op: string, form: string, r?: Rng): Question {
  const f = FLIP[op] as string;
  const q = form === 'out' ? `(${X} ${op} ${Y})${C} = ${X}${C} ( ) ${Y}${C}` : `${X}${C} ${op} ${Y}${C} = (${X} ( ) ${Y})${C}`;
  const sol = form === 'out' ? `(${X} ${op} ${Y})${C} = ${X}${C} ${f} ${Y}${C}` : `(${X} ${f} ${Y})${C} = ${X}${C} ${op} ${Y}${C}`;
  const solution = `드모르간: 괄호를 풀면 ᶜ 이 각각 붙고 ∪ ↔ ∩ → ${sol}`, check = { dm: q, form, op, sets: [X, Y] };
  return fix(r ? chS(`${q} 의 ( ) 에 알맞은 것은?`, [op], f, solution, check, r) : ch(`${q} 의 ( ) 에 알맞은 것은?`, ['∪', '∩'], f, solution, check), 1);
}
const nAc = (u: number, x: number, s: string) => nq(`2. n(U) = ${u}, n(${s}) = ${x} 일 때 n(${s}${C}) = ?`, u - x, `n(U) − n(${s}) = ${u} − ${x}`, { u, a: x, set: s });
const q04 = (a: number, b: number, u: number) => nq(`3. 두 집합 A 와 B 에 대하여 n(A) = ${a}, n(B) = ${b}, n(A ∪ B) = ${u} 일 때, n(A ∩ B) 는?`, a + b - u,
  `n(A ∩ B) = n(A) + n(B) − n(A ∪ B) = ${a} + ${b} − ${u} = ${a + b - u}`, { a, b, u });
const q05 = (A: number[], n: number) => {
  const U = range(1, 10), B = divs(n), want = minus(A, B);
  return multi(`4. 전체집합 U = {1, 2, 3, …, 10}의 두 부분집합 A = ${st(A)}, B = {x | x는 ${n}의 약수}에 대하여 A − B 의 원소를 모두 고르시오.`, U, want,
    `B = ${st(B)} → A 에서 B 에 있는 것 빼기 → A − B = ${st(want)}`, { A, n, expr: 'A − B' });
};
const q06 = (m: number, A: number[], r: Rng) => {
  const U = range(1, m), Cc = minus(U, A), want = [[], [Cc[0] as number], [Cc[1] as number], Cc];
  const traps = [[A[0], Cc[0]], [A[1]], [A[2], Cc[1]], [Cc[0], A[A.length - 1]]].map((x) => sorted(x as number[]));
  return multi(`5. 전체집합 U = ${st(U)}의 부분집합 중에서 집합 A = ${st(A)}와 서로소인 집합을 모두 고르시오.`, r.shuffle([...want, ...traps]).map(st), want.map(st),
    `A 와 겹치지 않으려면 U − A = ${st(Cc)} 의 부분집합 → ${want.map(st).join(', ')} (4개)`, { U, A });
};
const q10 = (N: number, k: number, m: number) => {
  const A = mults(k, N), B = divs(m), n = N - union(A, B).length;
  return nq(`6. 전체집합 U = {x | x는 ${N} 이하의 자연수}의 두 부분집합 A = {x | x는 ${k}의 배수}, B = {x | x는 ${m}의 약수}에 대하여 n(A${C} ∩ B${C}) 는?`, n,
    `A${C} ∩ B${C} = (A ∪ B)${C} (드모르간) → n(A ∪ B) = ${A.length} + ${B.length} − ${inter(A, B).length} = ${union(A, B).length} → ${N} − ${union(A, B).length} = ${n}`, { N, k, m });
};

let BOSS1: Question[] | null = null;
/** 학습지 · 교과서 원문 6문항 (한 번만 만듦 · 정식 BOSS1) */
export const boss1 = (): Question[] =>
  (BOSS1 ||= [dm1('A', 'B', '∪', 'out'), nAc(20, 7, 'A'), q04(18, 23, 30), q05([1, 5, 9, 10], 10), q06(5, [1, 2, 4], makeRng('s6|boss|06')), q10(30, 6, 24)]);

export function bossMake(i: number, r: Rng): Question {
  for (;;) {
    if (i === 0) {
      const [X, Y] = r.pick(LET), op = r.pick(['∪', '∩']), form = r.pick(['out', 'out', 'in']);
      if (form === 'out' && op === '∪' && X === 'A' && Y === 'B') continue; // 학습지 그대로
      return dm1(X, Y, op, form, r);
    }
    if (i === 1) {
      const u = r.int(15, 30), s = r.pick(['A', 'A', 'B']), x = r.int(4, u - 4);
      if (u === 20 && x === 7) continue;
      return nAc(u, x, s);
    }
    if (i === 2) {
      const a = r.int(10, 25), b = r.int(10, 25), k = r.int(2, Math.min(a, b) - 2);
      if (a === 18 && b === 23 && k === 11) continue;
      return q04(a, b, a + b - k);
    }
    if (i === 3) {
      const n = r.pick([6, 8, 10]), A = sorted(r.shuffle(range(1, 10)).slice(0, 4)), B = divs(n);
      if (!inter(A, B).length || !minus(A, B).length || !minus(B, A).length || (n === 10 && A.join() === '1,5,9,10')) continue;
      return q05(A, n);
    }
    if (i === 4) {
      const m = r.int(5, 7), A = sorted(r.shuffle(range(1, m)).slice(0, m - 2));
      if (m === 5 && A.join() === '1,2,4') continue;
      return q06(m, A, r);
    }
    if (i === 5) {
      const N = r.pick([30, 36, 40, 48, 50]), k = r.int(4, 9), m = r.pick([24, 30, 32, 36, 40, 48].filter((x) => x <= N));
      if (inter(mults(k, N), divs(m)).length < 2 || (N === 30 && k === 6 && m === 24)) continue;
      return q10(N, k, m);
    }
    return boss1()[i] as Question;
  }
}

/** 등록 보스 생성기: 시도 0 = 원문 · 1~ = 새 값 (정식 L.boss.make) */
export const set06boss = (i: number, attempt: number, r: Rng): Question => (attempt ? bossMake(i, r) : (boss1()[i] as Question));
