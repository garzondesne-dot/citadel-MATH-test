import type { ChainSub, Given, LessonPack, Question, Room, Step } from '../model/types';
import { grade } from '../engine/grade';
import { bossItem as packBossItem, chainItems as packChainItems, items } from '../engine/lessons';

// 레이드 규칙 — 정식 js/raid/model.js (DS.Raid) 를 같은 동작으로 옮김 (b2 범위)
//   모드(수업 · 테스트)로 가르지 않는다: 값은 모두 방 meta(= 다른 점 표에서 옮겨 적은 값)에서 읽는다
//   (아직 없는 것: 💚 파티 힐 · 필살기 · ⛓ 묶기 · 🔥 콤보 · 🦇 박쥐 · 쉼터 · 💡 힌트 주기 — 그 값들은 0 으로 계산)
export const PRESENCE_MS = 8000; // 탭이 이만큼 소식이 없으면 나간 것으로
export const BOSS_ID = 'boss';

const keys = (o: object | undefined | null) => Object.keys(o || {});
export const seedOf = (R: Room, uid: string) => `${R.meta.code}|${uid}`;
/** 🔁 재도전 규칙 v3 (정식 2026-11-09): 방 version ≥ 3 → 숫자는 「다 맞혔을 때만」 바뀜 · 틀리면 같은 문제 그대로 */
const NEWR = (R: Room) => Number(R.meta.version || 0) >= 3;
// ❤ ⚡ 베타 v4 (📜 2026-11-13 밤 선생님 「진행」 · 머리 🔨 하트 묶음): ❤ 4 · 몬스터마다 ⚡ 3 · 🔥 재도전 판 — 지금 열린 v3 방은 옛 규칙 그대로(수업 중 안 바뀜)
export const V4 = (R: Room) => Number(R.meta.version || 0) >= 4;
/** ⚡ 몬스터마다 새로 (다 맞힌 뒤에만) */
export const ENERGY = 3;
/** 🙋 선생님 「풀어주기」 횟수 (v4 · unlock/{mid}/{uid} = 수 · 하나 = ❤ +1) */
export const unlocksOf = (R: Room, mid: string, uid: string) => Number((R as { unlock?: Record<string, Record<string, number>> }).unlock?.[mid]?.[uid]) || 0;
/** ⏯ 이어서 수업 (#119 덧붙임 2): 지난 수업에서 처치 못 한 몬스터 = meta.fresh[id] → 판 · 시도 번호를 1 밀어 숫자 바꾼 판부터 (첫 시도 = 학습지 원문을 쓰지 않음) */
export const shiftOf = (R: Room, mid: string) => (R.meta.fresh?.[mid] ? 1 : 0);

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
    const its = items(L, mid, seed, v + shiftOf(R, mid));
    const ok = its.length > 0 && its.every((q, i) => t.given != null && t.given[i] != null && grade(q, t.given[i] as Given));
    if (ok) v = t.attempt + 1;
  }
  return v;
}
export const itemsFor = (L: LessonPack, R: Room, mid: string, uid: string, attempt: number): Question[] =>
  items(L, mid, seedOf(R, uid), variantOf(L, R, mid, uid, attempt) + shiftOf(R, mid));

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
// 🌟 진필살기 (정식 model.js 72~88 · 2026-11-13 ❓#3 ③B): 힐 칸 값 '!true@시각' = 파티 힐(아직 다 못 맞힌 친구 모두 +1) + 🗿 석화 TRUE_SEC 초(몬스터 공격 멈춤 · 그동안 맞히면 💎) · 한 몬스터에 반 전체 한 번
export const TRUE_SEC = 20;
export const isTrue = (v: unknown) => typeof v === 'string' && v.startsWith('!true');
const partyLike = (v: unknown) => v === '*' || isTrue(v);
export function petrify(R: Room, mid: string): { by: string; at: number; until: number } | null {
  let out: { by: string; at: number; until: number } | null = null;
  Object.entries(healsOf(R, mid)).forEach(([from, byK]) => Object.values(byK || {}).forEach((v) => { if (isTrue(v)) { const at = Number(String(v).split('@')[1]) || 0; if (!out || at > out.at) out = { by: from, at, until: at + TRUE_SEC * 1000 }; } }));
  return out;
}
export const ultUsed = (R: Room, mid: string, uid: string) => Object.values(healsOf(R, mid)[uid] || {}).some((v) => v === '!ult' || isTrue(v));
/** 퍼펙트 연속: 첫 시도부터 다 맞힌 시도가 몇 번 이어졌나 (첫 시도가 아니면 0) */
export const perfStreak = (rec: { tries: { correct: number; total: number }[] }) => { let n = 0; for (const t of rec.tries) { if (t.total > 0 && t.correct === t.total) n++; else break; } return n; };
/** 이 몬스터를 한 번이라도 다 맞혔나 (파티 힐 받는 조건 · 정식 perfectRaw) */
function perfectRaw(L: LessonPack, R: Room, mid: string, uid: string) { if (isChain(L, R, mid)) return chainRecord(L, R, mid, uid, true).perfect; return attemptsOf(R, mid, uid).some((t) => { const g = gradeAttempt(L, R, mid, uid, t.attempt, t.given); return g.total > 0 && g.correct === g.total; }); }
export function healsTo(R: Room, mid: string, uid: string, L?: LessonPack) {
  const out: { from: string; k: number }[] = [];
  Object.entries(healsOf(R, mid)).forEach(([from, byK]) => Object.entries(byK || {}).forEach(([k, to]) => { if (to === uid || (partyLike(to) && !(V4(R) && isTrue(to)) && from !== uid && !R.players?.[uid]?.teacher && !!L && !perfectRaw(L, R, mid, uid))) out.push({ from, k: Number(k) }); }));
  return out.sort((a, b) => num(R, a.from) - num(R, b.from) || a.k - b.k);
}
/** ⛓ 묶기 (정식 v3 · heals 칸 「!bind@시각」 · 하나 = 3초) */
export const BIND_SEC = 3;
export const bindSec = (R: Room, mid: string) => Object.values(healsOf(R, mid)).reduce((a, byK) => a + Object.values(byK || {}).filter((v) => typeof v === 'string' && v.startsWith('!bind')).length, 0) * BIND_SEC
  + Object.values(healsOf(R, mid)).reduce((a, byK) => a + Object.values(byK || {}).filter(isTrue).length, 0) * TRUE_SEC // 🌟 석화 = 공격 시계 멈춤 (정식 combo.js bindFor)
  + holyTimes(R, mid).length * HOLY_SEC; // 🛡 홀리 방패 석화 = 공격 시계 멈춤

