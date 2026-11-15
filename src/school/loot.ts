// 🎒 오늘의 전리품 = 정식 js/raid/result.js compute · lootOf 그대로 옮김 (📜 2026-11-15 선생님 「너무 간단 허접」 · 머리 🔨 ⑦)
//   rows = 몬스터별 ✔ 처음 맞힘 · 🔁 재도전으로 고침 · ✖ 끝까지 못 맞힘 · 형성평가 · ⚡ 퍼펙트 수 · 고친 문제 하나(fixEx · 수학 노트 카드)
//   loot = ⭐ EXP · 💎(이 수업 뒤에 쌓인 💎 기록 · 강화 뺌) · 📜 서술 조각 · 오늘 받은 💎 / 하루 한도 · 🔓 새 호칭 · 🏰 새 성채 방 · 🎯 다음 목표 · 📕 다시 볼 문제
//   성적이 아님 — 다음에 볼 것을 알려 주는 기록 (정식 문구 그대로)
import type { LessonPack, Question, Room } from '../model/types';
import { activeIds, bossHp, bossState, chainRecord, isChain, itemsFor, mastery, plainRecord } from '../raid/raid';
import { concOf } from './records';
import { G } from './reward';

export type MonRow = { id: string; title: string; tried: boolean; first: number; fixed: number; miss: number; st: 'o' | 'f' | 'x' | '-' | 'n'; n: number; sprite: string };
export interface LootRows {
  mons: MonRow[]; perfects: number; fixed: number; fixEx: { where: string; q: Question; concept: string } | null;
  boss: { tried: boolean; mast: boolean[]; hp: number; won: boolean; share: number; title: string; sprite: string } | null;
  conc: Record<string, [number, number]>; names: Record<string, string>; weak: string[];
}
/** 몬스터별 · 형성평가 · 개념별 (정식 compute) */
export function lootRows(L: LessonPack, R: Room, uid: string, now: number): LootRows {
  let cur = 'review'; const map: Record<string, string> = {};
  for (const s of L.steps) { if (s.kind === 'concept') cur = s.id; if (s.kind === 'monster') map[s.id] = cur; }
  let perfects = 0, fixed = 0, fixEx: LootRows['fixEx'] = null;
  const others = activeIds(R, now).filter((u) => u !== uid);
  const mons = L.steps.filter((s) => s.kind === 'monster' && !s.later && L.monsters[s.id]).map((s): MonRow => {
    const sprite = L.monsters[s.id]?.sprite ?? '';
    let firstOk: boolean[], everOk: boolean[], tried: boolean;
    if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid); firstOk = r.stFirst.map(Boolean); everOk = r.stOk.map(Boolean); tried = r.submitted; }
    else {
      const r = plainRecord(L, R, s.id, uid), f = r.tries[0]; tried = r.submitted;
      firstOk = Array.from({ length: r.total }, (_, i) => !!(f && f.attempt === 0 && f.marks[i]));
      everOk = Array.from({ length: r.total }, (_, i) => r.tries.some((t) => t.marks[i]));
      if (!fixEx) { const i = everOk.findIndex((ok, k) => ok && !firstOk[k]), t = i >= 0 ? r.tries.find((x) => x.marks[i]) : null; const q = t ? itemsFor(L, R, s.id, uid, t.attempt)[i] : null; if (q) fixEx = { where: s.title, q, concept: map[s.id] ?? 'review' }; }
    }
    const fx = everOk.filter((ok, i) => ok && !firstOk[i]).length; fixed += fx;
    if (tried && firstOk.length && firstOk.every(Boolean)) perfects++;
    const sub = (u: string) => (isChain(L, R, s.id) ? chainRecord(L, R, s.id, u).submitted : plainRecord(L, R, s.id, u).submitted);
    const st = tried ? (everOk.every(Boolean) ? (firstOk.every(Boolean) ? 'o' : 'f') : 'x') : others.some(sub) ? '-' : 'n';
    return { id: s.id, title: s.title, tried, first: firstOk.filter(Boolean).length, fixed: fx, miss: everOk.filter((ok) => !ok).length, st, n: everOk.length, sprite };
  });
  let boss: LootRows['boss'] = null;
  if (L.boss) {
    const bs = bossState(L, R, uid), mast = mastery(L, R, uid), hpN = L.boss.hpItems ?? L.boss.items, hp = bossHp(L, R, now), tried = bs.some((x) => x.firstTried);
    fixed += mast.filter((ok, i) => ok && !bs[i]?.first).length;
    boss = { tried, mast, hp: hpN, won: !!hp.won && tried, share: hp.max ? Math.min(100, Math.round((100 * mast.filter(Boolean).length) / hp.max)) : 0, title: L.boss.title, sprite: L.boss.sprite ?? '' };
  }
  const c = concOf(L, R, uid);
  return { mons, perfects, fixed, fixEx, boss, conc: c.conc, names: c.names, weak: c.weak };
}
/** 📕 다시 볼 문제 = 끝까지 못 맞힌 몬스터 + 형성평가 못 맞힌 문항 (정식 lt.review) */
export const reviewN = (r: LootRows) => r.mons.filter((m) => m.st === 'x').length + (r.boss?.tried ? r.boss.mast.slice(0, r.boss.hp).filter((ok) => !ok).length : 0);
type GemLog = Record<string, { g?: number; s?: number; at?: number } | null | undefined>;
/** 💎 · 📜 이 수업 뒤 쌓인 것 (정식: 방을 연 뒤 시각의 gem log · s_ = 서술 조각 · enh_ = 강화는 뺌) */
export function gotSince(log: GemLog | null | undefined, t0: number): { gem: number; scroll: number } {
  let gem = 0, scroll = 0;
  for (const [k, v] of Object.entries(log || {})) { if (!v || Number(v.at) < t0) continue; if (/^s_/.test(k)) scroll += Math.max(0, Number(v.s) || 0); else if (!/^enh_/.test(k) && Number(v.g) > 0) gem += Number(v.g); }
  return { gem, scroll };
}
/** 🎯 다음 목표 (정식): 다음 강화까지 남은 💎 → 없으면 약한 개념 한 번 더 → 성채 */
export function goalOf(enh: number, gemTotal: number, nextCost: number | null, r: LootRows): string {
  if (nextCost != null) { const need = nextCost - gemTotal; return need > 0 ? `⚒ 강화 +${enh + 1}까지 💎 ${need} 남음` : `⚒ 지금 강화 +${enh + 1} 할 수 있어요!`; }
  return r.weak.length ? `📌 「${r.names[r.weak[0]!] || r.weak[0]}」 한 번 더 보기` : '🏰 성채던전 새 방에 도전';
}
/** 💎 기록이 아직 없을 때(이 기기 · 테스트) 정식 추정 = 참여 + 맞힌 수(12까지) + 퍼펙트 + 형성평가 만점 */
export const gemGuess = (correct: number, perfects: number, bossPerfect: boolean) => G.join + Math.min(G.solvedMax, correct) + (perfects > 0 ? G.perfect : 0) + (bossPerfect ? G.bossPerfect : 0);
export const DAY_CAP = G.dayCap;
