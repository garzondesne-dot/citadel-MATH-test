import type { LessonPack, Question, Room, Store } from '../model/types';
import { chainItems, chainRecord, whyStages } from '../raid/raid';

// 💡 친구에게 힌트 주기 (📜 2026-11-17 #23 · 옛 정식 2026-11-09 #26 · #52 ② 그대로 · js/raid/actions.js giveHint · model.js hintKeyOf · hall.js h-hint · student.js cr-hints)
//   소레이드 근거 줄(why)을 맞힌 학생만 · 근거 줄마다 한 번 · EXP +1 · 저장 = rooms/{방}/players/{나}/hint/{key}(첫 근거 줄 = mid · 둘째부터 mid@단계) = 시각
//   종합실 = 근거 줄마다 처음 준 1명의 용사 머리 위 말풍선 「💡 ○○의 힌트: (근거 문장)」 + 나머지 「👍 +n」 · 학생 폰 = 「💡 친구 힌트 n개」(누를 때만 펼침)
//   수업 끝 기록 hg = 준 힌트 수 · 대시보드 「💡 힌트 준」 · 근거 줄이 없는 소레이드 = 단추 없음
export const hintKeyOf = (items: Question[], mid: string, s: number) => (s === whyStages(items)[0] ? mid : `${mid}@${s}`);
type P = { hint?: Record<string, number>; nick?: string; teacher?: boolean; num?: number };
const players = (R: Room) => (R.players || {}) as Record<string, P>;
/** 이 소레이드의 근거 줄 문항들 (판 0 · 모두 같음) */
export const whyItems = (L: LessonPack, R: Room, mid: string) => chainItems(L, R, mid, '_', 0) || [];
/** 내가 아직 안 준 · 맞힌 근거 줄 (없으면 null) · 이미 하나라도 줬는지 */
export function hintState(L: LessonPack, R: Room, mid: string, uid: string): { next: number | null; gave: boolean; lines: number } {
  const rec = chainRecord(L, R, mid, uid), items = rec.items as Question[], ws = whyStages(items), mine = players(R)[uid]?.hint || {};
  const next = ws.find((s) => rec.whyDone.includes(s) && !mine[hintKeyOf(items, mid, s)]);
  return { next: next ?? null, gave: ws.some((s) => !!mine[hintKeyOf(items, mid, s)]), lines: ws.length };
}
/** 💡 힌트 주기 → 준 근거 줄 단계 · 못 주면 이유 */
export function giveHint(S: Store, L: LessonPack, R: Room, code: string, mid: string, uid: string, s?: number): { ok: true; s: number } | { ok: false; why: string } {
  const rec = chainRecord(L, R, mid, uid), items = rec.items as Question[], mine = players(R)[uid]?.hint || {};
  const k0 = s ?? whyStages(items).find((x) => rec.whyDone.includes(x) && !mine[hintKeyOf(items, mid, x)]);
  if (k0 == null || !rec.whyDone.includes(k0)) return { ok: false, why: '💡 근거 줄을 먼저 맞혀야 힌트를 줄 수 있어요' };
  const key = hintKeyOf(items, mid, k0); if (mine[key]) return { ok: false, why: '이 근거 줄은 이미 힌트를 줬어요' };
  S.set(`rooms/${code}/players/${uid}/hint/${key}`, S.now()); return { ok: true, s: k0 };
}
/** 근거 줄마다 힌트 준 사람 (먼저 준 순) · 나는 뺌(me) */
export function hintLines(L: LessonPack, R: Room, mid: string, me = ''): { s: number; text: string; by: string[]; t: number }[] {
  const items = whyItems(L, R, mid), P0 = players(R);
  return whyStages(items).map((s) => {
    const k = hintKeyOf(items, mid, s), g = Object.entries(P0).filter(([u, p]) => u !== me && p?.hint?.[k] && (!p.teacher || Number(p.num) > 0)).sort((a, b) => Number(a[1].hint![k]) - Number(b[1].hint![k]));
    return { s, text: items[s]?.why?.text ?? '', by: g.map(([u]) => u), t: g.length ? Number(g[0]![1].hint![k]) : 0 };
  }).filter((x) => x.by.length);
}
/** 종합실 말풍선 = 가장 최근에 처음 힌트가 나온 근거 줄 · 첫 1명 + 👍 나머지 */
export function tvHint(L: LessonPack, R: Room, mid: string): { uid: string; nick: string; text: string; more: number; s: number } | null {
  const top = hintLines(L, R, mid).sort((a, b) => b.t - a.t)[0]; if (!top) return null;
  const u = top.by[0]!; return { uid: u, nick: players(R)[u]?.nick || '', text: top.text, more: top.by.length - 1, s: top.s };
}
/** 수업 끝 기록 hg = 이 수업에서 준 힌트 수 */
export const hgOf = (R: Room, uid: string) => Object.keys(players(R)[uid]?.hint || {}).length;