// 🛡 홀리 방패 (정식 model.js 333~367 · 2026-11-13 ❓#3 ⑤A): +10 용사 · 이 몬스터 퍼펙트(보스 = 형성평가 모든 문항 도달) → 「🛡 홀리 방패」 켜기
//   players/{uid}/hg = { mid, at } (켬) · players/{uid}/holy/{mid} = 막은 시각(몬스터마다 한 번) · 공격이 오면 켜 둔 용사 1명 이상 = 반 전체 안 멈춤 + 🗿 석화 HOLY_SEC 초 · 💥 15종 모두 막음
export const HOLY_SEC = 10;
type PH = { enh?: number; hg?: { mid: string; at: number } | null; holy?: Record<string, number>; teacher?: boolean };
const ph = (R: Room, uid: string) => (R.players?.[uid] || {}) as PH;
export const holyUsed = (R: Room, mid: string, uid: string) => Number(ph(R, uid).holy?.[mid]) || 0;
export const awake = (p: PH | undefined) => Number(p?.enh) >= 10;
export const holyOn = (R: Room, mid: string, uid: string) => { const p = ph(R, uid), h = p.hg; return !!(h && h.mid === mid && awake(p) && !holyUsed(R, mid, uid)); };
/** 지금 공격을 막을 용사들 (켠 시각이 이번 공격 주기 안 · per 초 + 3초) */
export function holyArmed(R: Room, mid: string, now: number, per: number | null): string[] {
  return keys(R.players).filter((u) => !ph(R, u).teacher && holyOn(R, mid, u) && (per == null || now - Number(ph(R, u).hg?.at || 0) <= per * 1000 + 3000));
}
/** 막은 시각들 (같은 공격을 여럿이 막으면 3초 안 = 한 번) */
export function holyTimes(R: Room, mid: string): { at: number; by: string[] }[] {
  const ts = keys(R.players).map((u) => holyUsed(R, mid, u)).filter(Boolean).sort((a, b) => a - b), out: { at: number; by: string[] }[] = [];
  ts.forEach((t) => { if (!out.length || t - out[out.length - 1]!.at > 3000) out.push({ at: t, by: [] }); });
  keys(R.players).forEach((u) => { const t = holyUsed(R, mid, u); const c = out.find((o) => t && t >= o.at && t - o.at <= 3000); if (c) c.by.push(u); });
  return out;
}
/** 🗿 지금 몬스터를 굳힌 것 (진필살기 20초 · 홀리 방패 10초 중 가장 늦게 시작한 것) */
export function stone(R: Room, mid: string): { by: string; all?: string[]; at: number; until: number; holy?: boolean } | null {
  const pt = petrify(R, mid), hs = holyTimes(R, mid), h = hs.length ? hs[hs.length - 1]! : null;
  const ho = h ? { by: h.by[0] ?? '', all: h.by, at: h.at, until: h.at + HOLY_SEC * 1000, holy: true } : null;
  if (!pt) return ho; if (!ho) return pt;
  return ho.at > pt.at ? ho : pt;
}
export const healsReceived = (R: Room, mid: string, uid: string, L?: LessonPack) => Math.min(R.meta.healMax, healsTo(R, mid, uid, L).length);

