// ⚔ 6차시 문제 4~7 독립 검산 — 정식 tests/lesson6.test.js verifyUnit(한 문항 꼴) + tests/soraid.test.js ①②(단계 정답 · 연습 200판)
// 차시 팩 · 생성기의 계산 결과를 쓰지 않고 문제 글 · 숫자로 다시 계산한다
import { describe, expect, it } from 'vitest';
import type { LessonPack, Question } from '../src/model/types';
import pack from '../src/subjects/common-math2/lessons/set-06.json';
import { chainItems, items } from '../src/engine/lessons';
import { grade } from '../src/engine/grade';
import { u6Chain } from '../src/subjects/common-math2/gens/set06';

const L = pack as LessonPack;
type Multi = Extract<Question, { type: 'multi' }>;
type Num = Extract<Question, { type: 'number' }>;
type Choice = Extract<Question, { type: 'choice' }>;
const R = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const toNum = (t: string) => Number(String(t).replace('−', '-'));
const pickedNums = (q: Multi) => q.answer.map((i) => toNum(q.options[i] as string)).sort((a, b) => a - b);
const ch = (id: string, seed: string, p: number) => chainItems(L, id, seed, p);
const val = (q: Question) => (q.type === 'multi' ? q.answer.map((i) => q.options[i]).join(',') : q.type === 'choice' ? q.choices[q.answerIndex] : String((q as Num).answer));

function gradeOk(q: Question, tag: string) {
  const right = q.type === 'choice' ? q.answerIndex : (q as Num | Multi).answer;
  const wrong = q.type === 'choice' ? (q.answerIndex + 1) % q.choices.length : q.type === 'number' ? q.answer + 1 : [];
  expect(grade(q, right as never), `${tag}: 정답 채점`).toBe(true);
  expect(grade(q, wrong as never), `${tag}: 오답이 정답 처리됨`).toBe(false);
}
/** 정식 verifyUnit: 문제 글만 읽어 원소를 세어 따로 계산 */
function verifyUnit(mid: string, q: Question, tag: string) {
  const t = q.question; let m: RegExpExecArray | null;
  if (mid === 'u4') {
    m = /^두 집합 A = \{x \| x는 (\d+)의 약수\}, B = \{x \| x는 (\d+) 이하의 (\d+)의 배수\}에 대하여 A ∩ X = ∅ 과 B ∪ X = B 를 만족시키는 집합 X 의 개수는\?/.exec(t);
    expect(m, `${tag}: 07 꼴 ${t}`).toBeTruthy(); if (!m) return;
    const [p, N, k] = m.slice(1).map(Number) as [number, number, number], A = R(1, p).filter((x) => p % x === 0), B = R(1, N).filter((x) => x % k === 0);
    let cnt = 0; for (let mask = 0; mask < 1 << B.length; mask++) { const X = B.filter((_, j) => (mask >> j) & 1); const BuX = new Set([...B, ...X]); if (X.every((x) => !A.includes(x)) && BuX.size === B.length) cnt++; }
    expect((q as Num).answer, `${tag}: X 개수`).toBe(cnt);
  } else if (mid === 'u5') {
    m = /^두 집합 A = \{x² \+ (\d+)x, (\d+), (\d+)\}, B = \{x, (\d+)\}에 대하여 A ∩ B = B 를 만족시키는 정수 x 를 모두 고르시오\.$/.exec(t);
    expect(m && m[3] === m[4], `${tag}: 08 꼴 ${t}`).toBeTruthy(); if (!m) return;
    const [c, b, d] = m.slice(1, 4).map(Number) as [number, number, number];
    const want = R(-50, 50).filter((x) => { const A = [x * x + c * x, b, d], B = [x, d]; return new Set(A).size === 3 && new Set(B).size === 2 && B.every((y) => A.includes(y)); });
    const mq = q as Multi;
    expect(pickedNums(mq), `${tag}: x`).toEqual(want);
    expect(want.length === 3 && mq.options.map(toNum).includes(d) && new Set(mq.options).size === mq.options.length, `${tag}: 답 3개 · 함정 보기 ${d}`).toBe(true);
  } else if (mid === 'u6') {
    m = /회원 (\d+)명을 대상으로 .* A 코스는 (\d+)명이고 B 코스는 (\d+)명이었다\. 두 코스 A와 B를 모두 다녀온 회원 수의 (최댓값|최솟값)은\?$/.exec(t);
    expect(m, `${tag}: 11 꼴 ${t}`).toBeTruthy(); if (!m) return;
    const [T, a, b] = m.slice(1, 4).map(Number) as [number, number, number], ok: number[] = [];
    for (let k = 0; k <= Math.min(a, b); k++) if (a + b - k <= T) ok.push(k);
    expect((q as Num).answer, `${tag}: ${m[4]}`).toBe(m[4] === '최댓값' ? Math.max(...ok) : Math.min(...ok));
    expect(Math.min(...ok), `${tag}: 최솟값이 0 보다 큼`).toBeGreaterThan(0);
  } else if (mid === 'u7') {
    m = /^(\d+) 미만의 자연수 중에서 (\d+)의 배수가 아니거나 (\d+)(으로|로) 나누었을 때의 나머지가 (\d+)(이|가) 아닌 자연수의 개수는\?$/.exec(t);
    expect(m, `${tag}: 12 꼴 ${t}`).toBeTruthy(); if (!m) return;
    const [N, p, k] = [m[1], m[2], m[3]].map(Number) as [number, number, number], r = Number(m[5]);
    expect((q as Num).answer, `${tag}: 12 개수`).toBe(R(1, N - 1).filter((x) => x % p !== 0 || x % k !== r).length);
    const read = (n: number) => '영일이삼사오육칠팔구'[n % 10] as string, bat = (n: number) => (read(n).charCodeAt(0) - 0xac00) % 28;
    expect(m[4] === (bat(k) && read(k) !== '일' && read(k) !== '칠' && read(k) !== '팔' ? '으로' : '로') && m[6] === (bat(r) ? '이' : '가'), `${tag}: 조사`).toBe(true);
  }
  gradeOk(q, tag);
}

