// 🎯 허수아비(복습) 보상 · 기록 = 정식 그대로 (📜 2026-11-15 머리 🔨 「⑥ 보상 규칙 = 정식 그대로 · 💎 반복 구멍이라 먼저」)
//   정식 js/raid/bonus.js win() · js/raid/note.js lesson() · js/raid/gem.js G · addDaily 를 옮김
//   기록 = bonus/{반}/{번호}/{차시}/{몬스터 | boss} = { tries, at, clear } (정식 키 그대로) → 📕 「복습 완료」 · 🏆 업적(seals) · 교사 학생 시트의 바탕
//   💎 받은 표시 = gem/{반}/{번호}/log/{키} = { g, at, why } (정식 키: review_{날짜}_{k} · firstreview · bossre_{차시} · seal_{차시} · note_{차시})
//   EXP = 처음 처치한 몬스터마다 5 (+ 업적 10) · 다시 깬 몬스터 = 0
import type { LessonPack } from '../model/types';

export const DUMMY_G = { review: 3, reviewDay: 6, first: 4, bossRe: 14, seal: 12, note: 7 } as const; // 정식 gem.js G
export const DUMMY_XP = { clear: 5, seal: 10 } as const; // 정식 grow.js XP.bonusClear · seal
/** 📕 아직 해결 안 됨 (정식 note.js OPEN + 불참 a) */
export const OPEN = new Set(['x', '-', 'n', 'a']);
export type Rec = { mons?: Record<string, string>; miss?: string[] | Record<string, string>; boss?: number; bossM?: string };
export type Bon = Record<string, { clear?: boolean; tries?: number; at?: number } | undefined>;

/** 정식 note.js monIds = 그 차시 몬스터(그림 있는 것) */
export const fieldIds = (L: LessonPack) => L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id]).map((s) => s.id);
const bossOf = (L: LessonPack) => L.boss as { items?: number; hpItems?: number } | undefined;

/** 정식 note.js lesson(): 문제마다 상태 (x 틀림 · - / n 안 풂 · a 불참 · o 한 번에 · f 고침 · p 복습으로 해결) */
export function noteOf(L: LessonPack, rec: Rec | undefined, bon: Bon | undefined) {
  const b = bon || {}, ids = fieldIds(L), B = bossOf(L), nb = Number(B?.items) || 0, hp = Number(B?.hpItems ?? B?.items) || 0;
  let mons: string[], boss: string[];
  if (!rec) { mons = ids.map(() => 'a'); boss = Array.from({ length: nb }, (_, i) => (i < hp ? 'a' : '')); }
  else {
    const miss = Array.isArray(rec.miss) ? rec.miss : Object.values(rec.miss || {});
    mons = ids.map((id) => (rec.mons ? rec.mons[id] || 'n' : miss.includes(id) ? 'x' : 'o'));
    const bm = rec.bossM || (() => { const k = Math.min(Number(rec.boss) || 0, hp); return Array.from({ length: hp }, (_, i) => (i < k ? 'o' : rec.boss ? 'x' : '-')).join(''); })();
    boss = Array.from({ length: nb }, (_, i) => bm[i] || (i < hp ? '-' : ''));
  }
  const fixd = (st: string, ok: boolean) => (ok && OPEN.has(st) ? 'p' : st);
  mons = mons.map((st, i) => fixd(st, !!b[ids[i]!]?.clear));
  const bossClear = !!b.boss?.clear;
  boss = boss.map((st, i) => (i < hp ? fixd(st, bossClear) : st === 'o' ? 'star' : ''));
  const left = mons.filter((s) => OPEN.has(s)).length + boss.slice(0, hp).filter((s) => OPEN.has(s)).length;
  return { ids, mons, boss, hp, left, none: !rec };
}

export interface DummyGem { n: number; key: string; why: string; free?: boolean }
/** 한 판 끝 보상 (정식 win() 를 처치한 몬스터마다 차례로) · cleared = 이번 판에 처치한 칸(몬스터 id · 'boss') · log = 이미 받은 💎 키 · day = 오늘(KST) */
export function dummyReward(L: LessonPack, rec: Rec | undefined, bon0: Bon | undefined, cleared: string[], log: Record<string, unknown>, day: string) {
  const bon: Bon = { ...(bon0 || {}) }, got = new Set(Object.keys(log || {})), gems: DummyGem[] = [], ids = fieldIds(L);
  let xp = 0, reviewN = [...got].filter((k) => k.startsWith(`review_${day}_`)).length;
  const sealedBefore = !!bon.boss?.clear;
  const give = (n: number, key: string, why: string, free = false) => { if (got.has(key)) return; got.add(key); gems.push({ n, key, why, ...(free ? { free } : {}) }); };
  for (const mid of cleared) {
    const isField = ids.includes(mid), x = isField ? noteOf(L, rec, bon) : null;
    const st = x && !x.none ? x.mons[x.ids.indexOf(mid)] : undefined, wasOpen = !!st && OPEN.has(st);
    const clearedBefore = !!bon[mid]?.clear;
    bon[mid] = { ...(bon[mid] || {}), clear: true };
    const sealed = mid === 'boss' && !sealedBefore;
    if (!clearedBefore) {
      xp += DUMMY_XP.clear + (sealed ? DUMMY_XP.seal : 0);
      if (mid === 'boss') give(DUMMY_G.bossRe, `bossre_${L.id}`, '형성평가 재대결');
      give(DUMMY_G.first, 'firstreview', '첫 복습');
    }
    if (mid !== 'boss' && wasOpen && reviewN < DUMMY_G.reviewDay) give(DUMMY_G.review, `review_${day}_${reviewN++}`, '복습으로 해결');
    if (sealed) give(DUMMY_G.seal, `seal_${L.id}`, '🏆 업적', true);
    const nx = noteOf(L, rec, bon); if (!nx.none && nx.left === 0) give(DUMMY_G.note, `note_${L.id}`, '오답노트 완성');
  }
  return { gems, xp, bon };
}

/** 🏕 캠프 🎯 할 일 (📜 2026-11-15 캠프 시안 A): 남은 복습 문제 수(수업 기록이 있는 차시) · 오늘 받을 수 있는 복습 💎 (남은 문제 × 3 · 하루 6번 안) */
export function reviewTodo(lessons: LessonPack[], recs: Record<string, Rec>, bonAll: Record<string, Bon>, log: Record<string, unknown>, day: string): { left: number; gem: number } {
  let left = 0;
  for (const L of lessons) { const rec = recs[L.id] ?? (L.partOf ? recs[L.partOf] : undefined); if (!rec) continue; const x = noteOf(L, rec, bonAll[L.id]); left += x.left; }
  const used = Object.keys(log || {}).filter((k) => k.startsWith(`review_${day}_`)).length;
  return { left, gem: Math.min(left, Math.max(0, DUMMY_G.reviewDay - used)) * DUMMY_G.review };
}