export interface Rec {
  chain?: false;
  tries: { attempt: number; given: Given[]; marks: boolean[]; correct: number; total: number }[];
  best: number; total: number; perfect: boolean; perfectAt: number; practice: boolean;
  submitted: boolean; slots: number; left: number; healed: number; fix: boolean; tokens: number; tokLeft: number;
  canRetry: boolean; canHeal: boolean; nextAttempt: number;
  /** v4: ❤ 0 → 🙋 잠김(선생님 풀어주기 기다림) · 풀어주기 뒤 = 틀린 소문제 정답 펼침 · 🔥 재도전 판 (⚡ 쓴 수 · 다 맞힌 판 · 지금 열린 판) · 🌟 켜짐 */
  locked?: boolean; reveal?: boolean; spent?: number; rounds?: number; roundOpen?: boolean; trueOk?: boolean;
}

/** 학생 기록 (정식 record · v3) — best = 가장 많이 맞힌 수 = 데미지 · 기회 = 재도전 + 1 + 받은 힐 · 소레이드면 chainRecord */
export function record(L: LessonPack, R: Room, mid: string, uid: string): Rec | ChainRec {
  if (isChain(L, R, mid)) return chainRecord(L, R, mid, uid);
  return plainRecord(L, R, mid, uid);
}
export function plainRecord(L: LessonPack, R: Room, mid: string, uid: string): Rec {
  const tries = attemptsOf(R, mid, uid).map((t) => ({ ...t, ...gradeAttempt(L, R, mid, uid, t.attempt, t.given) }));
  const best = tries.reduce((m, t) => Math.max(m, t.correct), 0);
  const total = L.monsters[mid] ? itemsFor(L, R, mid, uid, 0).length : 0;
  const last = tries[tries.length - 1] || null;
  const perfectAt = tries.findIndex((t) => t.total > 0 && t.correct === t.total);
  const practice = perfectAt >= 0 && tries.length - 1 > perfectAt;
  const healed = healsReceived(R, mid, uid, L);
  const slots = R.meta.retries + 1 + healed;
  if (V4(R)) {
    // ❤ = 4 + 받은 힐 + 풀어주기 − 틀린 제출(하나라도 틀리면 −1 · 개수 상관없이) · 다 맞힌 뒤(🔥 재도전 판)는 ❤ 안 씀
    const full = (t: { correct: number; total: number }) => t.total > 0 && t.correct === t.total;
    const pre = perfectAt >= 0 ? tries.slice(0, perfectAt + 1) : tries, wrong = pre.filter((t) => !full(t)).length;
    const unl = unlocksOf(R, mid, uid), hearts = R.meta.retries + 1 + healed + unl, left = Math.max(0, hearts - wrong);
    const locked = perfectAt < 0 && tries.length > 0 && left <= 0;
    // ⚡ 3 = 다 맞힌 뒤 · ⚡ 1 쓰면(💚 힐 · ⛓ 묶기 · 🌟) 바로 🔥 재도전 판 · 그 판을 다 맞혀야 다음 ⚡
    const prac = perfectAt >= 0 ? tries.slice(perfectAt + 1) : [], rounds = prac.filter(full).length, spent = healsGiven(R, mid, uid);
    const tokens = perfectAt >= 0 ? ENERGY : 0, tokLeft = Math.max(0, tokens - spent), roundOpen = spent > rounds;
    const fix = roundOpen && prac.length > 0 && !full(prac[prac.length - 1]!);
    // 🌟 = 첫 공격 퍼펙트 + 재도전 판 2개를 각각 한 번에 → 세 번째 ⚡ 에서만
    const trueOk = perfectAt === 0 && spent === 2 && rounds === 2 && prac.length === 2 && prac.every(full);
    return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice: prac.length > 0, submitted: tries.length > 0, slots: hearts, left, healed, fix, tokens, tokLeft,
      canRetry: perfectAt >= 0 ? roundOpen : tries.length > 0 && left > 0, canHeal: tokLeft > 0 && !roundOpen, nextAttempt: tries.length,
      locked, reveal: unl > 0 && perfectAt < 0, spent, rounds, roundOpen, trueOk };
  }
  if (NEWR(R)) {
    const prac = perfectAt >= 0 ? tries.slice(perfectAt + 1) : [];
    const ok = prac.filter((t) => t.total > 0 && t.correct === t.total).length;
    const used = (perfectAt >= 0 ? perfectAt + 1 : tries.length) + (prac.length - ok), left = Math.max(0, slots - used);
    // ⚡ 기력 = 정식 v3 그대로: 퍼펙트 뒤 새 문제를 맞힌 수(기회를 안 씀) · 묶기 · 힐에 하나씩 씀 (소레이드 = 대장 처치 때 남은 칸 · chainRecord)
    const tokens = ok, tokLeft = Math.max(0, tokens - healsGiven(R, mid, uid));
    const fix = perfectAt >= 0 && !!last && prac.length > 0 && last.correct < last.total;
    return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice, submitted: tries.length > 0, slots, left, healed, fix, tokens, tokLeft,
      canRetry: tries.length > 0 && left > 0, canHeal: tokLeft > 0, nextAttempt: tries.length };
  }
  const used = tries.length + healsGiven(R, mid, uid), left = Math.max(0, slots - used);
  return { tries, best, total, perfect: perfectAt >= 0, perfectAt, practice, submitted: tries.length > 0, slots, left, healed, fix: false, tokens: 0, tokLeft: 0,
    canRetry: tries.length > 0 && left > 0, canHeal: perfectAt >= 0 && left > 0, nextAttempt: tries.length };
}

