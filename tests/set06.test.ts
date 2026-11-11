// 6차시 독립 검산 — 정식 tests/lesson6.test.js 의 문제 1~3 · 형성평가 부분을 그대로 옮김
// (1) 첫 시도 = 학습지 ★ 칸 · 교과서 원문 정답 (2) 재도전 300 시드 × 3판: 문제 글에서 숫자 · 집합을 읽어 원소를 하나하나 세어 따로 계산
// (3) 형성평가 6문항 + 재도전 생성기 300 시드 × 3번 — 차시 팩 · 생성기의 계산 결과를 쓰지 않는다
import { describe, expect, it } from 'vitest';
import type { LessonPack, Question } from '../src/model/types';
import pack from '../src/packs/set-06.json';
import { bossItem, items, validate } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';
import { makeRng } from '../src/engine/rng';
import { set06boss } from '../src/gens/set06';

const L = pack as LessonPack;
type Multi = Extract<Question, { type: 'multi' }>;
type Num = Extract<Question, { type: 'number' }>;
type Choice = Extract<Question, { type: 'choice' }>;
const R = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ── 독립 계산 도구 (정식 시험과 같은 글) ──
const parseSet = (s: string) => (s.trim() === '∅' ? [] : s.replace(/[{}]/g, '').split(',').map((t) => t.trim()).filter(Boolean).map(Number));
const re1 = (re: RegExp, s: string) => (re.exec(s) as RegExpExecArray)[1] as string;
const readU = (q: string) => parseSet(re1(/U = (\{[^}]*\})/, q));
const readSet = (q: string, n: string) => parseSet(re1(new RegExp(`${n} = (\\{[^}]*\\})`), q));
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
function gradeOk(q: Question, tag: string) {
  const right = q.type === 'choice' ? q.answerIndex : (q as Num | Multi).answer;
  const wrong = q.type === 'choice' ? (q.answerIndex + 1) % q.choices.length : q.type === 'number' ? q.answer + 1 : [];
  expect(grade(q, right as never), `${tag}: 정답 채점`).toBe(true);
  expect(grade(q, wrong as never), `${tag}: 오답이 정답 처리됨`).toBe(false);
}

/** 문항 하나를 문제 글만 보고 독립 확인 (정식 verify 의 m1 · m2 · m3) */
function verify(mid: string, q: Question, tag: string) {
  const text = q.question;
  if (mid === 'm1') {
    const m = q as Multi, U = readU(text), A = readSet(text, 'A'), B = readSet(text, 'B'), expr = String(m.check?.expr);
    expect(chosen(m), `${tag} ${expr}`).toEqual(evalExpr(expr, U, A, B));
    expect(m.options.map(Number), `${tag}: 보기는 U 의 원소`).toEqual(U);
  } else if (mid === 'm2') {
    const g = (k: string) => Number(re1(new RegExp(`${k} = (\\d+)`), text));
    const u = g('n\\(U\\)'), a = g('n\\(A\\)'), b = g('n\\(B\\)'), ab = g('n\\(A ∩ B\\)');
    // 원소를 실제로 만들어 센다: A ∩ B = 1..ab, A 만 · B 만 · 바깥
    const U = R(1, u), A = U.slice(0, a), B = [...U.slice(0, ab), ...U.slice(a, a + b - ab)];
    expect(A.length === a && B.length === b && A.filter((x) => B.includes(x)).length === ab && a + b - ab <= u, `${tag}: 조건이 가능한 수`).toBe(true);
    const want: Record<string, number> = { 'n(Aᶜ)': U.filter((x) => !A.includes(x)).length, 'n(A − B)': A.filter((x) => !B.includes(x)).length, 'n(B − A)': B.filter((x) => !A.includes(x)).length,
      'n(A ∪ B)': U.filter((x) => A.includes(x) || B.includes(x)).length, 'n(Aᶜ ∩ Bᶜ)': U.filter((x) => !A.includes(x) && !B.includes(x)).length };
    const key = Object.keys(want).find((k) => text.includes(`${k} =`) && text.lastIndexOf(k) > text.indexOf('일 때'));
    expect(key, `${tag}: 묻는 식`).toBeTruthy();
    expect((q as Num).answer, `${tag} ${key}`).toBe(want[key as string]);
  } else if (mid === 'm3') {
    const m = /(\d+)명 중 (\S+) 동아리 (\d+)명, (\S+) 동아리 (\d+)명, 둘 다 (\d+)명/.exec(text) as RegExpExecArray;
    const [T, x, y, both] = [m[1], m[3], m[5], m[6]].map(Number) as [number, number, number, number];
    const people = Array.from({ length: T }, (_, i) => ({ p: i < x, q: i < both || (i >= x && i < x + y - both) }));
    expect(people.filter((s) => s.p).length === x && people.filter((s) => s.q).length === y && people.filter((s) => s.p && s.q).length === both, `${tag}: 인원 배치`).toBe(true);
    const want = text.includes('또는') ? people.filter((s) => s.p || s.q).length : text.includes('만 하는') ? people.filter((s) => s.p && !s.q).length : people.filter((s) => !s.p && !s.q).length;
    expect((q as Num).answer, tag).toBe(want);
  }
  gradeOk(q, tag);
}

