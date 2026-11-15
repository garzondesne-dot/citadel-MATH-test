// 💡 도움 3단 (📜 2026-11-15 선생님 · DECISIONS 「💡 도움 3단」 · 머리 🔨)
//   팩 문항 선택 칸 help = { concept, first?, example?: { q, sol } } · 1단 = 개념 한 줄 → 2단 = 빈칸 하나 남긴 풀이 첫 줄 → 3단 = 비슷한 예제와 풀이
//   무료 · 칼(공격 기회) · 힐 · 보상 안 씀 · 연 단계만 기록(players/{나}/hp/{몬스터}_{문항} = 가장 높이 연 단계) · 3단 뒤 「✋ 손들어 선생님께」(players/{나}/hand = 몬스터)
//   숫자 바뀐 판 = 개념 · 예제는 첫 판 그 문항 것 그대로 · first(그 판 숫자)는 생성기가 붙여 준 문항만 · 없으면 2단 숨김 · 👑 형성평가는 도움 3단을 열지 않음
//   help 없는 문항 = 지금 💡 힌트(📘 이 문제의 개념) 그대로
import type { Help, LessonPack, Question, Room, Store } from '../model/types';
import { chainItems } from '../engine/lessons';

/** 그 문항의 도움 (없으면 null) · i = 몬스터 안 문항 번호(소레이드 = 단계)
 *  문항 칸 help 가 먼저 · 없으면 몬스터 칸 help(13차시 덧칸 꼴) · first = 첫 출제 판(판 0) 문항일 때만(소문항마다 배열이면 그 칸) · 숫자 바뀐 판 = concept · example 만 */
export function helpOf(L: LessonPack, mid: string, i: number, q: Question | null | undefined): Help | null {
  if (!q || mid === 'boss' || !L.monsters[mid]) return null;
  const m = L.monsters[mid]!, base = (m.first?.[i] ?? (m.chain ? chainItems(L, mid, '', 0)[i] : null)) as Question | null | undefined;
  const firstRound = !!base && base.question === q.question && JSON.stringify((base as { answer?: unknown }).answer ?? (base as { answers?: unknown }).answers ?? null) === JSON.stringify((q as { answer?: unknown }).answer ?? (q as { answers?: unknown }).answers ?? null);
  // 📜 2026-11-16 꼴별: 찾는 순서 = 그 판 문항 help → 첫 판 그 문항 help → helps[문항 kind] → 몬스터 help · first = 그 판 문항 help 에 있으면 · 아니면 첫 판일 때만(첫 판 문항 → 꼴 → 몬스터 · 배열이면 소문항 번호)
  const own = q.help?.concept ? q.help : null, kind = q.kind ?? (firstRound ? base?.kind : undefined), byKind = kind && m.helps?.[kind]?.concept ? m.helps[kind]! : null;
  const bh = base?.help?.concept ? base.help : null, src = own ?? (firstRound ? bh : null) ?? byKind ?? bh ?? (m.help?.concept ? m.help : null); // 꼴 없는 숫자 바뀐 판 = 첫 판 그 문항 help(예전 규칙)
  if (!src) return null;
  const pick = (h: Help | null | undefined) => (h?.first == null ? null : Array.isArray(h.first) ? (h.first[i] ?? null) : h.first);
  const f = own ? pick(own) : firstRound ? (pick(base?.help) ?? pick(byKind) ?? pick(m.help)) : null;
  const example = src.example ?? (src !== m.help ? m.help?.example : undefined);
  return { concept: src.concept, ...(f ? { first: f } : {}), ...(example ? { example } : {}) };
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
/** 🔎 그 몬스터의 익명 풀이 목록 (첫 판 문항 · 소레이드 단계) — [{ i: 문항, k: 풀이 번호, r }] */
export function reviewsOf(L: LessonPack, mid: string): { i: number; k: number; r: import('../model/types').Review }[] {
  const m = L.monsters[mid]; if (!m) return [];
  const qs = (m.first ?? (m.chain ? chainItems(L, mid, '', 0) : [])) as Question[];
  // 몬스터 칸(i = −1) 먼저 = 첫 판 문항 꼴 순서의 꼴별 풀이 → 나머지 꼴 → 몬스터 풀이 (📜 2026-11-16) · 그다음 문항 칸
  const kinds = [...new Set([...qs.map((q) => q?.kind).filter((x): x is string => !!x), ...Object.keys(m.reviewsBy || {})])];
  const mon = [...kinds.flatMap((kd) => m.reviewsBy?.[kd] || []), ...(m.reviews || [])];
  return [...mon.map((r, k) => ({ i: -1, k, r })), ...qs.flatMap((q, i) => (q?.review || []).map((r, k) => ({ i, k, r })))];
}