// ── ⚔ 소레이드 (정식 2026-11-09 #18 · 방 version 3 · 차시 팩 monsters[mid].chain) ──
//   학생마다 졸개 ① → … → 👑 대장을 자기 속도로 · 저장 chain/{mid}/{uid}/{k} = { s 단계, p 판(0 = 진짜 · 1~ = 숫자 바뀐 연습), g 답 } · 틀려도 같은 숫자
//   기회 4칸: 졸개 오답 0.5 · 대장 오답 1 · 남은 기회 ≤ 1 이면 잠김 → 선생님 chainOk = ✔ 풀어주기 · 0 이하 = 못 맞힘
//   데미지 = 맞힌 단계 수 · 퍼펙트 = 한 번도 안 틀리고 대장까지 · 🔥 한 판 더 = 판마다 새 4칸 · 최대 PRAC_MAX 판
export const CHAIN_SLOTS = 4;
export const PRAC_MAX = 3;
export const isChain = (L: LessonPack, R: Room, mid: string) => NEWR(R) && !!L.monsters[mid]?.chain;
export const chainItems = (L: LessonPack, R: Room, mid: string, uid: string, pass: number) => packChainItems(L, mid, seedOf(R, uid), (pass || 0) + shiftOf(R, mid));
export const chainSubs = (R: Room, mid: string, uid: string) => { const a = R.chain?.[mid]?.[uid] || {}; return keys(a).map(Number).sort((x, y) => x - y).map((k) => ({ k, ...(a[k] as ChainSub) })); };
export const whyStages = (its: Question[]) => (its || []).map((q, i) => (q && q.why ? i : -1)).filter((i) => i >= 0);
export const pracUsed = (R: Room, mid: string, uid: string, rec?: { pass?: number }) => Math.max(Number(R.players?.[uid]?.pr?.[mid]) || 0, (rec && rec.pass) || 0);
/** 소레이드 단계 정답 (서술형 통과로 채울 값 · 시연 정답 펼치기) */
export const answerOf = (q: Question): Given => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.type === 'blanks' ? q.items.map((it) => it.answer) : q.type === 'text' ? (q.answers || [])[0] ?? '' : 'answer' in q ? (q.answer as Given) : null); // 과목 고유 꼴(답 = 채점 함수) = null