// 형성평가 독립 검산 도구 (드모르간 진리표)
function parseDM(s: string) {
  const t = s.replace(/\s+/g, ''); let p = 0;
  type F = (e: Record<string, boolean>) => boolean;
  const term = (): F => {
    let f: F;
    if (t[p] === '(') { p++; f = expr(); if (t[p++] !== ')') throw new Error('괄호 ' + s); }
    else if (/[A-Z]/.test(t[p] || '')) { const c = t[p++] as string; f = (e) => !!e[c]; }
    else throw new Error('모르는 식 ' + s);
    while (t[p] === 'ᶜ') { p++; const g = f; f = (e) => !g(e); }
    return f;
  };
  const expr = (): F => { let f = term(); while (t[p] === '∪' || t[p] === '∩') { const o = t[p++], g = term(), h = f; f = o === '∪' ? (e) => h(e) || g(e) : (e) => h(e) && g(e); } return f; };
  const f = expr(); if (p !== t.length) throw new Error('남은 글자 ' + s); return f;
}
function sameSetExpr(s1: string, s2: string) {
  const ls = [...new Set((s1 + s2).match(/[A-Z]/g))], f = parseDM(s1), g = parseDM(s2);
  for (let m = 0; m < 1 << ls.length; m++) { const e: Record<string, boolean> = {}; ls.forEach((c, k) => { e[c] = !!((m >> k) & 1); }); if (f(e) !== g(e)) return false; }
  return true;
}
const setOf = (s: string) => (s === '∅' ? [] : s.replace(/[{}]/g, '').split(',').map((x) => Number(x.trim())));
function verifyBoss(i: number, q: Question, tag: string) {
  const t = q.question; let m: RegExpExecArray | null;
  expect(t.startsWith(`${i + 1}. `) && !/위 /.test(t), `${tag}: 번호 · 혼자 읽히는 글 ${t}`).toBe(true);
  if (q.type === 'choice') { expect(new Set(q.choices).size === q.choices.length && q.choices[q.answerIndex] === q.answer, `${tag}: 보기`).toBe(true); q.choices.forEach((_, k) => expect(grade(q, k), `${tag}: 보기 ${k + 1} 채점`).toBe(k === q.answerIndex)); }
  else if (q.type === 'number') expect(grade(q, q.answer) && !grade(q, q.answer + 1) && !grade(q, q.answer - 1), `${tag}: 숫자 채점`).toBe(true);
  else { const mq = q as Multi; expect(grade(mq, mq.answer) === true && grade(mq, []) === false && new Set(mq.options).size === mq.options.length, `${tag}: 고르기 채점 · 보기 중복`).toBe(true); }
  if (i === 0) {
    const c = q as Choice;
    m = /^1\. (.+) = (.+) 의 \( \) 에 알맞은 것은\?$/.exec(t);
    expect(m && c.choices.length === 2, `${tag}: 1번 꼴`).toBeTruthy();
    if (m) { const mm = m; const ok = c.choices.filter((ch) => sameSetExpr((mm[1] as string).replace('( )', ch), (mm[2] as string).replace('( )', ch))); expect(ok.length === 1 && ok[0] === c.answer, `${tag}: ${t} → ${ok}`).toBe(true); }
  } else if (i === 1) {
    m = /^2\. n\(U\) = (\d+), n\(([A-Z])\) = (\d+) 일 때 n\(\2ᶜ\) = \?$/.exec(t);
    expect(m, `${tag}: 2번 꼴 ${t}`).toBeTruthy();
    if (m) { const U = R(1, Number(m[1])), A = U.slice(0, Number(m[3])); expect(A.length < U.length && (q as Num).answer === U.filter((x) => !A.includes(x)).length, `${tag}: n(ᶜ)`).toBe(true); }
  } else if (i === 2) {
    m = /^3\. 두 집합 A 와 B 에 대하여 n\(A\) = (\d+), n\(B\) = (\d+), n\(A ∪ B\) = (\d+) 일 때, n\(A ∩ B\) 는\?$/.exec(t);
    expect(m, `${tag}: 3번 꼴 ${t}`).toBeTruthy();
    if (m) {
      const [a, b, u] = m.slice(1).map(Number) as [number, number, number];
      const ks = R(0, Math.min(a, b)).filter((k) => { const A = R(1, a), B = [...R(1, k), ...R(a + 1, a + b - k)]; return new Set([...A, ...B]).size === u; });
      expect(ks.length === 1 && (q as Num).answer === ks[0] && (ks[0] as number) > 0, `${tag}: n(A ∩ B) ${(q as Num).answer} ≠ ${ks}`).toBe(true);
    }
  } else if (i === 3) {
    m = /^4\. 전체집합 U = \{1, 2, 3, …, 10\}의 두 부분집합 A = (\{[^}]*\}), B = \{x \| x는 (\d+)의 약수\}에 대하여 A − B 의 원소를 모두 고르시오\.$/.exec(t);
    expect(m, `${tag}: 4번 꼴 ${t}`).toBeTruthy();
    if (m) { const mq = q as Multi, A = setOf(m[1] as string), n2 = Number(m[2]), want = A.filter((x) => n2 % x !== 0); expect(JSON.stringify(mq.answer.map((k) => Number(mq.options[k]))) === JSON.stringify(want) && want.length > 0 && mq.options.join() === R(1, 10).join(), `${tag}: A − B ${want}`).toBe(true); }
  } else if (i === 4) {
    m = /^5\. 전체집합 U = (\{[^}]*\})의 부분집합 중에서 집합 A = (\{[^}]*\})와 서로소인 집합을 모두 고르시오\.$/.exec(t);
    expect(m, `${tag}: 5번 꼴 ${t}`).toBeTruthy();
    if (m) {
      const mq = q as Multi, U = setOf(m[1] as string), A = setOf(m[2] as string);
      const want = mq.options.map((o, k) => (setOf(o).every((x) => U.includes(x) && !A.includes(x)) ? k : -1)).filter((k) => k >= 0);
      expect(mq.answer, `${tag}: 서로소`).toEqual(want);
      expect(want.length, `${tag}: 서로소인 부분집합이 보기에 모두 있음`).toBe(2 ** U.filter((x) => !A.includes(x)).length);
    }
  } else if (i === 5) {
    m = /^6\. 전체집합 U = \{x \| x는 (\d+) 이하의 자연수\}의 두 부분집합 A = \{x \| x는 (\d+)의 배수\}, B = \{x \| x는 (\d+)의 약수\}에 대하여 n\(Aᶜ ∩ Bᶜ\) 는\?$/.exec(t);
    expect(m, `${tag}: 6번 꼴 ${t}`).toBeTruthy();
    if (m) { const [N, k, d] = m.slice(1).map(Number) as [number, number, number]; expect(d <= N && (q as Num).answer === R(1, N).filter((x) => x % k !== 0 && d % x !== 0).length, `${tag}: n(Aᶜ ∩ Bᶜ)`).toBe(true); }
  }
}

