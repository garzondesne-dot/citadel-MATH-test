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

// ══ 문제 4~7 (교과서 78~79쪽 07 · 08 · 11 · 12) — 정식 set-06.js 그대로 ══════════════
const sup = (s: number | string) => String(s).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)] as string);
const lastDigit = (n: number) => Number(String(n).slice(-1));
const gwaN = (n: number) => ([2, 4, 5, 9].includes(lastDigit(n)) ? `${n} 와` : `${n} 과`);
const lcmOf = (x: number, y: number) => { let a = x, b = y; while (b) [a, b] = [b, a % b]; return (x / a) * y; };
const igaN = (n: number) => ([2, 4, 5, 9].includes(lastDigit(n)) ? `${n}가` : `${n}이`);
const ro = (n: number) => ([0, 3, 6].includes(lastDigit(n)) ? `${n}으로` : `${n}로`);
const fill = (r: Rng, want: number[], pool: number[], k: number) => sorted([...new Set([...want, ...r.shuffle(pool.filter((x) => !want.includes(x))).slice(0, k - want.length)])]);

// 한 문항 꼴 (옛 방 · 성채용 · 정식 MONSTERS.u4~u7.make)
function u4Make(p: number, q: number, N: number): Question[] {
  const A = divs(p), B = mults(q, N), D = minus(B, A);
  return [nq(`두 집합 A = {x | x는 ${p}의 약수}, B = {x | x는 ${N} 이하의 ${q}의 배수}에 대하여 A ∩ X = ∅ 과 B ∪ X = B 를 만족시키는 집합 X 의 개수는? (풀이는 학습지에)`,
    2 ** D.length, `A = ${st(A)}, B = ${st(B)} → B ∪ X = B 이면 X ⊂ B, A ∩ X = ∅ 이면 X 는 A 와 서로소 → X ⊂ B − A = ${st(D)} → 2${sup(D.length)} = ${2 ** D.length}개`, { p, q, N })];
}
function u5Make(c: number, b: number, d: number, r: Rng): Question[] {
  const want = [1 - c, 0, b].sort((x, y) => x - y);
  const opts = fill(r, [...want, d], range(-5, 9), 9);
  return [multi(`두 집합 A = {x² + ${c}x, ${b}, ${d}}, B = {x, ${d}}에 대하여 A ∩ B = B 를 만족시키는 정수 x 를 모두 고르시오.`, opts, want,
    `A ∩ B = B → B ⊂ A → x 는 A 의 원소 (x ≠ ${d}) → x = ${b} 또는 x = x² + ${c}x → x² + ${c - 1 === 1 ? '' : c - 1}x = 0 → x = 0, ${show(1 - c)} → ${want.map(show).join(', ')}`, { c, b, d })];
}
function u6Make(T: number, a: number, b: number): Question[] {
  const head = `어느 자전거 동아리 회원 ${T}명을 대상으로 두 코스 A와 B를 다녀온 경험이 있는 회원 수를 조사하였더니 A 코스는 ${a}명이고 B 코스는 ${b}명이었다. 두 코스 A와 B를 모두 다녀온 회원 수의`;
  const sol = `n(A ∩ B) = ${a} + ${b} − n(A ∪ B), ${Math.max(a, b)} ≤ n(A ∪ B) ≤ ${T}`;
  return [nq(`${head} 최댓값은?`, Math.min(a, b), `${sol} → n(A ∪ B) = ${Math.max(a, b)} 일 때 (B 가 A 안에 쏙) 최대 ${Math.min(a, b)}`, { T, a, b, ask: 'max' }),
    nq(`${head} 최솟값은?`, a + b - T, `${sol} → n(A ∪ B) = ${T} 일 때 (전체) 최소 ${a + b - T}`, { T, a, b, ask: 'min' })];
}
function u7Make(N: number, p: number, q: number, rem: number): Question[] {
  const bad = range(1, N - 1).filter((x) => x % p === 0 && x % q === rem), n = N - 1 - bad.length;
  return [nq(`${N} 미만의 자연수 중에서 ${p}의 배수가 아니거나 ${ro(q)} 나누었을 때의 나머지가 ${igaN(rem)} 아닌 자연수의 개수는?`, n,
    `A = ${p}의 배수, B = ${ro(q)} 나눈 나머지가 ${rem} → 「A 가 아니거나 B 가 아닌」 = Aᶜ ∪ Bᶜ = (A ∩ B)ᶜ (드모르간) → A ∩ B = ${st(bad)} → ${N - 1} − ${bad.length} = ${n}`, { N, p, q, rem })];
}
/** 연습 판 숫자 (…Retry 와 같은 조건 · 교과서 숫자 빼기) */
const RETRY_ARGS: Record<string, (r: Rng) => number[]> = {
  u4: (r) => { for (;;) { const p = r.pick([4, 6, 8, 9, 10, 12]), q = r.pick([2, 3, 4]), N = q * r.int(4, 7), B = mults(q, N), D = minus(B, divs(p)); if (p === 8 && q === 4 && N === 20) continue; if (inter(B, divs(p)).length && D.length >= 2 && D.length <= 5) return [p, q, N]; } },
  u5: (r) => { for (;;) { const c = r.int(2, 5), b = r.int(2, 6), d = r.int(6, 9); if (b === d || b * b + c * b === d || (c === 2 && b === 4 && d === 6)) continue; return [c, b, d]; } },
  u6: (r) => { for (;;) { const T = r.int(30, 50), a = r.int(Math.ceil(T / 2), T - 3), b = r.int(Math.ceil(T / 3), T - 5); if (T === 40 && a === 28 && b === 21) continue; if (a + b > T + 2 && b < a) return [T, a, b]; } },
  u7: (r) => { for (;;) { const N = r.pick([50, 60, 80, 100]), p = r.int(3, 8), q = r.int(3, 6), rem = r.int(1, q - 1); if (N === 100 && p === 7 && q === 5 && rem === 3) continue; const k = range(1, N - 1).filter((x) => x % p === 0 && x % q === rem).length; if (k >= 2 && k <= 6) return [N, p, q, rem]; } },
};
// 정식 u4Retry 등은 RETRY_ARGS 와 같은 조건으로 같은 난수를 같은 순서로 씀 → 한 문항 꼴 재도전도 같음
const MAKE_U: Record<string, (args: number[], r: Rng) => Question[]> = {
  u4: (a) => u4Make(a[0] as number, a[1] as number, a[2] as number),
  u5: (a, r) => u5Make(a[0] as number, a[1] as number, a[2] as number, r),
  u6: (a) => u6Make(a[0] as number, a[1] as number, a[2] as number),
  u7: (a) => u7Make(a[0] as number, a[1] as number, a[2] as number, a[3] as number),
};
export const unitMake = (id: 'u4' | 'u5' | 'u6' | 'u7') => (variant: number, r: Rng): Question[] =>
  variant === 0 ? (id === 'u5' ? u5Make(2, 4, 6, makeRng('s6|u5')) : (MAKE_U[id] as (a: number[], r: Rng) => Question[])(BOOK[id] as number[], r))
    : (MAKE_U[id] as (a: number[], r: Rng) => Question[])((RETRY_ARGS[id] as (r: Rng) => number[])(r), r);

