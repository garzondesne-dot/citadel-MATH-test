// 🔓 조건 해금 용사 · 🏆 업적 이펙트 (🐞 11/19 ④ · 옛 정식 js/raid/account.js looks() · chalProgress() 그대로 옮김)
//   v1.0 으로 옮길 때 표(hero-data.json chal · cond)만 오고 셈이 빠져 → 콤파 · 아바쿠 · 폴라 · 바루가 조건을 채워도 영원히 잠겼음
//   기록에서 그때그때 셈 (따로 저장하지 않음 · titles.ts 와 같은 길) · 💎 돌려받기(도감 용사를 💎 로 먼저 연 뒤 다 모음)는 선생님 결정 뒤
//   📚 도감 특전: 8 발도르 = 1~3차시(나중에 넣은 카드 subcount 뺌) · 10 셰라 = 4~6차시 · 11 리라 = 8~11차시 — 다 모으면 무료
//   🎁 9 바루 = 첫 레이드(수업 기록이 하나라도) · 🏆 도전: 27 아바쿠 = 형성평가 만점 서로 다른 차시 3 · 28 콤파 = 성채 방 10 · 33 폴라 = 오답노트 해결 15
//   ✨ 업적 이펙트 = 🏆 업적(인장) 1 · 2 · 4 · 6 · 8 · 10 개마다 Ⅲ 단계 하나(fancy) — 그 칸을 「가진 것」으로(아래 칸도 함께 · 정식 #78)
import DATA from './hero-data.json';
import { SUBJ } from '../engine/subject';
import { PACKS } from '../engine/packs';
import { noteOf, type Bon, type Rec } from '../school/dummy';
import { seals, type TitleData } from './titles';
import type { LessonPack } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
export const CHAL_NEED: Record<number, number> = Object.fromEntries(DATA.heroes.filter((h) => (h as { chal?: { need: number } }).chal).map((h) => [h.id, (h as unknown as { chal: { need: number } }).chal.need]));
export const CARD_HEROES = [8, 10, 11] as const;
export const FIRST_RAID_HERO = 9;
const cards = () => (SUBJ.forge?.unit.CARDS || []) as { id: string; no?: number }[];
/** 도감 용사마다 모아야 할 카드 */
export function cardNeed(id: number): string[] {
  const C = cards(), r = (a: number, b: number) => C.filter((c) => (c.no ?? 0) >= a && (c.no ?? 0) <= b).map((c) => c.id);
  if (id === 8) return C.filter((c) => (c.no ?? 0) <= 3 && c.id !== 'subcount').map((c) => c.id);
  if (id === 10) return r(4, 6);
  if (id === 11) return r(8, 11);
  return [];
}
/** 수업 차시(형성평가가 있는 · 평가 층 아님) */
const lessons = (packs: LessonPack[]) => packs.filter((L) => L.no && !L.id.startsWith('eval-') && !L.partOf && L.boss);
/** 🏆 도전 진행 (정식 chalProgress) */
export function chalProgress(d: TitleData, packs: LessonPack[] = PACKS): Record<number, number> {
  const rec = (d.records || {}) as Record<string, Rec & { bossN?: number }>, bon = (d.bonus || {}) as unknown as Record<string, Bon>;
  const les = lessons(packs);
  const perfect = les.filter((L) => {
    const r = rec[L.id], hp = Number(L.boss?.hpItems ?? L.boss?.items) || 0;
    return (!!r && Number(r.boss) > 0 && Number(r.boss) >= (Number(r.bossN) || hp)) || !!bon[L.id]?.boss?.clear;
  }).length;
  let rooms = 0; for (const [k, v] of Object.entries(bon)) if (k.startsWith('eval-') && isObj(v)) for (const x of Object.values(v)) if (isObj(x) && x.clear) rooms++;
  let fixed = 0; for (const L of les) { const r = rec[L.id]; if (!r) continue; const x = noteOf(L, r, bon[L.id]); fixed += x.mons.filter((s) => s === 'p').length + x.boss.slice(0, x.hp).filter((s) => s === 'p').length; }
  return { 27: perfect, 28: rooms, 33: fixed };
}
export interface HeroUnlock {
  /** 조건으로 열린 용사 */ open: number[];
  /** 🏆 도전 용사 진행 n / need */ chal: Record<number, { n: number; need: number }>;
  /** 📚 도감 용사 진행 */ cards: Record<number, { n: number; need: number }>;
  /** 🏆 업적 수 */ seals: number;
  /** ✨ 업적으로 받은 Ⅲ 이펙트 id */ fx: string[];
}
export function heroUnlock(d: TitleData, packs: LessonPack[] = PACKS): HeroUnlock {
  const open: number[] = [], chal: HeroUnlock['chal'] = {}, cardP: HeroUnlock['cards'] = {};
  const owned = isObj(d.cards) ? d.cards : {};
  for (const id of CARD_HEROES) { const need = cardNeed(id), n = need.filter((k) => owned[k]).length; cardP[id] = { n, need: need.length }; if (need.length > 0 && n === need.length) open.push(id); }
  if (Object.keys(d.records || {}).length > 0) open.push(FIRST_RAID_HERO);
  const cp = chalProgress(d, packs);
  for (const [k, need] of Object.entries(CHAL_NEED)) { const id = Number(k), n = cp[id] || 0; chal[id] = { n: Math.min(n, need), need }; if (n >= need) open.push(id); }
  const s = seals(d.bonus).length, fx = (DATA.fancy as string[]).filter((_, i) => s >= ((DATA.unlock as number[])[i] ?? Infinity));
  return { open: open.sort((a, b) => a - b), chal, cards: cardP, seals: s, fx };
}
/** 잠긴 용사 조건 한 줄 (진행 포함 · 정식 「🔓 조건 · n / need」) */
export function condLine(id: number, u: HeroUnlock | null, base: string): string {
  if (!u) return base;
  const c = u.chal[id]; if (c) return `${base} · ${c.n} / ${c.need}`;
  const k = u.cards[id]; if (k && k.need) return `${base} · 도감 ${k.n} / ${k.need}장`;
  return base;
}

/** 📊 용사 상태창 누적 (정식 camp.js statsOf · 정답률 · 순위 없음 · 쌓이기만) */
export function statsOf(d: TitleData): Record<string, number> {
  const R = Object.values(d.records || {}).filter(isObj), n = (v: unknown) => Number(v) || 0;
  const tries = Object.values(d.bonus || {}).reduce((a, l) => a + Object.values(isObj(l) ? l : {}).reduce((b, m) => b + n(isObj(m) ? (m as Obj).tries : 0), 0), 0);
  return {
    str: R.reduce((a, r) => a + Object.values(isObj(r.conc) ? r.conc : {}).reduce<number>((b, v) => b + n(Array.isArray(v) ? v[0] : 0), 0) + n(r.boss), 0),
    grit: R.reduce((a, r) => a + n(r.fixed), 0), focus: R.reduce((a, r) => a + n(r.perfects), 0), brave: R.filter((r) => !!r.won).length,
    explore: tries, craft: Object.keys(isObj(d.cards) ? d.cards : {}).length,
  };
}
/** 🎖 메달 수 (쉼터 놀이 메달 합) */
export const medalN = (d: TitleData) => Object.values(isObj(d.gem?.medal) ? (d.gem!.medal as Obj) : {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
