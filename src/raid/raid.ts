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
function healsTo(R: Room, mid: string, uid: string) {
  const out: { from: string; k: number }[] = [];
  Object.entries(healsOf(R, mid)).forEach(([from, byK]) => Object.entries(byK || {}).forEach(([k, to]) => { if (to === uid) out.push({ from, k: Number(k) }); }));
  return out.sort((a, b) => num(R, a.from) - num(R, b.from) || a.k - b.k);
}
export const healsReceived = (R: Room, mid: string, uid: string) => Math.min(R.meta.healMax, healsTo(R, mid, uid).length);

export interface Rec {
  chain?: false;
  tries: { attempt: number; given: Given[]; marks: boolean[]; correct: number; total: number }[];
  best: number; total: number; perfect: boolean; perfectAt: number; practice: boolean;
  submitted: boolean; slots: number; left: number; healed: number; fix: boolean; tokens: number; tokLeft: number;
  canRetry: boolean; canHeal: boolean; nextAttempt: number;
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

// ── ⚔ 소레이드 (정식 2026-11-09 #18 · 방 version 3 · 차시 팩 monsters[mid].chain) ──
//   학생마다 졸개 ① → … → 👑 대장을 자기 속도로 · 저장 chain/{mid}/{uid}/{k} = { s 단계, p 판(0 = 진짜 · 1~ = 숫자 바뀐 연습), g 답 } · 틀려도 같은 숫자
//   기회 4칸: 졸개 오답 0.5 · 대장 오답 1 · 남은 기회 ≤ 1 이면 잠김 → 선생님 chainOk = ✔ 풀어주기 · 0 이하 = 못 맞힘
//   데미지 = 맞힌 단계 수 · 퍼펙트 = 한 번도 안 틀리고 대장까지 · 🔥 한 판 더 = 판마다 새 4칸 · 최대 PRAC_MAX 판
export const CHAIN_SLOTS = 4;
export const PRAC_MAX = 3;
export const isChain = (L: LessonPack, R: Room, mid: string) => NEWR(R) && !!L.monsters[mid]?.chain;
export const chainItems = (L: LessonPack, R: Room, mid: string, uid: string, pass: number) => packChainItems(L, mid, seedOf(R, uid), (pass || 0) + shiftOf(R, mid));
const chainSubs = (R: Room, mid: string, uid: string) => { const a = R.chain?.[mid]?.[uid] || {}; return keys(a).map(Number).sort((x, y) => x - y).map((k) => ({ k, ...(a[k] as ChainSub) })); };
export const whyStages = (its: Question[]) => (its || []).map((q, i) => (q && q.why ? i : -1)).filter((i) => i >= 0);
export const pracUsed = (R: Room, mid: string, uid: string, rec?: { pass?: number }) => Math.max(Number(R.players?.[uid]?.pr?.[mid]) || 0, (rec && rec.pass) || 0);
/** 소레이드 단계 정답 (서술형 통과로 채울 값 · 시연 정답 펼치기) */
export const answerOf = (q: Question): Given => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.type === 'blanks' ? q.items.map((it) => it.answer) : q.type === 'text' ? (q.answers || [])[0] ?? '' : q.type === 'subsets' ? null : q.answer);

export interface ChainRec {
  chain: true; items: Question[]; n: number; stage: number; cost: number; left: number; slots: number; wrong: number;
  lastWrong: { s: number; given: Given } | null; says: string[]; done: boolean; fail: boolean; locked: boolean; ok: boolean; byPh: boolean;
  perfect: boolean; perfectAt: number; tokens: number; tokLeft: number; stOk: boolean[]; stFirst: boolean[];
  whyM: number; whyN: number; whyDone: number[]; whyAll: boolean;
  best: number; total: number; submitted: boolean; tries: never[]; last: null; allRight: boolean; practice: boolean; pass: number; pStage: number; pSays: string[]; pItems: Question[] | null;
  pDoneN: number; pWhy: number; whyOk: boolean; pLeft: number; pFail: boolean; healed: number; canRetry: false; canHeal: boolean; nextAttempt: number; nextK: number;
}
/** 정식 chainRecord 그대로 */
export function chainRecord(L: LessonPack, R: Room, mid: string, uid: string): ChainRec {
  const its = chainItems(L, R, mid, uid, 0), n = its.length, subs = chainSubs(R, mid, uid);
  const ok = !!R.chainOk?.[mid]?.[uid];
  let stage = 0, cost = 0, wrong = 0, lastWrong: ChainRec['lastWrong'] = null, byPh = false, leftAt = -1;
  const says: string[] = [], wrongAt: Record<number, boolean> = {};
  const healed = healsReceived(R, mid, uid), slots = CHAIN_SLOTS + healed;
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
      if (pWhy >= 0 || t.s !== pStage || pStage >= PI.length || pCost >= CHAIN_SLOTS) return;
      const q = PI[pStage] as Question;
      if (grade(q, fixG(q, raw0))) { pSays.push(q.say || ''); if (q.why) pWhy = pStage; pStage += 1; if (pStage >= PI.length && pWhy < 0) pDoneN += 1; }
      else pCost += pStage === PI.length - 1 ? 1 : 0.5;
    }
  });
  const left = Math.max(0, slots - cost), done = stage >= n, fail = !done && left <= 0;
  const given0 = keys(healsOf(R, mid)[uid]).length; // 정식: 진필살기 · 금빛 컷인 칸은 묶기 · 힐이 아님 (그 값은 아직 없음)
  const tokens = done ? Math.floor(Math.max(0, leftAt >= 0 ? leftAt : slots - cost)) : 0, tokLeft = Math.max(0, tokens - given0);
  const locked = !done && !fail && left <= 1 && !ok;
  const whyM = whyStages(its).length, whyDone = [...whySet].sort((a, b) => a - b);
  const stOk = Array.from({ length: n }, (_, i) => i < stage), stFirst = stOk.map((v, i) => v && !wrongAt[i]);
  return { chain: true, stOk, stFirst, whyM, whyN: whyDone.length, whyDone, whyAll: whyM > 0 && whyDone.length >= whyM, items: its, n, stage, cost, left, slots, wrong, lastWrong, says, done, fail, locked, ok, byPh,
    perfect: done && wrong === 0 && !byPh, perfectAt: done && wrong === 0 && !byPh ? 0 : -1, tokens, tokLeft,
    best: stage, total: n, submitted: subs.length > 0, tries: [], last: null, allRight: done, practice: pass > 0, pass, pStage, pSays, pItems, pDoneN, pWhy, whyOk, pLeft: Math.max(0, CHAIN_SLOTS - pCost), pFail: pass > 0 && pCost >= CHAIN_SLOTS && pStage < (pItems || []).length,
    healed, canRetry: false, canHeal: tokLeft > 0, nextAttempt: subs.length, nextK: subs.length ? (subs[subs.length - 1] as { k: number }).k + 1 : 0 };
}
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
export const headcount = (R: Room, now: number) => R.state.headcount || Math.max(1, activeIds(R, now).length);
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
  const t = Math.max(0, (g - start - slHeld) / 1000);
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
