import type { LessonPack, Room } from '../model/types';
import { BOSS_ID, bossRecord, bossState, chainRecord, isChain, plainRecord, V4 } from '../raid/raid';

// 👥 학생판 (📜 2026-11-17 #24 · DECISIONS hero-v2 「👥 리모컨 학생판 …」 · 시안 WvA9oZWgb2oo45P8AfRmGG)
//   학생 칸 = 번호 + 이름(성 뺌) + ⚔ 칼 4칸(남은 · 쓴) + 진행 막대(이 몬스터 소문제 맞힌 몫 · 소레이드 = 단계)
//   배치 = 늘 4줄 · 한 줄 칸 수 = max(5, ceil(인원 / 4)) 최대 7 · 29명부터 7칸 + 판 안 세로 밀기
//   「오늘」 = 학생 × 몬스터(✔ · n/m · ·) + 오늘 재도전 합계 · 「막힌 순」 = 재도전 많은 순

/** 성 뺀 이름 · 한 글자 이름(두 글자 이름 = 성 + 한 글자)은 그대로 · 🤖 가상 학생 이름(·)은 그대로 */
export const givenName = (name: string) => { const s = (name || '').trim(); return s.startsWith('·') || s.length <= 2 ? s : s.slice(1); };
/** 한 줄 칸 수 = max(5, ceil(n / 4)) · 최대 7 */
export const boardCols = (n: number) => Math.min(7, Math.max(5, Math.ceil(n / 4)));
/** 4줄을 넘으면 판 안에서 세로 밀기 */
export const boardScroll = (n: number) => n > boardCols(n) * 4;
export const SWORDS = 4;

export interface Cell { /** 남은 칼 */ left: number; /** 칼 칸 수 */ slots: number; /** 0 ~ 1 */ prog: number; /** 다 맞힘 */ done: boolean; /** ⚔0 = 칼을 다 썼는데 못 마침 */ zero: boolean; /** 이 몬스터에서 틀린(칼 쓴) 횟수 */ wrong: number; /** 낸 적 있음 */ sub: boolean; /** 맞힌 소문제(단계) · 전체 */ got: number; of: number; /** 칼 표시 없음(옛 보스 꼴) */ noSword?: boolean }
/** 지금 몬스터(또는 👑) 한 학생 칸 */
export function cellOf(L: LessonPack, R: Room, mid: string, uid: string): Cell {
  if (mid === BOSS_ID) {
    if (V4(R)) { const b = bossRecord(L, R, uid), w = Math.max(0, b.slots - b.left); return { left: b.left, slots: b.slots, prog: b.hpN ? Math.min(1, b.solved.filter((i) => i < b.hpN).length / b.hpN) : 0, done: b.done, zero: b.out, wrong: w, sub: b.subs > 0, got: b.solved.filter((i) => i < b.hpN).length, of: b.hpN }; }
    const s = bossState(L, R, uid), ok = s.filter((x) => x.ok).length; return { left: 0, slots: 0, prog: s.length ? ok / s.length : 0, done: s.length > 0 && ok === s.length, zero: false, wrong: s.reduce((a, x) => a + Math.max(0, x.n - (x.ok ? 1 : 0)), 0), sub: s.some((x) => x.n > 0), got: ok, of: s.length, noSword: true };
  }
  if (!L.monsters[mid]) return { left: 0, slots: 0, prog: 0, done: false, zero: false, wrong: 0, sub: false, got: 0, of: 0, noSword: true };
  if (isChain(L, R, mid)) { const r = chainRecord(L, R, mid, uid); return { left: Math.ceil(r.left), slots: r.slots, prog: r.n ? r.stage / r.n : 0, done: r.done, zero: !r.done && r.submitted && r.left <= 0, wrong: r.wrong, sub: r.submitted, got: r.stage, of: r.n }; }
  const r = plainRecord(L, R, mid, uid), wrong = r.tries.filter((t) => !(t.total > 0 && t.correct === t.total)).length;
  return { left: r.left, slots: r.slots, prog: r.total ? r.best / r.total : 0, done: r.perfect, zero: !r.perfect && r.submitted && r.left <= 0, wrong, sub: r.submitted, got: r.best, of: r.total };
}
/** ⚔ 칼 4칸 = 남은 칸 수(4칸 안) · 넘치면 +n */
export const swordDots = (c: Cell) => { const on = Math.max(0, Math.min(SWORDS, c.left)); return { on, off: SWORDS - on, more: Math.max(0, c.left - SWORDS) }; };

/** 오늘 몬스터 줄 = 수업 단계 순서의 몬스터 + 👑 (나중 단계 · 몬스터 없는 칸 뺌) */
export function todayCols(L: LessonPack): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = []; let k = 0;
  for (const s of L.steps) { if (s.later) continue; if (s.kind === 'monster' && L.monsters[s.id]) out.push({ id: s.id, label: (/문제\s*\d+/.exec(s.title ?? '')?.[0] ?? `몬스터 ${++k}`).replace(/\s+/, '') }); else if (s.kind === 'boss' && L.boss) out.push({ id: BOSS_ID, label: '👑' }); }
  return out;
}
export type DayMark = { t: 'ok' | 'part' | 'none'; text: string };
/** 오늘 한 학생 = 몬스터마다 ✔ · n/m · · + 재도전 합계 */
export function todayRow(L: LessonPack, R: Room, uid: string, cols = todayCols(L)): { marks: DayMark[]; retry: number; okN: number; partN: number } {
  let retry = 0, okN = 0, partN = 0;
  const marks = cols.map(({ id }): DayMark => {
    const c = cellOf(L, R, id, uid); retry += c.wrong;
    if (c.done) { okN += 1; return { t: 'ok', text: '✔' }; }
    if (!c.sub) return { t: 'none', text: '·' };
    partN += 1; return { t: 'part', text: `${c.got}/${c.of}` };
  });
  return { marks, retry, okN, partN };
}