describe('문제 4~7 (교과서 78~79쪽)', () => {
  it('한 문항 꼴: 첫 시도 = 교과서 원문 정답 · 재도전 300 시드 × 3판 독립 검산', () => {
    const sheet: Record<string, string[]> = { u4: ['8'], u5: ['{-1,0,4}'], u6: ['21', '9'], u7: ['96'] };
    const ansOf = (q: Question) => (q.type === 'multi' ? `{${pickedNums(q).join(',')}}` : String((q as Num).answer));
    for (const [mid, want] of Object.entries(sheet)) {
      expect(items(L, mid, 'seed', 0).map(ansOf), mid).toEqual(want);
      items(L, mid, 'seed', 0).forEach((q, i) => verifyUnit(mid, q, `${mid}#0.${i}`));
    }
    expect((items(L, 'u4', 'x', 0)[0] as Question).question.includes('8의 약수') && (items(L, 'u4', 'x', 0)[0] as Question).question.includes('20 이하의 4의 배수')).toBe(true);
    expect((items(L, 'u5', 'x', 0)[0] as Question).question.includes('{x² + 2x, 4, 6}')).toBe(true);
    for (let s = 0; s < 300; s++) for (let a = 1; a <= 3; a++) for (const mid of ['u4', 'u5', 'u6', 'u7']) items(L, mid, `s${s}`, a).forEach((q, i) => verifyUnit(mid, q, `${mid}#${s}.${a}.${i}`));
  });

  it('⚔ 소레이드 첫 판 = 교과서 숫자 단계 정답 · 근거 줄 자리 · 나의 풀이 문장 (정식 soraid ①)', () => {
    const ans = (id: string) => ch(id, 's', 0).map(val);
    expect(ans('u4').join(' | ')).toBe('1,2,4,8,4,8,12,16,20 | X ⊂ B 이고 X 와 A 는 서로소 | 12,16,20 | 8');
    const at = (id: string) => ch(id, 's', 0).map((q, i) => (q.why ? i : -1)).filter((i) => i >= 0).join();
    expect([at('u4'), at('u5'), at('u6'), at('u7')]).toEqual(['3', '1', '3', '1,4']);
    const u4 = ch('u4', 's', 0), g = (u4[0] as Multi).groups || [], cut = g[0]?.n as number;
    const pick = (lo: number, hi: number) => (u4[0] as Multi).answer.filter((i) => i >= lo && i < hi).map((i) => (u4[0] as Multi).options[i]).join(',');
    expect(g.length === 2 && pick(0, cut) === '1,2,4,8' && pick(cut, cut + (g[1]?.n as number)) === '4,8,12,16,20' && /8의 약수/.test(g[0]?.label as string) && /20 이하의 4의 배수/.test(g[1]?.label as string)).toBe(true);
    expect(u4.length === 4 && u4[1]?.type === 'choice' && u4[3]?.why?.text === '∵ 원소가 3개인 집합의 부분집합의 개수는 2³' && u4[3]?.why?.choices[0]?.startsWith('2ⁿ') && (u4[3] as Num).answer === 8).toBe(true);
    expect(u4[0]?.say).toBe('A = {1, 2, 4, 8}, B = {4, 8, 12, 16, 20} 이다.');
    expect(u4[2]?.say).toBe('따라서 X ⊂ B − A = {12, 16, 20} 이다.');
    expect(!grade(u4[0] as Question, (u4[0] as Multi).answer.slice(0, -1)) && grade(u4[0] as Question, (u4[0] as Multi).answer.slice())).toBe(true); // 두 칸 다 맞아야
    const setOf = (id: string, k: number) => { const q = ch(id, 's', 0)[k] as Multi; return q.answer.map((i) => q.options[i]).sort().join(','); };
    expect(ans('u5')[0] === 'B ⊂ A' && setOf('u5', 1) === ['x = 4', 'x = x² + 2x'].sort().join(',') && ans('u5')[2] === '−1,0' && ans('u5')[3] === '−1,0,4').toBe(true);
    expect(ans('u6').join(' | ')).toBe('B ⊂ A | 21 | A ∪ B = U (곧 n(A ∪ B) = 40) | 9');
    expect(ans('u7').join(' | ')).toBe('99 | (A ∩ B)ᶜ | 28 | 35 | 96');
    expect(ch('u7', 's', 0)[3]?.say).toBe('7 과 5 의 최소공배수 35 씩 커지므로 A ∩ B = {28, 63, 98} 이다.');
    const v = u6Chain(40, 18, 25), e = u6Chain(40, 20, 20);
    expect((v[0] as Choice).answer === 'A ⊂ B' && (v[0] as Choice).choices.includes('B ⊂ A') && (v[1] as Num).answer === 18 && (v[3] as Num).answer === 3 && !!v[0]?.say?.startsWith('A ⊂ B 일 때') && (e[1] as Num).answer === 20).toBe(true);
    expect(['u4', 'u5', 'u6', 'u7'].every((id) => ch(id, 's', 0).every((x) => !x.problem)), '첫 판 = 📜 문제 상자 없음').toBe(true);
    expect(['u4', 'u5', 'u6', 'u7'].every((id) => ch(id, 's1', 1).every((x) => !!x.problem && /구하시오\.$/.test(x.problem))), '한 판 더 = 모든 단계에 바뀐 숫자의 원문').toBe(true);
  });

  it('⚔ 연습 판 200개 숫자로 다시 계산 (정식 soraid ②)', () => {
    for (let k = 1; k <= 200; k++) {
      const a = ch('u4', 's' + k, k), c1 = (a[0]?.check || {}) as { p: number; q: number; N: number }, num = (q: Multi, ix: number[]) => ix.map((i) => toNum(q.options[i] as string));
      const A0 = R(1, c1.p).filter((d) => c1.p % d === 0), B0 = R(1, Math.floor(c1.N / c1.q)).map((i) => i * c1.q), D0 = B0.filter((x) => !A0.includes(x)), g0 = ((a[0] as Multi).groups || [{ n: 0 }])[0]?.n as number;
      const D = num(a[2] as Multi, (a[2] as Multi).answer);
      expect(num(a[0] as Multi, (a[0] as Multi).answer.filter((i) => i < g0)).join() === A0.join() && num(a[0] as Multi, (a[0] as Multi).answer.filter((i) => i >= g0)).join() === B0.join() && D.join() === D0.join() && (a[3] as Num).answer === 2 ** D0.length && D0.length >= 2, `연습 u4 #${k}`).toBe(true);
      const u7 = ch('u7', 's' + k, k), q = u7[4]?.check as { N: number; p: number; q: number; rem: number }, B7 = R(1, q.N - 1).filter((x) => x % q.p === 0 && x % q.q === q.rem);
      let g = q.p, h = q.q; while (h) [g, h] = [h, g % h]; const lc = (q.p * q.q) / g;
      expect(u7.length === 5 && (u7[0] as Num).answer === q.N - 1 && (u7[2] as Num).answer === B7[0] && (u7[3] as Choice).answer === String(lc) && new Set((u7[3] as Choice).choices).size === (u7[3] as Choice).choices.length
        && B7.every((x, i) => !i || x - (B7[i - 1] as number) === lc) && (u7[4] as Num).answer === q.N - 1 - B7.length && !!u7[4]?.why, `연습 u7 #${k}`).toBe(true);
      if (k <= 50) {
        const u6 = ch('u6', 's' + k, k), w = u6[3]?.check as { T: number; a: number; b: number };
        expect((u6[0] as Choice).answer === (w.a >= w.b ? 'B ⊂ A' : 'A ⊂ B') && (u6[1] as Num).answer === Math.min(w.a, w.b) && /^A ∪ B = U/.test((u6[2] as Choice).answer as string) && (u6[3] as Num).answer === w.a + w.b - w.T && !!u6[3]?.why && u6.every((x) => !!x.problem && x.problem.includes(`${w.T}명`)), `연습 u6 #${k}`).toBe(true);
        const q2 = ch('u5', 's' + k, k), c5 = q2[3]?.check as { b: number; c: number; d: number }, o = (q2[1] as Multi).options, okk = (q2[1] as Multi).answer.map((i) => o[i]).sort().join(',');
        expect(okk === [`x = ${c5.b}`, `x = x² + ${c5.c}x`].sort().join(',') && o.length === 5 && new Set(o).size === 5 && !o.includes(`x = ${c5.d}`) && !!q2[0]?.problem && /B = \{x, /.test(q2[0]?.problem as string), `연습 u5 졸개2 #${k}`).toBe(true);
        const want = [1 - c5.c, 0, c5.b].sort((x, y) => x - y).join(',');
        expect((q2[3] as Multi).answer.map((i) => String((q2[3] as Multi).options[i]).replace('−', '-')).join(','), `연습 u5 #${k}`).toBe(want);
        expect(ch('u4', 's' + k, k).every((x) => !!x.say), `연습 say #${k}`).toBe(true);
      }
    }
  });
});