describe('6차시 (드모르간 · 원소의 개수 · 생활 속 · 형성평가)', () => {
  it('차시 팩이 올바름 · 단계 차례 = 정식 STEPS', () => {
    expect(validate(L)).toEqual([]);
    expect(L.steps.map((s) => s.id).join(' ')).toBe('c1 m1 c2 m2 c3 m3 c4 u4 u5 u6 u7 boss');
    expect(L.steps.filter((s) => s.later).map((s) => s.id)).toEqual(['u4', 'u5', 'u6', 'u7']);
  });

  it('첫 시도 = 학습지 ★ 칸 (정식 sheet 값)', () => {
    const ansOf = (q: Question) => (q.type === 'multi' ? `{${chosen(q).join(',')}}` : String((q as Num).answer));
    const sheet: Record<string, string[]> = { m1: ['{5,6}', '{5,6}', '{1,2,4,5,6}', '{1,2,4,5,6}'], m2: ['18', '7', '8'], m3: ['25', '15'] };
    for (const [mid, want] of Object.entries(sheet)) {
      const first = items(L, mid, 'seed', 0);
      expect(first.map(ansOf), mid).toEqual(want);
      first.forEach((q, i) => verify(mid, q, `${mid}#0.${i}`));
    }
  });

  it('재도전 300 시드 × 3판 × 문제 1~3 독립 검산', () => {
    let n = 0;
    for (let s = 0; s < 300; s++) for (let a = 1; a <= 3; a++) for (const mid of ['m1', 'm2', 'm3']) items(L, mid, `s${s}`, a).forEach((q, i) => { n++; verify(mid, q, `${mid}#${s}.${a}.${i}`); });
    expect(n).toBe(300 * 3 * (4 + 3 + 2));
    // 정식: 문제 2 재도전은 학습지(교과서) 숫자를 빼고 서로 다른 문제가 충분히
    const texts = new Set<string>(); let sameAsBook = 0; const book = (items(L, 'm2', 'x', 0)[0] as Question).question;
    for (let s = 0; s < 100; s++) for (let a = 1; a <= 3; a++) { const q = items(L, 'm2', `d${s}`, a)[0] as Question; texts.add(q.question); if (q.question === book) sameAsBook++; }
    expect(texts.size >= 20 && sameAsBook === 0, `m2 재도전: 서로 다른 문제 ${texts.size} · 교과서 그대로 ${sameAsBook}`).toBe(true);
  });

  it('형성평가 6문항 = 학습지(1 · 2) · 교과서 원문(3~6)', () => {
    const b = L.boss!;
    expect(b.items === 6 && b.hpItems === 6).toBe(true);
    const b1 = Array.from({ length: 6 }, (_, i) => bossItem(L, 'any', i, 0) as Question);
    const bAns = (q: Question) => (q.type === 'multi' ? `{${q.answer.map((i) => q.options[i] as string).sort((x, y) => (x === '∅' ? -1 : y === '∅' ? 1 : x.length - y.length || (x < y ? -1 : 1))).join(',')}}` : q.type === 'choice' ? String(q.answer) : String((q as Num).answer));
    expect(b1.map(bAns)).toEqual(['∩', '13', '11', '{9}', '{∅,{3},{5},{3, 5}}', '20']);
    expect(b1[2]?.question.includes('n(A) = 18, n(B) = 23, n(A ∪ B) = 30') && b1[3]?.question.includes('{1, 5, 9, 10}') && b1[4]?.question.includes('{1, 2, 4}') && b1[5]?.question.includes('24의 약수')).toBe(true);
    b1.forEach((q, i) => verifyBoss(i, q, `보스#0.${i + 1}`));
    // 시도 0 = 모든 학생 같은 문항 (시드와 상관없음)
    for (let i = 0; i < 6; i++) expect(set06boss(i, 0, makeRng('z'))).toBe(b1[i]);
  });

  it('형성평가 재도전 생성기 300 시드 × 3번 독립 검산', () => {
    const b1 = Array.from({ length: 6 }, (_, i) => set06boss(i, 0, makeRng('z')));
    const snap = JSON.stringify(b1);
    const texts = Array.from({ length: 6 }, () => new Set<string>()), same12 = [0, 0, 0, 0, 0, 0];
    let nb = 0;
    for (let s = 0; s < 300; s++) for (let i = 0; i < 6; i++) {
      const qs = [1, 2, 3].map((a) => set06boss(i, a, makeRng(`s${s}|boss|${i}|${a}`)));
      qs.forEach((q, k) => { nb++; verifyBoss(i, q, `보스재도전${i + 1}#${s}.${k + 1}`); texts[i]?.add(q.question); expect(q.question === b1[i]?.question, `보스재도전${i + 1}#${s}: 학습지와 같은 문제`).toBe(false); });
      if (JSON.stringify(qs[0]) === JSON.stringify(qs[1])) same12[i] = (same12[i] as number) + 1;
    }
    for (let i = 0; i < 6; i++) { expect((texts[i] as Set<string>).size, `보스재도전 ${i + 1}번: 서로 다른 문제`).toBeGreaterThanOrEqual(5); expect(same12[i], `보스재도전 ${i + 1}번: 시도 1 · 2 같음`).toBeLessThan(45); }
    expect(nb).toBe(300 * 6 * 3);
    expect(JSON.stringify(b1), '생성기가 학습지 문항을 건드리지 않음').toBe(snap);
  });
});
