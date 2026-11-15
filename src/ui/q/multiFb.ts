// ☑ 「모두 고르기」(multi) 틀렸을 때 표시 (📜 2026-11-15 선생님 · DECISIONS 맨 아래 · 머리 🔨)
//   ① 늘 = 문제 글의 「모두」 강조 (QItem)
//   ② 그 문항을 처음 틀렸을 때 한 번만 = 큰 띠 「☑ 정답이 하나가 아닐 수 있어요 · 모두 고르세요!」 + 「모두」 깜빡 3번 + 보기를 ☐ 체크 상자 모양으로
//      · 정답 개수 · 맞은 것은 안 알려 줌 · 두 번째 틀림부터 = ①만 · 기억 = 그 문항(숫자 바뀐 재도전도 같은 문항) · 이 탭 동안
//   ③ 틀렸을 때 고른 보기 중 정답 = ✔ 초록 · 고른 보기 중 오답 = ✘ 빨강 · 안 고른 정답 = 표시 없음 · 다음 시도에 ✔ 칸은 고른 채로(✘ 칸은 풀림)
//      · 표시는 그 판(보기가 같은 문항) 안에서만 · 글자 취소선 없음
import type { Given, Question } from '../../model/types';

export type Marks = { ok: number[]; bad: number[] };
type Multi = Extract<Question, { type: 'multi' }>;
const isMulti = (q: Question | null | undefined): q is Multi => !!q && q.type === 'multi';
const same = (a: Question, b: Question | null | undefined) => !!b && b.type === a.type && JSON.stringify((b as Multi).options) === JSON.stringify((a as Multi).options);

/** 지난 틀린 답(prev) → ✔ · ✘ 칸 (multi 아님 · 보기가 다른 판 · 다 맞음 · 답 없음 = null) · prevQ = 그때 문항(없으면 같은 문항으로 봄) */
export function marksOf(q: Question | null | undefined, prev: Given | undefined, prevQ?: Question | null): Marks | null {
  if (!isMulti(q) || !Array.isArray(prev) || !prev.length) return null;
  if (prevQ && !same(q, prevQ)) return null;
  const ans = new Set(q.answer), g = (prev as number[]).filter((k) => typeof k === 'number');
  const ok = g.filter((k) => ans.has(k)), bad = g.filter((k) => !ans.has(k));
  if (!bad.length && ok.length === ans.size) return null; // 다 맞은 답 = 표시 없음
  return { ok, bad };
}
/** 다음 시도의 처음 값 = ✔ 칸만 고른 채로 */
export const keepOk = (q: Question | null | undefined, prev: Given | undefined, prevQ?: Question | null): number[] | null => marksOf(q, prev, prevQ)?.ok ?? null;

const seen = new Set<string>();
/** 그 문항을 처음 틀렸나 (처음 부를 때만 true · 이 탭 동안 기억) */
export function firstWrong(key: string): boolean { if (seen.has(key)) return false; seen.add(key); return true; }
/** 시험용 */
export const resetFirstWrong = () => seen.clear();
