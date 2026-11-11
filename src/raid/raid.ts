import type { Given, LessonPack, Question, Room, Step } from '../model/types';
import { grade } from '../engine/grade';
import { bossItem as packBossItem, items } from '../engine/lessons';

// 레이드 규칙 — 정식 js/raid/model.js (DS.Raid) 를 같은 동작으로 옮김 (b2 범위)
//   모드(수업 · 테스트)로 가르지 않는다: 값은 모두 방 meta(= 다른 점 표에서 옮겨 적은 값)에서 읽는다
//   (아직 없는 것: 💚 파티 힐 · 필살기 · ⛓ 묶기 · 🔥 콤보 · 🦇 박쥐 · 쉼터 · 집중모드 · 소레이드 — 그 값들은 0 으로 계산)
export const PRESENCE_MS = 8000; // 탭이 이만큼 소식이 없으면 나간 것으로
export const BOSS_ID = 'boss';

const keys = (o: object | undefined | null) => Object.keys(o || {});
export const seedOf = (R: Room, uid: string) => `${R.meta.code}|${uid}`;
/** 🔁 재도전 규칙 v3 (정식 2026-11-09): 방 version ≥ 3 → 숫자는 「다 맞혔을 때만」 바뀜 · 틀리면 같은 문제 그대로 */
const NEWR = (R: Room) => Number(R.meta.version || 0) >= 3;

// ── 단계 ─────────────────────────────────────────────────
export const stepIdx = (R: Room) => R.state.step ?? -1;
export const stepOf = (L: LessonPack, R: Room): Step | null => { const i = stepIdx(R); return i >= 0 && i < L.steps.length ? (L.steps[i] as Step) : null; };
export const isLobby = (R: Room) => stepIdx(R) < 0;
export const isEnd = (L: LessonPack, R: Room) => stepIdx(R) >= L.steps.length;
/** 다음에 갈 단계 번호 (「다음 판에서」 자리는 건너뜀 · 끝이면 steps.length) */
export function nextIdx(L: LessonPack, R: Room): number {
  let i = stepIdx(R) + 1;
  while (i < L.steps.length && L.steps[i]?.later) i++;
  return Math.min(i, L.steps.length);
}

// ── 문제 · 답 ────────────────────────────────────────────
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

// ── 💚 힐 (정식 v0.9.6 · 받는 사람을 적은 힐만 — 파티 힐 · 필살기 값은 아직 없음) ──
const healsOf = (R: Room, mid: string) => R.heals?.[mid] || {};
export const healsGiven = (R: Room, mid: string, uid: string) => keys(healsOf(R, mid)[uid]).length;
const num = (R: Room, uid: string) => R.players?.[uid]?.num || 0;
function healsTo(R: Room, mid: string, uid: string) {
  const out: { from: string; k: number }[] = [];
  Object.entries(healsOf(R, mid)).forEach(([from, byK]) => Object.entries(byK || {}).forEach(([k, to]) => { if (to === uid) out.push({ from, k: Number(k) }); }));
  return out.sort((a, b) => num(R, a.from) - num(R, b.from) || a.k - b.k);
}
export const healsReceived = (R: Room, mid: string, uid: string) => Math.min(R.meta.healMax, healsTo(R, mid, uid).length);

export interface Rec {
  tries: { attempt: number; given: Given[]; marks: boolean[]; correct: number; total: number }[];
  best: number; total: number; perfect: boolean; perfectAt: number; practice: boolean;
  submitted: boolean; slots: number; left: number; healed: number; fix: boolean; tokens: number; tokLeft: number;
  canRetry: boolean; canHeal: boolean; nextAttempt: number;
}

/** 학생 기록 (정식 record · v3) — best = 가장 많이 맞힌 수 = 데미지 · 기회 = 재도전 + 1 + 받은 힐 */
export function record(L: LessonPack, R: Room, mid: string, uid: string): Rec {
  const tries = attemptsOf(R, mid, uid).map((t) => ({ ...t, ...gradeAttempt(L, R, mid, uid, t.attempt, t.given) }));
  const best = tries.reduce((m, t) => Math.max(m, t.correct), 0);
  const total = L.monsters[mid] ? itemsFor(L, R, mid, uid, 0).length : 0;
  const last = tries[tries.length - 1] || null;
  const perfectAt = tries.findIndex((t) => t.total > 0 && t.correct === t.total);
  const practice = perfectAt >= 0 && tries.length - 1 > perfectAt;
  const healed = healsReceived(R, mid, uid);
  const slots = R.meta.retries + 1 + healed;
  if (NEWR(R)) {
    const prac = perfectAt >= 0 ? tries.slice(perfectAt + 1) : [];
    const ok = prac.filter((t) => t.total > 0 && t.correct === t.total).length;
    const used = (perfectAt >= 0 ? perfectAt + 1 : tries.length) + (prac.length - ok), left = Math.max(0, slots - used);
    const tokens = ok, tokLeft = Math.max(0, tokens - healsGiven(R, mid, uid));
    const fix = perfectAt >= 0 && !!last && prac.length > 0 && last.correct < last.total;
    return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice, submitted: tries.length > 0, slots, left, healed, fix, tokens, tokLeft,
      canRetry: tries.length > 0 && left > 0, canHeal: tokLeft > 0, nextAttempt: tries.length };
  }
  const used = tries.length + healsGiven(R, mid, uid), left = Math.max(0, slots - used);
  return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice, submitted: tries.length > 0, slots, left, healed, fix: false, tokens: 0, tokLeft: 0,
    canRetry: tries.length > 0 && left > 0, canHeal: perfectAt >= 0 && left > 0, nextAttempt: tries.length };
}

