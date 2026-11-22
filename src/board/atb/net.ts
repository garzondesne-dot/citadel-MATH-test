// 📡 게시판 던전(ATB) ↔ 베타 학생 게시판 (📜 요청 #48 · #51 · 서버 칸 = docs/board-atb/SERVER-v1.md) — 순수 계산 (화면 · 서버 없음)
//   방장 폰 = 엔진(진짜 상태) · 다른 폰 = 내 행동(act)만 보냄 · 방장이 상태 요약(snap)을 0.2초마다 씀 · 각 폰은 snap 으로 그림
//   문제 풀이 · 채점 = 각자 폰(정답은 각자 판정 · 결과 earn 만 보냄) · 방장 나감 = 다음 사람 · 끊긴 자리 = 봇이 이어받음
import { askHelp, attack, earn, missionOf, sendHelp, newBattle, useSkill, type SkillK, type State, type Timing } from './engine';
import { statsOf } from './heroes';
import type { BossCfg, Diff } from './tune';
import type { BotKind } from './bots';
import { gradeOf } from '../board';
import { STAR } from '../goals';

/** 자리 하나 = 학생(uid · 반 · 번호 · 용사) 또는 봇 */
export type HumanSlot = { uid: string; cls: string; num: number; hero: number; lv: number; enh: number; tier: number; fx?: string; awk?: boolean; nick?: string; /** 🛡 #103 수호자 (글 mem role 'g') */ gd?: boolean };
export type BotSlot = { bot: BotKind; hero: number; lv?: number; enh?: number; tier?: number; fx?: string };
export type Slot = HumanSlot | BotSlot;
export const isBot = (s: Slot): s is BotSlot => 'bot' in s;
/** atb/{pid}/meta (출발 때 방장 1번 · 손발 #1) */
export interface Meta { v: 1; pid: string; lid: string; no: number; diff: Diff; seed: number; t0: number; slots: Slot[] }
/** atb/{pid}/act/{uid}/{q} · q = 그 학생 행동 번호(1, 2, 3 …) · s = 자리 번호 */
export type Act =
  | { k: 'atk'; s: number; timing: Timing; auto?: boolean }
  | { k: 'skill'; s: number; sk: SkillK; to?: number }
  | { k: 'earn'; s: number; e: { done: boolean; perfect: boolean; right: boolean; miss?: number; skip?: boolean } }
  /** 🗺 정찰 「준비 완료」 (요청 #69 · 엔진 밖 · 방장이 모아 go 시각을 정함) */ | { k: 'ready'; s: number }
  /** 🛡 #103 도와줘 · 수호자가 힌트 보냄 */ | { k: 'ask'; s: number } | { k: 'aid'; s: number; to: number };
/** atb/{pid}/snap (방장만 · 5Hz) · j = 상태 JSON 글자(서버가 빈 배열을 지우지 않게) · ack = 학생마다 처리한 마지막 행동 번호 */
export interface Snap { v: 1; n: number; t: number; host: string; at: number; ack: Record<string, number>; j: string }
export const NET = { snapMs: 200, hbMs: 3000, lostMs: 10000, evKeep: 40 } as const;

/** 판 만들기 (모든 폰이 같은 meta → 같은 첫 상태) */
export function battleOf(meta: Meta, boss: BossCfg, nameOf: (s: Slot, i: number) => string = (s) => String(s.hero)): State {
  const party = meta.slots.map((s, i) => statsOf({ hero: s.hero, lv: s.lv ?? 1, enh: s.enh ?? 1, tier: s.tier ?? 1, awk: !isBot(s) && !!s.awk, name: nameOf(s, i) }));
  const S = newBattle({ boss, diff: meta.diff, party, seed: meta.seed });
  meta.slots.forEach((s, i) => { if (!isBot(s) && s.gd && S.heroes[i]) S.heroes[i]!.gd = true; }); /* 🛡 #103 봇 = 수호자 아님 */
  return S;
}
/** 자리 번호 ↔ uid */
export const slotOf = (meta: Meta, uid: string): number => meta.slots.findIndex((s) => !isBot(s) && s.uid === uid);
export const humans = (meta: Meta): HumanSlot[] => meta.slots.filter((s): s is HumanSlot => !isBot(s));

