import type { Given, LessonPack, Question, Room } from '../model/types';
import { grade } from '../engine/grade';
import { items } from '../engine/lessons';

// 레이드 규칙 — 정식 js/raid/model.js (DS.Raid) 중 첫 한 바퀴에 쓰는 부분을 같은 동작으로 옮김
//   (빠진 것: 💚 힐 · ⚔ 소레이드 · 보스 · 쉼터 · 건너뛰기 — 힐 0 개와 같은 값으로 계산)
export const RETRIES = 3; // 재도전 3번 → 기회 4번
export const PRESENCE_MS = 8000; // 탭이 이만큼 소식이 없으면 나간 것으로

const keys = (o: object | undefined) => Object.keys(o || {});
export const seedOf = (R: Room, uid: string) => `${R.meta.code}|${uid}`;
/** 🔁 재도전 규칙 v3 (정식 2026-11-09): 방 version ≥ 3 → 숫자는 「다 맞혔을 때만」 바뀜 · 틀리면 같은 문제 그대로 */
const NEWR = (R: Room) => Number(R.meta.version || 0) >= 3;

export function attemptsOf(R: Room, mid: string, uid: string): { attempt: number; given: Given[] }[] {
  const a = R.subs?.[mid]?.[uid] || {};
  return keys(a).map(Number).sort((x, y) => x - y).map((k) => ({ attempt: k, given: a[k] as Given[] }));
}

export function variantOf(L: LessonPack, R: Room, mid: string, uid: string, attempt: number): number {
  if (!NEWR(R) || !attempt) return attempt;
  const seed = seedOf(R, uid);
  let v = 0;
  for (const t of attemptsOf(R, mid, uid)) {
    if (t.attempt >= attempt) break;
    const its = items(L, mid, seed, v);
    const ok = its.length > 0 && its.every((q, i) => t.given != null && t.given[i] != null && grade(q, t.given[i] as Given));
    if (ok) v = t.attempt + 1;
  }
  return v;
}

export const itemsFor = (L: LessonPack, R: Room, mid: string, uid: string, attempt: number): Question[] =>
  items(L, mid, seedOf(R, uid), variantOf(L, R, mid, uid, attempt));

/** 한 번의 시도 채점: 소문제마다 정답 여부 (정식 Model.gradeAttempt) */
export function gradeAttempt(L: LessonPack, R: Room, mid: string, uid: string, attempt: number, given: Given[] | null) {
  const its = itemsFor(L, R, mid, uid, attempt);
  const marks = its.map((q, i) => given != null && given[i] != null && grade(q, given[i] as Given));
  return { marks, correct: marks.filter(Boolean).length, total: its.length };
}

export interface Rec {
  tries: { attempt: number; given: Given[]; marks: boolean[]; correct: number; total: number }[];
  best: number; total: number; perfect: boolean; perfectAt: number; practice: boolean;
  submitted: boolean; slots: number; left: number; fix: boolean; canRetry: boolean; nextAttempt: number;
}

/** 학생 기록 (정식 record · v3 · 힐 0) — best = 가장 많이 맞힌 수 = 데미지 */
export function record(L: LessonPack, R: Room, mid: string, uid: string): Rec {
  const tries = attemptsOf(R, mid, uid).map((t) => ({ ...t, ...gradeAttempt(L, R, mid, uid, t.attempt, t.given) }));
  const best = tries.reduce((m, t) => Math.max(m, t.correct), 0);
  const total = L.monsters[mid] ? itemsFor(L, R, mid, uid, 0).length : 0;
  const last = tries[tries.length - 1] || null;
  const perfectAt = tries.findIndex((t) => t.total > 0 && t.correct === t.total);
  const practice = perfectAt >= 0 && tries.length - 1 > perfectAt;
  const slots = RETRIES + 1;
  let used: number, fix = false;
  if (NEWR(R)) {
    const prac = perfectAt >= 0 ? tries.slice(perfectAt + 1) : [];
    const ok = prac.filter((t) => t.total > 0 && t.correct === t.total).length;
    used = (perfectAt >= 0 ? perfectAt + 1 : tries.length) + (prac.length - ok);
    fix = perfectAt >= 0 && !!last && prac.length > 0 && last.correct < last.total;
  } else used = tries.length;
  const left = Math.max(0, slots - used);
  return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice, submitted: tries.length > 0, slots, left, fix,
    canRetry: tries.length > 0 && left > 0, nextAttempt: tries.length };
}

// ── 인원 · 체력 ───────────────────────────────────────────
/** 접속한 학생 (선생님 · 종합실 빼고 · 최근 PRESENCE_MS 안에 소식) — 번호 순 */
export function activeIds(R: Room, now: number): string[] {
  const P = R.players || {};
  return keys(P).filter((u) => !P[u]?.teacher && now - (P[u]?.seen || 0) < PRESENCE_MS).sort((a, b) => (P[a]?.num || 0) - (P[b]?.num || 0));
}
export const headcount = (R: Room, now: number) => R.state.headcount || Math.max(1, activeIds(R, now).length);
export const pctOf = (L: LessonPack, R: Room) => R.meta.pct ?? L.defaultPct ?? 90;

/** 공동 체력 = ⌊인원 × 소문제 × 기준% ⌋ · 데미지 = 학생마다 best 합 (정식 monsterHp) */
export function monsterHp(L: LessonPack, R: Room, mid: string, now: number) {
  const n = L.monsters[mid] ? itemsFor(L, R, mid, '_', 0).length : 0;
  const pct = pctOf(L, R);
  const max = Math.floor((headcount(R, now) * n * pct) / 100);
  // 정식과 같게 지금 접속한 학생의 데미지만 셈 (탭을 닫으면 체력 · 데미지가 함께 빠짐)
  const dmg = activeIds(R, now).reduce((a, u) => a + record(L, R, mid, u).best, 0);
  return { max, dmg, left: Math.max(0, max - dmg), pct, items: n };
}
export const cleared = (L: LessonPack, R: Room, mid: string, now: number) => {
  const h = monsterHp(L, R, mid, now);
  return h.max > 0 && h.left <= 0;
};