// ── 인원 · 체력 ───────────────────────────────────────────
/** 접속한 학생 (선생님 · 종합실 빼고 · 최근 PRESENCE_MS 안에 소식) — 번호 순 */
export function activeIds(R: Room, now: number): string[] {
  const P = R.players || {};
  return keys(P).filter((u) => !P[u]?.teacher && now - (P[u]?.seen || 0) < PRESENCE_MS).sort((a, b) => num(R, a) - num(R, b));
}
export const headcount = (R: Room, now: number) => R.state.headcount || Math.max(1, activeIds(R, now).length);
export const pctOf = (L: LessonPack, R: Room) => R.meta.pct ?? L.defaultPct ?? 90;

/** 공동 체력 = ⌊인원 × 소문제 × 기준% ⌋ · 데미지 = 접속한 학생마다 best 합 (정식 monsterHp) */
export function monsterHp(L: LessonPack, R: Room, mid: string, now: number) {
  const n = L.monsters[mid] ? itemsFor(L, R, mid, '_', 0).length : 0;
  const pct = pctOf(L, R);
  const max = Math.floor((headcount(R, now) * n * pct) / 100);
  const dmg = activeIds(R, now).reduce((a, u) => a + record(L, R, mid, u).best, 0);
  return { max, dmg, left: Math.max(0, max - dmg), pct, items: n };
}
export const cleared = (L: LessonPack, R: Room, mid: string, now: number) => {
  const h = monsterHp(L, R, mid, now);
  return h.max > 0 && h.left <= 0;
};

// ── 👑 보스 (형성평가 · 정식 2026-11-05 「나」) ─────────────
//   문항마다 시도 0(원문) + 재도전 = 기회 meta.bossTries · 문항을 한 번이라도 맞히면 도달 · 체력 = ⌊인원 × hpItems × 기준%⌋ · 0 = 즉시 승리
export const bossItem = (L: LessonPack, R: Room, uid: string, i: number, a: number) => packBossItem(L, seedOf(R, uid), i, a);
export function bossTries(L: LessonPack, R: Room, uid: string) {
  const out: { i: number; a: number; given: Given; q: Question | null; ok: boolean }[] = [];
  Object.entries(R.bossTry?.[uid] || {}).forEach(([i, byA]) => Object.entries(byA || {}).forEach(([a, given]) => {
    if (given == null || given === '') return;
    const q = bossItem(L, R, uid, Number(i), Number(a));
    out.push({ i: Number(i), a: Number(a), given, q, ok: !!q && grade(q, given) });
  }));
  return out.sort((x, y) => x.i - y.i || x.a - y.a);
}
export function bossState(L: LessonPack, R: Room, uid: string) {
  const tr = bossTries(L, R, uid), n = L.boss?.items || 0;
  return Array.from({ length: n }, (_, i) => {
    const mine = tr.filter((t) => t.i === i), ok = mine.some((t) => t.ok), first = mine.find((t) => t.a === 0);
    return { n: mine.length, ok, first: !!(first && first.ok), firstTried: !!first, left: ok ? 0 : Math.max(0, R.meta.bossTries - mine.length), next: mine.length ? Math.max(...mine.map((t) => t.a)) + 1 : 0 };
  });
}
export const mastery = (L: LessonPack, R: Room, uid: string) => bossState(L, R, uid).map((s) => s.ok);
export function bossHp(L: LessonPack, R: Room, now: number) {
  const pct = pctOf(L, R);
  const max = Math.floor((headcount(R, now) * (L.boss?.hpItems || 0) * pct) / 100);
  const dmg = activeIds(R, now).reduce((a, u) => a + mastery(L, R, u).filter(Boolean).length, 0);
  return { max, dmg, left: Math.max(0, max - dmg), pct, won: max > 0 && dmg >= max };
}