/** 방장 엔진 = 행동 하나 처리 (틀린 자리 · 끝난 판 = 무시) */
export function applyAct(S: State, a: Act): boolean {
  if (S.end || !S.heroes[a.s]) return false;
  if (a.k === 'atk') return attack(S, a.s, a.timing, !!a.auto);
  if (a.k === 'skill') return useSkill(S, a.s, a.sk, a.to);
  if (a.k === 'ready') return false;
  if (a.k === 'ask') return askHelp(S, a.s);
  if (a.k === 'aid') return sendHelp(S, a.s, a.to);
  earn(S, a.s, a.e); return true;
}

/** 상태 요약 쓰기 = 사건 마지막 40개 · 균형 기록 큰 배열 뺌 */
export function encodeSnap(S: State, host: string, at: number, ack: Record<string, number>): Snap {
  const lite = { ...S, ev: S.ev.slice(-NET.evKeep), rec: { ...S.rec, subSec: [], lastAns: S.rec.lastAns.map(() => 0) } };
  return { v: 1, n: S.evN, t: +S.t.toFixed(2), host, at, ack: { ...ack }, j: JSON.stringify(lite) };
}
export function decodeSnap(sn: Snap): State | null { try { const S = JSON.parse(sn.j) as State; return S && Array.isArray(S.heroes) ? S : null; } catch { return null; } }
/** 받은 상태를 지금 상태 객체에 그대로 덮어씀 (같은 객체 = 화면 반응성 유지) */
export function overwrite(dst: State, src: State): void { for (const k of Object.keys(dst) as (keyof State)[]) if (!(k in src)) delete (dst as unknown as Record<string, unknown>)[k]; Object.assign(dst, src); }

/** 방장 고르기: 지금 방장이 살아 있으면 그대로 · 아니면 자리 순서대로 살아 있는 첫 학생 */
export function pickHost(meta: Meta, hb: Record<string, number> | null, now: number, cur: string | null, left: Record<string, number> | null = null): string | null {
  const alive = (u: string) => now - (hb?.[u] ?? 0) < NET.lostMs && !left?.[u]; /* 🚪 #113 ‹ 로 나간 사람 = 방장 못 함 */
  if (cur && alive(cur)) return cur;
  return humans(meta).find((s) => alive(s.uid))?.uid ?? null;
}
/** 🗺 정찰 끝 = 모두 준비(봇 · 끊긴 자리 = 준비로 셈) 또는 정찰 시간 끝 (요청 #69) */
export function introDone(meta: Meta, ready: Iterable<number>, hb: Record<string, number> | null, now: number, scoutEnd: number, left: Record<string, number> | null = null): boolean {
  if (now >= scoutEnd) return true; const r = new Set(ready), lost = new Set(lostSlots(meta, hb, now, left));
  return meta.slots.every((s, i) => isBot(s) || lost.has(i) || r.has(i));
}
/** 끊긴 학생 자리 · 🚪 #113 ‹ 로 나간 자리(바로 · 돌아와도 안 돌려줌) = 봇이 이어받음 */
export const lostSlots = (meta: Meta, hb: Record<string, number> | null, now: number, left: Record<string, number> | null = null): number[] => meta.slots.map((s, i) => (!isBot(s) && (!!left?.[s.uid] || now - (hb?.[s.uid] ?? 0) >= NET.lostMs) ? i : -1)).filter((i) => i >= 0);