// ── ⚔ 소레이드 징검다리 (정식 #18 · 단계 say = 「📜 나의 풀이」 한 줄 · why = 💡 근거 줄) ──
type SQ = Question & { say?: string; why?: { pre: string; post: string; choices: string[]; answer: number; text: string }; groups?: { label: string; n: number }[] };
const sayOf = (q: Question, say: string): SQ => Object.assign(q, { say });
const whyOf = (q: Question, pre: string, choices: string[], post: string): SQ => Object.assign(q, { why: { pre, post, choices, answer: 0, text: `${pre} ${choices[0]}${post}` } });
const multi2 = (question: string, parts: { label: string; opts: number[]; want: number[] }[], solution: string, check: Record<string, unknown>): Question => {
  const options: string[] = [], answer: number[] = [], groups: { label: string; n: number }[] = [];
  parts.forEach(({ label, opts, want }) => { const o = opts.map(show), w = want.map(show), base = options.length; o.forEach((x, i) => { options.push(x); if (w.includes(x)) answer.push(base + i); }); groups.push({ label, n: o.length }); });
  return { type: 'multi', question, options, answer, groups, solution, check } as Question;
};
function u4Chain(p: number, q: number, N: number, r: Rng): Question[] {
  const A = divs(p), B = mults(q, N), D = minus(B, A), U = sorted([...new Set([...A, ...B])]), n = D.length;
  const aOpts = fill(r, A, range(1, Math.max(12, p + 3)), Math.min(10, A.length + 4)), bOpts = fill(r, B, range(1, N + 4), Math.min(12, B.length + 4));
  const s3 = sayOf(multi(`A ∩ X = ∅ 이고 B ∪ X = B 일 때, X 에 들어갈 수 있는 원소를 모두 고르시오.`, U.map(show), D, `X ⊂ B 이고 A 와 서로소 → B − A = ${st(D)}`, { step: 3 }), `따라서 X ⊂ B − A = ${st(D)} 이다.`);
  const boss = sayOf(nq(`집합 X 의 개수는?`, 2 ** n, `B − A 의 원소 ${n}개로 만들 수 있는 부분집합 → 2${sup(n)} = ${2 ** n}`, { step: 4 }), `그러므로 집합 X 의 개수는 2${sup(n)} = ${2 ** n} 이다.`);
  boss.why = { pre: `∵ 원소가 ${n}개인 집합의 부분집합의 개수는`, post: '', choices: [`2ⁿ 꼴(예: 2${sup(n)})`, `n²(예: ${n}²)`, `2n(예: ${2 * n})`], answer: 0, text: `∵ 원소가 ${n}개인 집합의 부분집합의 개수는 2${sup(n)}` };
  return [
    sayOf(multi2('A 와 B 의 원소를 각각 모두 고르시오.', [{ label: `A = {x | x는 ${p}의 약수}`, opts: aOpts, want: A }, { label: `B = {x | x는 ${N} 이하의 ${q}의 배수}`, opts: bOpts, want: B }], `${p}의 약수 → ${st(A)} · ${N} 이하의 ${q}의 배수 → ${st(B)}`, { p, q, N, step: 1 }), `A = ${st(A)}, B = ${st(B)} 이다.`),
    sayOf(ch('B ∪ X = B, A ∩ X = ∅ 이 뜻하는 것은?', ['X ⊂ B 이고 X 와 A 는 서로소', 'B ⊂ X 이고 X ⊂ A', 'X ⊂ A 이고 X 와 B 는 서로소'], 'X ⊂ B 이고 X 와 A 는 서로소', 'B ∪ X = B → X ⊂ B · A ∩ X = ∅ → 공통 원소 없음(서로소)', { step: 2 }), 'B ∪ X = B 이므로 X ⊂ B, A ∩ X = ∅ 이므로 X 와 A 는 서로소이다.'),
    s3,
    boss,
  ];
}
function u5Chain(c: number, b: number, d: number, r: Rng): Question[] {
  const want = [1 - c, 0, b].sort((x, y) => x - y), opts = fill(r, [...want, d], range(-5, 9), 9);
  const eq = r.shuffle([`x = ${b}`, `x = x² + ${c}x`, `x² + ${c}x = ${b}`, `x² + ${c}x = ${d}`, 'x = 2x']);
  return [
    sayOf(ch(`A ∩ B = B 이면 두 집합 A, B 사이의 관계는?`, ['B ⊂ A', 'A ⊂ B', 'A ∩ B = ∅'], 'B ⊂ A', 'A ∩ B 가 B 전체 → B 의 원소가 모두 A 에 있음 → B ⊂ A', { step: 1 }), `A ∩ B = B 이므로 B ⊂ A, 곧 x 는 A 의 원소이다 (x ≠ ${d}).`),
    whyOf(sayOf(multi(`B ⊂ A 가 성립하기 위해 맞는 식을 모두 고르시오.`, eq, [`x = ${b}`, `x = x² + ${c}x`], `x 는 A 의 원소 → x = ${b} 또는 x = x² + ${c}x`, { step: 2 }), `x 는 A 의 원소이므로 x = ${b} 또는 x = x² + ${c}x 이다.`), '∵ B ⊂ A 이면 B 의 원소 x 는 A 의', ['원소', '부분집합', '여집합'], '이다'),
    sayOf(multi(`x = x² + ${c}x, 이 식만 만족시키는 x 를 모두 고르시오.`, opts, [0, 1 - c], `x² + ${c - 1 === 1 ? '' : c - 1}x = 0 → x(x + ${c - 1}) = 0 → x = 0, ${show(1 - c)}`, { step: 3 }), `x = x² + ${c}x 에서 x² + ${c - 1 === 1 ? '' : c - 1}x = 0 이므로 x = 0 또는 x = ${show(1 - c)} 이다.`),
    sayOf(multi(`x = ${b} 도 넣어, A ∩ B = B 를 만족시키는 정수 x 를 모두 고르시오.`, opts, want, `x = ${b} · 0 · ${show(1 - c)} 모두 가능`, { c, b, d, step: 4 }), `그러므로 x = ${want.map(show).join(', ')} 이다.`),
  ];
}
export function u6Chain(T: number, a: number, b: number): Question[] {
  const inc = a >= b ? 'B ⊂ A' : 'A ⊂ B', rev = a >= b ? 'A ⊂ B' : 'B ⊂ A', mx = Math.min(a, b), mn = a + b - T;
  const boss = sayOf(nq(`두 코스를 모두 다녀온 회원 수의 최솟값은?`, mn, `n(A ∪ B) = ${T} 일 때 → ${a} + ${b} − ${T} = ${mn}`, { T, a, b, step: 4 }), `그러므로 최솟값은 ${a} + ${b} − ${T} = ${mn} 이다.`);
  whyOf(boss, '∵ n(A ∩ B) = n(A) + n(B) −', ['n(A ∪ B)', 'n(U)', 'n(A ∩ B)'], '');
  return [
    sayOf(ch(`두 코스를 모두 다녀온 회원 수가 가장 많을 때는?`, [inc, rev, 'A ∩ B = ∅', 'A ∪ B = U'], inc, `작은 쪽(${a >= b ? 'B' : 'A'})이 큰 쪽 안에 쏙 들어갈 때 A ∩ B 가 가장 큼`, { step: 1 }), `${inc} 일 때 두 코스를 모두 다녀온 회원 수가 가장 많다.`),
    sayOf(nq(`두 코스를 모두 다녀온 회원 수의 최댓값은?`, mx, `${inc} 이면 n(A ∩ B) = ${mx}`, { step: 2 }), `그러므로 최댓값은 ${mx} 이다.`),
    sayOf(ch(`두 코스를 모두 다녀온 회원 수가 가장 적을 때는?`, [`A ∪ B = U (곧 n(A ∪ B) = ${T})`, 'A ∩ B = ∅', 'B ⊂ A', 'A ⊂ B'], `A ∪ B = U (곧 n(A ∪ B) = ${T})`, `n(A ∩ B) = n(A) + n(B) − n(A ∪ B) → n(A ∪ B) 가 가장 클 때(= ${T})`, { step: 3 }), `A ∪ B = U, 곧 n(A ∪ B) = ${T} 일 때 가장 적다.`),
    boss,
  ];
}
function u7Chain(N: number, p: number, q: number, rem: number, r: Rng): Question[] {
  const bad = range(1, N - 1).filter((x) => x % p === 0 && x % q === rem), n = N - 1 - bad.length, L2 = lcmOf(p, q);
  return [
    sayOf(nq(`${N} 미만의 자연수는 모두 몇 개인가?`, N - 1, `1, 2, …, ${N - 1} → ${N - 1}개`, { step: 1 }), `${N} 미만의 자연수는 ${N - 1}개이다.`),
    whyOf(sayOf(ch(`A = {${p}의 배수}, B = {${ro(q)} 나눈 나머지가 ${rem}} 일 때 「${p}의 배수가 아니거나 ${ro(q)} 나눈 나머지가 ${igaN(rem)} 아닌 수」의 집합은?`, ['(A ∩ B)ᶜ', '(A ∪ B)ᶜ', 'A ∩ Bᶜ'], '(A ∩ B)ᶜ', 'Aᶜ ∪ Bᶜ = (A ∩ B)ᶜ (드모르간)', { step: 2 }), `「A 가 아니거나 B 가 아닌」 수의 집합은 드모르간의 법칙에 의해 Aᶜ ∪ Bᶜ = (A ∩ B)ᶜ 이다.`), '∵ 드모르간의 법칙 : (A ∩ B)ᶜ = Aᶜ', ['∪', '∩', '−'], ' Bᶜ'),
    sayOf(nq(`A ∩ B(= ${p}의 배수이면서 ${ro(q)} 나눈 나머지가 ${rem} 인 수)의 가장 작은 원소는?`, bad[0] as number, `${p}의 배수 중 ${ro(q)} 나눈 나머지가 ${rem}인 가장 작은 수 → ${bad[0]}`, { step: 3 }), `A ∩ B 의 가장 작은 원소는 ${bad[0]} 이다.`),
    sayOf(ch(`A ∩ B 의 원소는 몇씩 커지는가?`, r.shuffle([...new Set([L2, p, q, p + q, p * q])]).map(String), String(L2), `${gwaN(p)} ${q} 의 최소공배수 → ${L2}`, { step: 4 }), `${gwaN(p)} ${q} 의 최소공배수 ${L2} 씩 커지므로 A ∩ B = ${st(bad)} 이다.`),
    whyOf(sayOf(nq(`구하는 자연수의 개수는?`, n, `${N - 1} − ${bad.length} = ${n}`, { N, p, q, rem, step: 5 }), `그러므로 구하는 개수는 ${N - 1} − ${bad.length} = ${n} 이다.`), '∵ 여집합의 원소의 개수 = 전체의 개수 −', ['A ∩ B', 'A ∪ B', 'A'], ' 의 개수'),
  ];
}
/** 📜 한 판 더 = 바뀐 숫자의 원문 문제 전체 */
const PROB: Record<string, (...a: number[]) => string> = {
  u4: (p, q, N) => `두 집합 A = {x | x는 ${p}의 약수}, B = {x | x는 ${N} 이하의 ${q}의 배수}에 대하여 A ∩ X = ∅ 과 B ∪ X = B 를 만족시키는 집합 X 의 개수를 구하시오.`,
  u5: (c, b, d) => `두 집합 A = {x² + ${c}x, ${b}, ${d}}, B = {x, ${d}}에 대하여 A ∩ B = B 를 만족시키는 정수 x 를 모두 구하시오.`,
  u6: (T, a, b) => `어느 자전거 동아리 회원 ${T}명을 대상으로 두 코스 A와 B를 다녀온 경험이 있는 회원 수를 조사하였더니 A 코스는 ${a}명이고 B 코스는 ${b}명이었다. 두 코스 A와 B를 모두 다녀온 회원 수의 최댓값과 최솟값을 구하시오.`,
  u7: (N, p, q, rem) => `${N} 미만의 자연수 중에서 ${p}의 배수가 아니거나 ${ro(q as number)} 나누었을 때의 나머지가 ${igaN(rem as number)} 아닌 자연수의 개수를 구하시오.`,
};
const CHAIN_FN: Record<string, (a: number[], r: Rng) => Question[]> = {
  u4: (a, r) => u4Chain(a[0] as number, a[1] as number, a[2] as number, r),
  u5: (a, r) => u5Chain(a[0] as number, a[1] as number, a[2] as number, r),
  u6: (a) => u6Chain(a[0] as number, a[1] as number, a[2] as number),
  u7: (a, r) => u7Chain(a[0] as number, a[1] as number, a[2] as number, a[3] as number, r),
};
const BOOK: Record<string, number[]> = { u4: [8, 4, 20], u5: [2, 4, 6], u6: [40, 28, 21], u7: [100, 7, 5, 3] };
/** 등록 소레이드 생성기: 판 0 = 교과서 숫자 · 판 1~ = 같은 꼴 새 숫자(모든 단계에 📜 원문 문제) */
export const chainOf = (id: 'u4' | 'u5' | 'u6' | 'u7') => (pass: number, r: Rng): Question[] => {
  const args = pass === 0 ? (BOOK[id] as number[]) : (RETRY_ARGS[id] as (r: Rng) => number[])(r), items = (CHAIN_FN[id] as (a: number[], r: Rng) => Question[])(args, r);
  if (pass > 0) items.forEach((it) => { it.problem = (PROB[id] as (...a: number[]) => string)(...args); });
  return items;
};
