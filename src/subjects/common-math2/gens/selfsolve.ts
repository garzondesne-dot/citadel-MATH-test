import type { Question } from '../../../model/types';
import type { BossGenerator, ChainGenerator, Generator } from '../../../model/subject';
import { BOOK, PROB } from './set06';

// 🔎 #126 소문항 「혼자 풀리게」 (📚 차시팩 #1 전수 조사 · hero-v2 docs/handoff/pack-selfsolve README 4절 · PACK-GUIDE §7 검사 9 「학습지 없이 풀린다」)
//   정식 원문 생성기(gens/official · 자동 생성 · 손으로 고치지 않음) 위에 문항 글만 덧씌움 — 정답 · 보기 · 숫자 · 풀이는 그대로
//   ① 7차시 문제 4 ~ 7 소레이드 = 모든 판 단계 글 「그 판 숫자로 쓴 문제 글 ⏎ ① ~ 👑 단계」(성채 1층 q07 · q11 과 같은 꼴 · 수업 · 허수아비 · 게시판 모두)
//   ② 9차시 문제 5 소레이드 마지막 = 「그러므로 명제 「…」 의 역과 대우의 …」  ③ 9차시 문제 2 (1) 둘째 칸 = 「(1) 「…」 에서 결론 q …」
//   ④ 5차시 형성평가 6 = 「5번의」 뺌 (조건은 이미 글에 있음)
const STEP = '①②③④⑤⑥⑦⑧';
const UNIT = ['u4', 'u5', 'u6', 'u7'] as const;

/** ① 단계 글 = 문제 글 ⏎ 단계 표시 + 단계 글 (이미 붙어 있으면 그대로) */
export function withProblem(items: Question[], prob: string): Question[] {
  return items.map((q, i) => {
    if (!q.question || q.question.startsWith(prob)) return q;
    const mark = i === items.length - 1 ? '👑' : (STEP[i] ?? String(i + 1));
    return { ...q, question: `${prob}\n${mark} ${q.question}`, problem: q.problem ?? prob };
  });
}
/** 단계 묶음 고침 (생성기 이름 · 판) — 시험(정식 출력 비교)도 같은 함수로 기대값을 고침 */
export function fixChain(key: string, items: Question[], pass: number): Question[] {
  const id = key.replace(/^set06\./, '') as (typeof UNIT)[number];
  if (key.startsWith('set06.') && (UNIT as readonly string[]).includes(id)) {
    const prob = items[0]?.problem ?? (pass === 0 ? (PROB[id] as (...a: number[]) => string)(...(BOOK[id] as number[])) : '');
    return prob ? withProblem(items, prob) : items;
  }
  if (key === 'set09.m5') { // ② 마지막 「그러므로 역과 대우의」 → 첫 단계의 명제를 넣음
    const prop = /「[^」]+」/.exec(items[0]?.question ?? '')?.[0];
    return prop ? items.map((q) => (q.question?.startsWith('그러므로 역과 대우의') ? { ...q, question: q.question.replace('그러므로 역과 대우의', `그러므로 명제 ${prop} 의 역과 대우의`) } : q)) : items;
  }
  return items;
}
/** ③ 9차시 m2: 「(1) 결론 q : …」 앞에 (1) 의 명제 */
export function fixGen(key: string, items: Question[]): Question[] {
  if (key !== 'set09.m2') return items;
  const prop = /^\(1\) (「[^」]+」) 에서/.exec(items[0]?.question ?? '')?.[1];
  return prop ? items.map((q) => (/^\(1\) 결론 q/.test(q.question ?? '') ? { ...q, question: q.question.replace(/^\(1\) 결론 q/, `(1) ${prop} 에서 결론 q`) } : q)) : items;
}
/** ④ 5차시 형성평가 6: 「6. 5번의 A = …, B = … 에서 B − A 는?」 → 「6. A = …, B = … 일 때 B − A 는?」 */
export function fixBoss(key: string, q: Question): Question {
  const m = key === 'set05.boss' && q ? /^(\d+\.\s)5번의 (.+) 에서 (.+)$/.exec(q.question ?? '') : null;
  return m ? { ...q, question: `${m[1]}${m[2]} 일 때 ${m[3]}` } : q;
}

const CHAIN_KEYS = ['set06.u4', 'set06.u5', 'set06.u6', 'set06.u7', 'set09.m5'];
export function selfSolve(gens: Record<string, Generator>, chains: Record<string, ChainGenerator>, boss: Record<string, BossGenerator>): void {
  for (const k of CHAIN_KEYS) { const g = chains[k]; if (g) chains[k] = (pass, r, seed) => fixChain(k, g(pass, r, seed), pass); }
  const m2 = gens['set09.m2']; if (m2) gens['set09.m2'] = (v, r, p) => fixGen('set09.m2', m2(v, r, p));
  const b5 = boss['set05.boss']; if (b5) boss['set05.boss'] = (i, a, r) => fixBoss('set05.boss', b5(i, a, r));
}