export interface ChainRec {
  chain: true; items: Question[]; n: number; stage: number; cost: number; left: number; slots: number; wrong: number;
  lastWrong: { s: number; given: Given } | null; says: string[]; done: boolean; fail: boolean; locked: boolean; ok: boolean; byPh: boolean;
  perfect: boolean; perfectAt: number; tokens: number; tokLeft: number; stOk: boolean[]; stFirst: boolean[];
  whyM: number; whyN: number; whyDone: number[]; whyAll: boolean;
  best: number; total: number; submitted: boolean; tries: never[]; last: null; allRight: boolean; practice: boolean; pass: number; pStage: number; pSays: string[]; pItems: Question[] | null;
  pDoneN: number; pWhy: number; whyOk: boolean; pLeft: number; pFail: boolean; healed: number; canRetry: false; canHeal: boolean; nextAttempt: number; nextK: number;
  spent?: number; rounds?: number; roundOpen?: boolean; trueOk?: boolean;
}
/** 정식 chainRecord 그대로 */
export function chainRecord(L: LessonPack, R: Room, mid: string, uid: string, noParty = false): ChainRec {
  const its = chainItems(L, R, mid, uid, 0), n = its.length, subs = chainSubs(R, mid, uid);
  const ok = !!R.chainOk?.[mid]?.[uid];
  let stage = 0, cost = 0, wrong = 0, lastWrong: ChainRec['lastWrong'] = null, byPh = false, leftAt = -1;
  const says: string[] = [], wrongAt: Record<number, boolean> = {};
  const v4 = V4(R), healed = noParty ? healsReceived(R, mid, uid) : healsReceived(R, mid, uid, L), slots = CHAIN_SLOTS + healed + (v4 ? unlocksOf(R, mid, uid) : 0);
  const pWrongBy: Record<number, number> = {}; // v4 🌟: 판마다 틀린 수
  let pCost = 0, pass = 0, pStage = 0, pItems: Question[] | null = null, pSays: string[] = [], pDoneN = 0, pWhy = -1, whyOk = false;
  const whySet = new Set<number>();
  subs.forEach((t) => {
    const raw0 = t.g, it0 = !t.p ? its[stage] : null;
    // 저장소는 빈 배열을 지움 · 배열을 객체로 줄 수도 → 고르기 답은 늘 배열로
    const fixG = (q: Question | null | undefined, g: unknown): Given => (q && q.type === 'multi' ? (Array.isArray(g) ? g : g && typeof g === 'object' ? Object.values(g) : []) : g) as Given;
    const given = fixG(it0, raw0);
    if (!t.p && t.ph) { if (stage < n && t.s === stage) { const q = its[stage] as Question; says.push(q.say || ''); if (q.why) says.push(q.why.text); stage += 1; lastWrong = null; byPh = true; } return; }
    if (!t.p) {
      if (stage >= n || cost >= slots || t.s !== stage) return;
      const q = its[stage] as Question;
      if (grade(q, given)) { says.push(q.say || ''); if (q.why) says.push(q.why.text); stage += 1; lastWrong = null; if (stage >= n) leftAt = slots - cost; }
      else { cost += stage === n - 1 ? 1 : 0.5; wrong += 1; wrongAt[stage] = true; lastWrong = { s: stage, given }; }
    } else {
      if (t.p !== pass) { pass = t.p; pStage = 0; pSays = []; pWhy = -1; pCost = 0; pItems = chainItems(L, R, mid, uid, pass); }
      const PI = pItems as Question[];
      if (t.w) { const q = PI[t.s]; if (t.s === pWhy && q && q.why && Number(raw0) === q.why.answer) { pSays.push(q.why.text); pWhy = -1; whyOk = true; whySet.add(t.s); if (pStage >= PI.length) pDoneN += 1; } return; }
      if (pWhy >= 0 || t.s !== pStage || pStage >= PI.length || (!v4 && pCost >= CHAIN_SLOTS)) return; // v4 🔥 재도전 판 = 무료(❤ 안 씀 · 횟수 제한 없음)
      const q = PI[pStage] as Question;
      if (grade(q, fixG(q, raw0))) { pSays.push(q.say || ''); if (q.why) pWhy = pStage; pStage += 1; if (pStage >= PI.length && pWhy < 0) pDoneN += 1; }
      else { pCost += pStage === PI.length - 1 ? 1 : 0.5; pWrongBy[pass] = (pWrongBy[pass] || 0) + 1; }
    }
  });
  const left = Math.max(0, slots - cost), done = stage >= n, fail = !v4 && !done && left <= 0; // v4: ❤ 0 = 못 맞힘이 아니라 🙋 잠김
  const given0 = keys(healsOf(R, mid)[uid]).length; // 정식: 진필살기 · 금빛 컷인 칸은 묶기 · 힐이 아님 (그 값은 아직 없음)
  const tokens = done ? (v4 ? ENERGY : Math.floor(Math.max(0, leftAt >= 0 ? leftAt : slots - cost))) : 0, tokLeft = Math.max(0, tokens - given0);
  const locked = v4 ? !done && left <= 0 : !done && !fail && left <= 1 && !ok;
  // v4 ⚡ → 🔥 재도전 판: 쓴 ⚡ 수 = 열린 판 번호 · 다 맞힌 판 = pDoneN · 🌟 = 퍼펙트 + 판 1 · 2 를 각각 한 번에 · 세 번째 ⚡
  const rounds = pDoneN, roundOpen = v4 && given0 > rounds, trueOk = v4 && done && wrong === 0 && !byPh && given0 === 2 && rounds >= 2 && !pWrongBy[1] && !pWrongBy[2];
  const whyM = whyStages(its).length, whyDone = [...whySet].sort((a, b) => a - b);
  const stOk = Array.from({ length: n }, (_, i) => i < stage), stFirst = stOk.map((v, i) => v && !wrongAt[i]);
  return { chain: true, stOk, stFirst, whyM, whyN: whyDone.length, whyDone, whyAll: whyM > 0 && whyDone.length >= whyM, items: its, n, stage, cost, left, slots, wrong, lastWrong, says, done, fail, locked, ok, byPh,
    perfect: done && wrong === 0 && !byPh, perfectAt: done && wrong === 0 && !byPh ? 0 : -1, tokens, tokLeft,
    best: stage, total: n, submitted: subs.length > 0, tries: [], last: null, allRight: done, practice: pass > 0, pass, pStage, pSays, pItems, pDoneN, pWhy, whyOk, pLeft: v4 ? CHAIN_SLOTS : Math.max(0, CHAIN_SLOTS - pCost), pFail: !v4 && pass > 0 && pCost >= CHAIN_SLOTS && pStage < (pItems || []).length,
    healed, canRetry: false, canHeal: tokLeft > 0 && !roundOpen, nextAttempt: subs.length, ...(v4 ? { spent: given0, rounds, roundOpen, trueOk } : {}), nextK: subs.length ? (subs[subs.length - 1] as { k: number }).k + 1 : 0 };
}
/** 🔥 연습 타격 (📜 2026-11-13 밤 · 베타): 다 맞힌 뒤 🔥 한 판 더 · 연습 공격에서 맞힌 소문제(단계) 수 = 데미지 0 · 흔적만 (TV 「🔥 연습 타격 n」 · 처치 결과 한 줄) */
export function pracHits(L: LessonPack, R: Room, mid: string, uid: string): number {
  if (!L.monsters[mid]) return 0;
  if (isChain(L, R, mid)) { const r = chainRecord(L, R, mid, uid, true); return r.pass > 0 ? r.pDoneN * r.n + (r.pStage >= r.n ? 0 : r.pStage) : 0; }
  const r = plainRecord(L, R, mid, uid); return r.perfectAt >= 0 ? r.tries.slice(r.perfectAt + 1).reduce((a, t) => a + (t.correct || 0), 0) : 0;
}
/** 🔥 반 전체 연습 타격 합 */
export const pracHitsAll = (L: LessonPack, R: Room, mid: string) => Object.keys(R.players || {}).reduce((a, u) => a + pracHits(L, R, mid, u), 0);
/** 💥 졸개 쓰러짐 (정식 chainDown): 졸개 k 를 넘은 학생 ≥ ⌈살아 있는 머릿수 × 기준%⌉ · 대장은 체력 0 으로만 */
export function chainDown(L: LessonPack, R: Room, mid: string, now: number) {
  if (!isChain(L, R, mid)) return [];
  const ids = activeIds(R, now), recs = ids.map((u) => chainRecord(L, R, mid, u)), live = recs.filter((r) => !r.fail);
  const n = chainItems(L, R, mid, '_', 0).length, need = Math.ceil((live.length * pctOf(L, R)) / 100);
  return Array.from({ length: Math.max(0, n - 1) }, (_, k) => { const past = live.filter((r) => r.done || r.stage > k).length; const down = live.length > 0 && past >= need; return { k, past, all: live.length, need, down, max: need, left: down ? 0 : Math.max(0, need - past) }; });
}