// ── 📜 요청 #51 판 결과 = 공적 · 판당 💎 · ⭐ 골고루 돌기 (atb/{pid}/end/{uid}) ──
export const MERIT = { clear: 10, star: 5, first: 1, act: 2, role: 5 } as const;
export const GEM = { perItem: 3, itemMax: 30, clear: 10, perGuard: 2, guardMax: 10, star: 20 } as const;
export interface AtbEnd {
  win: boolean; sec: number; right: number; total: number; first: number; perfect: number; stars: number; newStars: number; /** ⭐3 다 모은 차시 = 공적 · 💎 절반 */ full: boolean;
  merit: { clear: number; star: number; first: number; act: number; role: number }; meritSum: number;
  gem: { items: number; clear: number; guard: number; star: number }; gemSum: number;
  role: string; mission: boolean; why: string; /** ⏭ #123 넘긴 소문항 수 */ skip?: number; /** 🚪 #113 ‹ 로 도중에 나감 = 맞힌 소문항 몫 💎 만 · 판 기록 「나감」 */ left?: boolean;
  /** 📋 이 판 내 용사 활약 횟수 (대시보드 · 손발 #1 #56) · block = 엄호 · 결계(끊기 뺌) */ acts: { block: number; /** 🤝 #103 · #104 구조 성공 = 내가 보낸 힌트로 친구가 맞힌 횟수 (수호 명성) */ rescue: number; cut: number; brk: number; /** 💚 큰 힐 구조 (30% 아래 친구 · 옛 rescue) */ heal?: number; /** 🛡 실드 깨기 (스킬 2 · 도움표 · 깬 칸 수 · 📜 #101 뒤 대시보드 칸) */ shd?: number };
  /** 📕 #67 내가 소문항을 하나라도 맞힌 몬스터 칸 (복습 완료 · 손발 #1 화면이 채움 · 없으면 없음) */ mids?: string[];
}
/** 내 판 결과 · prevStars = 그 차시 지금까지 최고 별(0 ~ 3) */
export function atbResultFor(S: State, idx: number, ctx: { prevStars: number; left?: boolean }): AtbEnd {
  if (ctx.left) { const r = atbResultFor(S, idx, { prevStars: ctx.prevStars }), z = <T extends Record<string, number>>(o: T): T => Object.fromEntries(Object.keys(o).map((k) => [k, 0])) as T; return { ...r, win: false, stars: 0, newStars: 0, merit: z(r.merit), meritSum: 0, gem: { ...z(r.gem), items: r.gem.items }, gemSum: r.gem.items, mission: false, why: '나감', left: true, acts: z(r.acts) }; } /* 🚪 #113 나간 사람 = 맞힌 소문항 몫만 · 클리어 · 공적 · 수호 명성(acts) 없음 */
  const h = S.heroes[idx]!, g = h.log, win = !!S.end?.win, f = g.first ?? { ok: 0, bad: 0, none: 0, total: 0 };
  const stars = win && f.total > 0 ? (STAR[gradeOf(f)] ?? 0) : 0, prev = Math.max(0, Math.min(3, ctx.prevStars | 0)), newStars = Math.max(0, stars - prev), full = prev >= 3;
  const k = (x: number) => (full ? Math.floor(x / 2) : x), M = missionOf(S, idx);
  const merit = { clear: k(win ? MERIT.clear : 0), star: newStars * MERIT.star, first: k(f.ok * MERIT.first), act: k(((g.blocks ?? 0) + (g.rescues ?? 0) + (g.brk ?? 0)) * MERIT.act), role: k(M.done ? MERIT.role : 0) };
  const guardN = g.covers + g.heals + g.revives + g.shields + (g.blocks ?? 0) + (g.rescues ?? 0);
  const gem = { items: k(Math.min(GEM.itemMax, g.right * GEM.perItem)), clear: k(win ? GEM.clear : 0), guard: S.end?.why === '후퇴' ? 0 : k(Math.min(GEM.guardMax, guardN * GEM.perGuard)), /* 📜 #92 후퇴 = 맞힌 문제 몫 💎 만 (클리어 · 수호 💎 없음 · 벌 없음) */ star: newStars * GEM.star };
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  return { win, sec: Math.round(S.end?.t ?? S.t), right: g.right, total: f.total, first: f.ok, perfect: g.perfect ?? 0, stars, newStars, full, merit, meritSum: sum(merit), gem, gemSum: sum(gem), role: h.s.role, mission: M.done, why: S.end?.why ?? '', ...(g.skips ? { skip: g.skips } : {}), acts: { block: Math.max(0, (g.blocks ?? 0) - (g.cuts ?? 0)), rescue: g.aids ?? 0, heal: g.rescues ?? 0, cut: g.cuts ?? 0, brk: g.brk ?? 0, shd: g.shields ?? 0 } };
}
