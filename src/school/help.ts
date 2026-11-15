// 💡 도움 3단 (📜 2026-11-15 선생님 · DECISIONS 「💡 도움 3단」 · 머리 🔨)
//   팩 문항 선택 칸 help = { concept, first?, example?: { q, sol } } · 1단 = 개념 한 줄 → 2단 = 빈칸 하나 남긴 풀이 첫 줄 → 3단 = 비슷한 예제와 풀이
//   무료 · 칼(공격 기회) · 힐 · 보상 안 씀 · 연 단계만 기록(players/{나}/hp/{몬스터}_{문항} = 가장 높이 연 단계) · 3단 뒤 「✋ 손들어 선생님께」(players/{나}/hand = 몬스터)
//   숫자 바뀐 판 = 개념 · 예제는 첫 판 그 문항 것 그대로 · first(그 판 숫자)는 생성기가 붙여 준 문항만 · 없으면 2단 숨김 · 👑 형성평가는 도움 3단을 열지 않음
//   help 없는 문항 = 지금 💡 힌트(📘 이 문제의 개념) 그대로
import type { Help, LessonPack, Question, Room, Store } from '../model/types';
import { chainItems } from '../engine/lessons';

/** 그 문항의 도움 (없으면 null) · i = 몬스터 안 문항 번호(소레이드 = 단계) */
export function helpOf(L: LessonPack, mid: string, i: number, q: Question | null | undefined): Help | null {
  if (!q || mid === 'boss' || !L.monsters[mid]) return null;
  if (q.help?.concept) return q.help;
  const m = L.monsters[mid]!, base = (m.first?.[i] ?? (m.chain ? chainItems(L, mid, '', 0)[i] : null)) as Question | null | undefined;
  const h = base?.help; if (!h?.concept) return null;
  return { concept: h.concept, ...(h.example ? { example: h.example } : {}) }; // 숫자 바뀐 판 = 개념 · 예제만 (first 는 그 판 숫자가 아니라서 숨김)
}
const ck = (s: string) => s.replace(/[.#$/[\]]/g, '_');
/** 연 단계 기록 (가장 높이 연 것만 · 덮어쓰기 없음) */
export function noteHelp(S: Store, code: string, uid: string, mid: string, i: number, stage: number): void {
  const p = `rooms/${code}/players/${uid}/hp/${ck(`${mid}_${i}`)}`, had = Number(S.get<number>(p)) || 0;
  if (stage > had) S.set(p, stage);
}
/** ✋ 손들기 (3단 뒤) — 교사 리모컨 🙋 줄에 들어감 · 교사가 칩을 누르면 내려감 */
export const raiseHand = (S: Store, code: string, uid: string, mid: string) => S.set(`rooms/${code}/players/${uid}/hand`, { mid, at: S.now() });
export const lowerHand = (S: Store, code: string, uid: string) => S.set(`rooms/${code}/players/${uid}/hand`, null);
/** 지금 몬스터에서 손든 학생 */
export const handsOf = (R: Room, mid: string): string[] => Object.entries((R.players || {}) as Record<string, { hand?: { mid?: string } | null }>).filter(([, p]) => p?.hand?.mid === mid).map(([u]) => u);
