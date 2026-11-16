// 💡 도움 3단 (📜 2026-11-15 선생님 · DECISIONS 「💡 도움 3단」 · 머리 🔨)
//   팩 문항 선택 칸 help = { concept, first?, example?: { q, sol } } · 1단 = 개념 한 줄 → 2단 = 빈칸 하나 남긴 풀이 첫 줄 → 3단 = 비슷한 예제와 풀이
//   무료 · 칼(공격 기회) · 힐 · 보상 안 씀 · 연 단계만 기록(players/{나}/hp/{몬스터}_{문항} = 가장 높이 연 단계) · 3단 뒤 「✋ 손들어 선생님께」(players/{나}/hand = 몬스터)
//   숫자 바뀐 판 = 개념 · 예제는 첫 판 그 문항 것 그대로 · first(그 판 숫자)는 생성기가 붙여 준 문항만 · 없으면 2단 숨김 · 👑 형성평가는 도움 3단을 열지 않음
//   help 없는 문항 = 지금 💡 힌트(📘 이 문제의 개념) 그대로
import type { Help, LessonPack, Question, Room, Store } from '../model/types';
import { chainItems } from '../engine/lessons';
import { anySolved, gobiTarget } from './gobi';
import { BOSS_ID, bossHp, cleared } from '../raid/raid';
import { setDemo } from '../raid/actions';

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
export function noteHelp(S: Store, code: string, uid: string, mid: string, i: number | 'c', stage: number): void { // i = 'c' = 옛 💡 힌트 한 장(개념 카드) = 1단과 같은 칸 (📜 2026-11-17)
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
/** 🔎 리모컨 「풀이」 단추 하나 = 교사 폰 · 종합실 막대가 같이 씀 (📜 2026-11-17 #13 🪞 · #14 📊 우리 반 고비)
 *  누를 때마다 다음 장: ① 📊 우리 반 고비(i = -2 · 지금 몬스터 · 👑 문항별 · 마무리 = 오늘 고비 3곳) → ② 🔎 자주 하는 실수(팩 풀이 · 몬스터가 쓰러진 뒤만) → 닫기
 *  단추 = 반이 몬스터를 하나라도 풀었으면 모든 차시에서 늘 보임(준비된 풀이가 없어도) */
export function reviewStep(L: LessonPack, R: Room | null | undefined, _mid: string | null, now = Date.now()) {
  const target = R && anySolved(R) ? gobiTarget(L, R) ?? '_day' : null;
  const alive = !!R && !!target && target !== '_day' && (target === BOSS_ID ? !bossHp(L, R, now).won : !cleared(L, R, target, now));
  const revs = R && target && target !== '_day' && target !== BOSS_ID && !alive ? reviewsOf(L, target) : [];
  const deck = target ? [{ mid: target, i: -2, k: 0 }, ...revs.map((x) => ({ mid: target, i: x.i, k: x.k }))] : [];
  const cur = R?.state.review && R.state.review.mid === target ? R.state.review : null;
  const idx = cur ? deck.findIndex((x) => x.i === cur.i && x.k === cur.k) : -1;
  return { revs, deck, target, cur, idx, show: deck.length > 0, gobi: !!cur && cur.i === -2, label: !cur ? '풀이' : cur.i === -2 ? '고비' : `${idx}/${revs.length}`, next: deck[idx + 1] ?? null };
}
/** 「🔎 풀이」 누름 = 다음 장 · 📊 고비가 떠 있는 동안 몬스터 공격 시계 멈춤(시연과 같은 멈춤 · 빨간 WARNING 없음) · 닫으면 다시 */
export function stepReview(S: Store, code: string, L: LessonPack, R: Room, now = Date.now()): void {
  const rv = reviewStep(L, R, null, now);
  S.set(`rooms/${code}/state/review`, rv.next);
  setDemo(S, code, !!rv.next && rv.next.i === -2);
}
/** 🧱 「n칸 3명 막힘」 띠의 📊 고비 보기 = 바로 그 몬스터 고비 장 (시계 멈춤 같음) */
export function openGobi(S: Store, code: string, mid: string): void { S.set(`rooms/${code}/state/review`, { mid, i: -2, k: 0 }); setDemo(S, code, true); }

/** 📊 수업 끝 기록 💡 (📜 2026-11-17 미래교육상 ① · 옛 정식 records hints): 칸(몬스터 · 소문항)마다 연 가장 높은 단계 → [1단 이상 · 2단 이상 · 3단] 칸 수 · hints = 1단 이상(💡 연 칸 수 · 옛 💡 힌트 한 장 포함) */
export function helpCount(R: Room, uid: string): { hints: number; help: [number, number, number] } {
  const hp = ((R.players?.[uid] as { hp?: Record<string, number> } | undefined)?.hp) || {}, v = Object.values(hp).map(Number).filter((x) => x > 0);
  const help: [number, number, number] = [v.filter((x) => x >= 1).length, v.filter((x) => x >= 2).length, v.filter((x) => x >= 3).length];
  return { hints: help[0], help };
}