// ── 인원 · 체력 ───────────────────────────────────────────
/** 접속한 학생 (선생님 · 종합실 빼고 · 최근 PRESENCE_MS 안에 소식) — 번호 순 */
export function activeIds(R: Room, now: number): string[] {
  const P = R.players || {};
  return keys(P).filter((u) => !P[u]?.teacher && !R.absent?.[u] && classNow(R, now) - (P[u]?.seen || 0) < PRESENCE_MS).sort((a, b) => num(R, a) - num(R, b));
}
/** 체력 머릿수 = 접속한 학생 중 🧪(베타 반 · 시험 계정 · players.x)을 뺀 수 · 공격 데미지는 그대로 (정식 #67 tester · #123) */
export const headcount = (R: Room, now: number) => R.state.headcount || Math.max(1, activeIds(R, now).filter((u) => !R.players?.[u]?.x).length);
export const pctOf = (L: LessonPack, R: Room) => R.meta.pct ?? L.defaultPct ?? 90;

/** 공동 체력 = ⌊인원 × 소문제 × 기준% ⌋ · 데미지 = 접속한 학생마다 best 합 (정식 monsterHp) */
export function monsterHp(L: LessonPack, R: Room, mid: string, now: number) {
  const n = isChain(L, R, mid) ? chainItems(L, R, mid, '_', 0).length : L.monsters[mid] ? itemsFor(L, R, mid, '_', 0).length : 0; // ⚔ 소레이드 = 인원 × 단계 수 × 기준%
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
export const bossItem = (L: LessonPack, R: Room, uid: string, i: number, a: number) => packBossItem(L, seedOf(R, uid), i, a + shiftOf(R, BOSS_ID));
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

// ── ⏱ 시계 두 갈래 (#118 · 선생님 11/12 바로잡음) ─────────────
//   벽시계(clock.now · S.now) 하나에서 두 갈래로만 파생 — 화면 · 규칙은 둘 중 하나만 읽는다 (따로 타이머를 두지 않음)
//   ① 수업 시계 classNow = 실제 시각 · 집중이어도 멈추지 않음 → 남은 수업 시간 · (앞으로) 보스 문 닫기 · 접속 판정
//   ② 게임 시계 gameNow = (집중 중이면 켠 시각, 아니면 지금) − 이 단계에서 멈춘 합 → 정찰 · 몬스터 공격 · 생각 시간 · 한 판 더 대기 · (앞으로) 박쥐 · 콤보 창 · 놀이 · 연출 반복
//      집중이면 함께 멈추고 끄면 그 자리에서 이어감 · 단계가 바뀌면 pauseMs 는 0 (stepAt 도 그때 새로)
export const classNow = (_R: Room | null, wall: number): number => wall;
export const focusOn = (R: Room) => !!R.state.focus;
export const restOn = (R: Room) => !!R.state.rest;
/** 게임 시계를 멈추는 것 = ⏸ 집중 · 🏕 쉼터 (둘이 겹쳐도 멈춘 시간은 한 번만 셈) */
export const held = (R: Room) => focusOn(R) || restOn(R);
export function gameNow(R: Room, wall: number): number {
  const st = R.state, at = held(R) && st.holdAt != null ? Math.min(wall, Number(st.holdAt)) : wall;
  return at - Number(st.pauseMs || 0);
}

/** ⏯ 이어서 자리 (#119 덧붙임 2 · 선생님 「수업 끝 = 저절로 기억」): 수업이 닫히거나 시간이 끝난 그때 단계
 *  몬스터 · 보스: 처치됨 → 다음 단계부터 / 처치 안 됨 → 그 단계부터(fresh = 숫자 바꾼 판) · 개념 · 도입 → 그 단계부터 · 마무리까지 감(또는 마지막 처치) → done */
export function stopOf(L: LessonPack, R: Room, now: number): { step: number; fresh: string | null; done: boolean } {
  if (isLobby(R)) return { step: 0, fresh: null, done: false };
  if (isEnd(L, R)) return { step: L.steps.length, fresh: null, done: true };
  const st = stepOf(L, R) as Step, i = stepIdx(R);
  const killed = st.kind === 'monster' ? !!L.monsters[st.id] && cleared(L, R, st.id, now) : st.kind === 'boss' ? bossHp(L, R, now).won : false;
  if (killed) { const n = nextIdx(L, R); return { step: n, fresh: null, done: n >= L.steps.length }; }
  return { step: i, fresh: st.kind === 'monster' || st.kind === 'boss' ? (st.kind === 'boss' ? BOSS_ID : st.id) : null, done: false };
}

/** ⏱ 남은 수업 시간 (정식 deadline · timeLeft) — ① 수업 시계: 집중 중에도 줄어듦 */
export const deadline = (R: Room): number | null => { const d = R.state.deadline || R.meta.deadline; return d ? d + (Number(R.state.extend) || 0) * 60e3 : null; };
export const timeLeft = (R: Room, wall: number): number | null => { const d = deadline(R); return d == null ? null : Math.max(0, d - classNow(R, wall)); };

// ── 🌫 정찰 (정식 solveLock · v3 = 모든 몬스터 · 보스 앞 meta.solve 초 · 「⚔ 등장!」으로 일찍) ──
export function solveLock(L: LessonPack, R: Room, now: number) {
  const step = stepOf(L, R);
  if (!step || !['monster', 'boss'].includes(step.kind) || step.later) return null;
  const id = step.kind === 'boss' ? BOSS_ID : step.id, sec = NEWR(R) ? Number(R.meta.solve) : 0;
  if (!(sec > 0)) return null;
  const g = gameNow(R, now), t0 = R.state.stepAt != null ? Number(R.state.stepAt) : g;
  const end = Math.min(t0 + sec * 1000 + Number(R.state.solveAdd?.[id] || 0), Number(R.state.solveEnd?.[id]) || Infinity);
  return { id, sec, t0, end, left: Math.max(0, end - g), on: g < end };
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
export interface Atk { kind: 'monster' | 'boss'; mid: string; per: number; lock: number; phase: number; paused: boolean; focus: boolean; ratio: number; t: number; k: number; p: number }
export function atkClock(L: LessonPack, R: Room, now: number): Atk | null {
  const step = stepOf(L, R);
  if (!step || step.later) return null;
  const kind = step.kind === 'monster' && L.monsters[step.id] && !cleared(L, R, step.id, now) ? 'monster' : step.kind === 'boss' && L.boss && !bossHp(L, R, now).won ? 'boss' : null;
  if (!kind) return null;
  const a = ATK[kind];
  const hp = kind === 'monster' ? monsterHp(L, R, step.id, now) : bossHp(L, R, now), ratio = hp.max ? Math.max(0, Math.min(1, hp.left / hp.max)) : 1;
  const per = a[0] + (a[1] - a[0]) * (1 - ratio);
  const phase = kind === 'boss' ? bossPhase(ratio) : null, lock = phase ? phase.lock : a[2];
  const g = gameNow(R, now), focus = focusOn(R);
  const sl = solveLock(L, R, now), slHeld = sl ? Math.max(0, Math.min(g, sl.end) - sl.t0) : 0;
  const start = R.state.stepAt != null ? R.state.stepAt : g;
  const t = Math.max(0, (g - start - slHeld) / 1000 - bindSec(R, kind === 'boss' ? BOSS_ID : step.id)); // ⛓ 묶기 = 반 전체 묶기 × 3초만큼 공격이 늦어짐 (#152 · 정식 BIND_TOKEN)
  return { kind, mid: kind === 'boss' ? BOSS_ID : step.id, per, lock, phase: phase ? phase.phase : 0, paused: !!(sl && sl.on) || held(R), focus, ratio, t, k: Math.floor(t / per), p: (t % per) / per };
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
/** 🛡 홀리 방패를 켤 수 있나 (정식 holyCan): +10 · 이 몬스터 퍼펙트(한 번의 시도에서 모두 · 소레이드 = 틀림 없이 완성) · 보스 = 형성평가 모든 문항 도달 · 몬스터마다 한 번 · 쓰러지기 전 */
export function holyCan(L: LessonPack, R: Room, uid: string, now: number): boolean {
  const step = stepOf(L, R), p = R.players?.[uid] as { enh?: number } | undefined;
  if (!step || !awake(p)) return false;
  if (step.kind === 'boss') return !!L.boss && !holyUsed(R, BOSS_ID, uid) && !bossHp(L, R, now).won && (() => { const b = bossState(L, R, uid); return b.length > 0 && b.every((x) => x.ok); })();
  if (step.kind !== 'monster' || !L.monsters[step.id] || holyUsed(R, step.id, uid) || cleared(L, R, step.id, now)) return false;
  if (isChain(L, R, step.id)) { const cr = chainRecord(L, R, step.id, uid); return !!(cr.done && cr.perfect); }
  return plainRecord(L, R, step.id, uid).perfect;
}