// ── 🌫 정찰 (정식 solveLock · v3 = 모든 몬스터 · 보스 앞 meta.solve 초 · 「⚔ 등장!」으로 일찍) ──
export function solveLock(L: LessonPack, R: Room, now: number) {
  const step = stepOf(L, R);
  if (!step || !['monster', 'boss'].includes(step.kind) || step.later) return null;
  const id = step.kind === 'boss' ? BOSS_ID : step.id, sec = NEWR(R) ? Number(R.meta.solve) : 0;
  if (!(sec > 0)) return null;
  const t0 = R.state.stepAt != null ? Number(R.state.stepAt) : now;
  const end = Math.min(t0 + sec * 1000, Number(R.state.solveEnd?.[id]) || Infinity);
  return { id, sec, t0, end, left: Math.max(0, end - now), on: now < end };
}

// ── 👾 몬스터 공격 시계 (정식 atkClock · 모든 기기가 같은 시각으로 같은 값) ──
//   주기 = 빠름 + (느림 − 빠름) × (1 − 남은 체력 비율) · 정찰 동안 멈춤 · 보스 멈춤 초 = 체력 단계(4 · 3 · 2초)
export const ATK = { monster: [20, 45, 1], boss: [30, 60, 2] } as const;
const BOSS_LOCK: [number, number][] = [[67, 4], [34, 3], [0, 2]];
export function bossPhase(ratio: number) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  const i = BOSS_LOCK.findIndex(([p]) => pct >= p);
  return { phase: i + 1, lock: (BOSS_LOCK[i] as [number, number])[1], pct };
}
export interface Atk { kind: 'monster' | 'boss'; mid: string; per: number; lock: number; phase: number; paused: boolean; ratio: number; t: number; k: number; p: number }
export function atkClock(L: LessonPack, R: Room, now: number): Atk | null {
  const step = stepOf(L, R);
  if (!step || step.later) return null;
  const kind = step.kind === 'monster' && L.monsters[step.id] && !cleared(L, R, step.id, now) ? 'monster' : step.kind === 'boss' && L.boss && !bossHp(L, R, now).won ? 'boss' : null;
  if (!kind) return null;
  const a = ATK[kind];
  const hp = kind === 'monster' ? monsterHp(L, R, step.id, now) : bossHp(L, R, now), ratio = hp.max ? Math.max(0, Math.min(1, hp.left / hp.max)) : 1;
  const per = a[0] + (a[1] - a[0]) * (1 - ratio);
  const phase = kind === 'boss' ? bossPhase(ratio) : null, lock = phase ? phase.lock : a[2];
  const sl = solveLock(L, R, now), held = sl ? Math.max(0, Math.min(now, sl.end) - sl.t0) : 0;
  const start = R.state.stepAt != null ? R.state.stepAt : now;
  const t = Math.max(0, (now - start - held) / 1000);
  return { kind, mid: kind === 'boss' ? BOSS_ID : step.id, per, lock, phase: phase ? phase.phase : 0, paused: !!(sl && sl.on), ratio, t, k: Math.floor(t / per), p: (t % per) / per };
}
/** 게이지 진행 (기기마다 memo 를 들고 같은 규칙으로) — 주기가 바뀌어도 거꾸로 튀지 않게 (정식 atkTrack) */
export function atkTrack(memo: { key?: string; start?: number; hit?: boolean }, c: Atk, key: string) {
  if (memo.key !== key) { memo.key = key; memo.start = c.t - (c.t % c.per); memo.hit = false; }
  if (c.t < (memo.start ?? 0)) memo.start = Math.max(0, c.t - (c.t % c.per));
  const p = (c.t - (memo.start ?? 0)) / c.per;
  if (p >= 1) { const first = memo.start === 0 && !memo.hit; memo.hit = true; memo.start = (memo.start ?? 0) + c.per; return { p: 0, strike: true, first }; }
  return { p, strike: false, first: false };
}

// ── 결과 ─────────────────────────────────────────────────
/** 학생 결과: 몬스터마다 데미지(맞힌 수) · 보스 문항 도달 수 */
export function resultOf(L: LessonPack, R: Room, uid: string) {
  const mons = L.steps.filter((s) => s.kind === 'monster' && !s.later && L.monsters[s.id]).map((s) => {
    const r = record(L, R, s.id, uid);
    return { id: s.id, title: s.title, best: r.best, total: r.total, perfect: r.perfect };
  });
  const boss = L.boss ? { ok: mastery(L, R, uid).filter(Boolean).length, items: L.boss.items } : null;
  return { mons, boss, right: mons.reduce((a, m) => a + m.best, 0) + (boss ? boss.ok : 0), total: mons.reduce((a, m) => a + m.total, 0) + (boss ? boss.items : 0) };
}
