// 🔎 #126 소문항 「혼자 풀리게」 (📚 차시팩 #1 전수 조사 · PACK-GUIDE §7 검사 9) — 정식 원문 생성기 위에 문항 글만 덧씌움
//   ① 7차시 문제 4 ~ 7 소레이드 = 모든 판 · 모든 단계 글이 그 판 숫자로 쓴 문제 글로 시작 (수업 · 허수아비 · 게시판 같은 생성기)
//   ② 9차시 m5 마지막 = 명제를 품음 ③ 9차시 m2 (1) 둘째 칸 = 명제를 품음 ④ 5차시 형성평가 6 = 「5번의」 없음
//   ⑤ 문항 글 말고는(정답 · 보기 · 풀이 · 나의 풀이 · 근거 줄) 정식 원문과 같음 ⑥ 체험판 성채 1층 · 12차시 = 혼자 풀리게 판
import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/engine/rng';
import { BOSS_GENS, CHAIN_GENS, GENS } from '../src/subjects/common-math2/gens';
import { OFFICIAL_BOSS, OFFICIAL_CHAIN, OFFICIAL_GENS } from '../src/subjects/common-math2/gens/official';
import type { Question } from '../src/model/types';
import castle1 from '../src/subjects/common-math2/trial/castle-1.json';
import ex12 from '../src/subjects/common-math2/trial/ex-12.json';

const SEEDS = ['A1|s1_3_1', 'B2|s1_3_7', 'C3|s1_5_12', 'x', 'trial'];
const noQ = (a: Question[]) => JSON.parse(JSON.stringify(a.map(({ question: _q, problem: _p, ...rest }) => rest)));

describe('① 7차시 문제 4 ~ 7 소레이드', () => {
  for (const id of ['u4', 'u5', 'u6', 'u7']) it(`${id} · 시드 5 × 판 0 ~ 4 = 모든 단계 글이 문제 글 ⏎ ① ~ 👑 로 시작 · 판마다 그 판 숫자`, () => {
    for (const sd of SEEDS) for (let p = 0; p <= 4; p++) {
      const got = CHAIN_GENS[`set06.${id}`]!(p, makeRng('r'), sd), raw = OFFICIAL_CHAIN[`set06.${id}`]!(p, makeRng('r'), sd);
      const prob = got[0]!.problem!;
      expect(prob, `${id} ${sd} 판 ${p}`).toMatch(/구하시오\.$/);
      if (p > 0) expect(prob).toBe(raw[0]!.problem);
      got.forEach((q, i) => {
        const head = `${prob}\n${i === got.length - 1 ? '👑' : '①②③④⑤'[i]} `;
        expect(q.question.startsWith(head), `${id} ${sd} 판 ${p} 단계 ${i + 1}`).toBe(true);
        const body = q.question.slice(head.length);
        if (id === 'u7' && i === 3) expect(body).toMatch(/^A = \{\d+의 배수\}, B = \{\d+(으로|로) 나눈 나머지가 \d+인 수\} 일 때 A ∩ B 의 원소는 몇씩 커지는가\?$/);
        else if (id === 'u5' && i === got.length - 1) expect(body).toMatch(/^x = x² \+ \d+x 를 만족시키는 x 와 x = \d+ 를 모두 넣어, A ∩ B = B 를/);
        else expect(body).toBe(raw[i]!.question);
      });
      expect(noQ(got), '⑤ 글 말고는 정식 그대로').toEqual(noQ(raw));
    }
  });
  it('캡처 문항(문제 5 ②) = A · B 가 글에 있음', () => {
    const q = CHAIN_GENS['set06.u5']!(0, makeRng('r'), 's')[1]!;
    expect(q.question).toMatch(/A = \{x² \+ 2x, 4, 6\}, B = \{x, 6\}.*\n② B ⊂ A 가 성립하기 위해/s);
  });
});
it('② 9차시 문제 5 소레이드 마지막 = 「그러므로 명제 「…」 의 역과 대우의 참 · 거짓은?」 (판마다 그 판 명제)', () => {
  for (const sd of SEEDS) for (let p = 0; p <= 3; p++) {
    const got = CHAIN_GENS['set09.m5']!(p, makeRng('r'), sd), raw = OFFICIAL_CHAIN['set09.m5']!(p, makeRng('r'), sd);
    const prop = /「[^」]+」/.exec(got[0]!.question)![0];
    expect(got.at(-1)!.question).toBe(`그러므로 명제 ${prop} 의 역과 대우의 참 · 거짓은?`);
    expect(got.slice(0, -1).map((q) => q.question)).toEqual(raw.slice(0, -1).map((q) => q.question));
    expect(noQ(got)).toEqual(noQ(raw));
  }
});
it('③ 9차시 문제 2 (1) 둘째 칸 = 명제를 품음', () => {
  for (let v = 0; v <= 5; v++) {
    const got = GENS['set09.m2']!(v, makeRng(`m2|${v}`)), raw = OFFICIAL_GENS['set09.m2']!(v, makeRng(`m2|${v}`));
    const prop = /^\(1\) (「[^」]+」) 에서/.exec(got[0]!.question)![1];
    expect(got[1]!.question).toMatch(new RegExp(`^\\(1\\) ${prop!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} 에서 결론 q : `));
    expect(noQ(got)).toEqual(noQ(raw));
  }
});
it('④ 5차시 형성평가 6 = 「5번의」 없음 · 조건 그대로', () => {
  for (let a = 0; a <= 3; a++) {
    const got = BOSS_GENS['set05.boss']!(5, a, makeRng(`b|${a}`)), raw = OFFICIAL_BOSS['set05.boss']!(5, a, makeRng(`b|${a}`));
    expect(got.question).not.toMatch(/5번의/);
    if (/5번의/.test(raw.question)) expect(got.question).toMatch(/^6\. A = \{.*\}, B = \{.*\} 일 때 B − A 는\?$/);
    expect(noQ([got])).toEqual(noQ([raw]));
  }
});
it('⑥ 체험판 성채 1층 · 12차시 = 혼자 풀리게 판 (q08 · q09 · q10 · 👑 q12 · m2 (4) · m3)', () => {
  const s1 = JSON.stringify(castle1), s2 = JSON.stringify(ex12);
  expect(s1).not.toMatch(/"q": ?"② B ⊂ A 가 성립하기/);
  expect(s1).toMatch(/08 A = \{x² \+ 3x, 5, 7\}/);
  expect(s1).toMatch(/100 이하의 자연수 중 k 의 배수의 집합을 Aₖ 라 할 때/);
  expect(s2).toMatch(/서로소인 자연수\)로 놓았더니 m, n 이 모두 짝수가 되었다/);
  expect(s2).toMatch(/를 귀류법으로 증명/);
});

it('🧩 소레이드 모든 단계 = 앞 단계 · 학습지를 가리키는 말 없음 (위의 · 앞에서 · 앞 문제 · 「도 넣어」) · 6 · 7 · 9 · 10차시 · 판 0 ~ 3', () => {
  const bad: string[] = [];
  for (const [k, g] of Object.entries(CHAIN_GENS)) for (const sd of SEEDS.slice(0, 2)) for (let p = 0; p <= 3; p++)
    g(p, makeRng('r'), sd).forEach((q, i) => { if (/위의 |앞에서|앞 문제|도 넣어/.test(q.question.split('\n').pop()!)) bad.push(`${k} 판 ${p} 단계 ${i + 1}: ${q.question.split('\n').pop()}`); });
  expect(bad).toEqual([]);
});
