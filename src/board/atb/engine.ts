// ⚔ 게시판 던전 ATB — 전투 엔진 (순수 · 같은 씨앗 = 같은 판) · 📜 docs/board-atb/design/정리.md 3절 · 결정 S · U · V
//   한 곳(진행 폰 · 연습방 = 이 폰)만 tick · 행동을 적용 · 화면은 state 를 그리기만 · 시각 = 초(서버 시각에서 뺀 게임 시각)
//   ⏳ 작전 시간(수호자) · 강적 출현 연출 · 재접속 = 학생 판에서 붙임
import { BOSS_HIT, BOSS_HP_BASE, DIFF_MUL, ATK, ROLE_SKILL, SIG, T, REACT, REACT_CFG, atkClass, attrFx, ATTR_FX_TXT, fxOfAttr, type AttrFx, rage as RAGE, ATK_SPECIAL, atkName, type RageMod, type AtkClass, type AtkKind as AK, type AtkKind, type BossCfg, type Diff, type Fam, type Role, shieldOf } from './tune';
import type { Stats } from './heroes';

export type Timing = 'miss' | 'ok' | 'crit';
/** 💠 스킬 종류 (Y2 · Y3): 보호막 부수기 · 장착 · 4레벨 · 역할 · 오라 방패 · 각성 · 부활 */
export type SkillK = 'shield' | 'equip' | 'tier4' | 'role' | 'aura' | 'awk' | 'revive' | 'heal';
export interface Hero { id: number; s: Stats; hp: number; atb: number; /** ⚡ 충전 칸 (0 ~ T.charge.max · Y1) */ ch: number; down: boolean; slowUntil: number; stunUntil: number; cover: number; tickets: number; awkUsed: boolean; auraUsed: boolean; atbBonus: number; /** 수면 = 맞으면 깸 */ stunKind: '' | 'sleep' | 'bind'; /** 넘친 충전 모음 (½ 칸 · 요청 #49) */ ovf?: number; /** 느려짐을 건 공격 (상태 그림 · 요청 #40) */ slowKind?: AtkKind; /** 🔩 16 톱니 표식 겹 (요청 #57) */ mark?: number;
  /** 기록 (결과창) */ log: { shields: number; dmg: number; covers: number; heals: number; revives: number; boosts: number; right: number; ult: number; /** 🛡 반응 막기 (요청 #35) */ blocks?: number; /** 💚 구조 = 30% 아래 친구를 큰 힐로 (요청 #46) */ rescues?: number; /** 💥 속성 브레이크 (약점 계열 · 내 칸) */ brk?: number; /** ⚔ 끊기 (딜러 반응 막기 · blocks 안에 들어 있음) */ cuts?: number; /** 퍼펙트 원문항 (결과 「내 활약」 · 요청 #24 ⑦) */ perfect?: number; /** 끝낸 학습지 문제 번호 (화면이 적음 · 요청 #24 덧붙임) */ sheets?: string[]; /** ⭐ 첫 시도 기록 (소문항 · 화면이 적음 · 별 = board gradeOf 그대로 · 요청 #29) */ first?: { ok: number; bad: number; none: number; total: number } } }
export interface Cell { /** (옛 · 📜 #95 주인 없음 · 무시) */ owner?: number; fam: Fam; broken: boolean; by?: number }
export type Ev =
  | { k: 'atk'; t: number; who: number; dmg: number; timing: Timing; /** 문제 카드를 연 채 자동 일반 공격 (요청 #11) */ auto?: boolean }
  | { k: 'skill'; t: number; who: number; dmg: number; kind: 'equip' | 'tier4' | 'awk'; cost: number; /** 넘친 충전으로 자동 (요청 #13) */ auto?: boolean }
  | { k: 'aura'; t: number; who: number; stone: number }
  | { k: 'guard'; t: number; atk: string }
  | { k: 'rage'; t: number; on: 'rage' | 'calm' | 'calmEnd' | 'perf'; n?: number }
  | { k: 'fam'; t: number; who: number; fx: AttrFx; v?: number; to?: number; tick?: boolean }
  | { k: 'react'; t: number; who: number; how: 'cover' | 'barrier' | 'cut'; cls: AtkClass; atk: string; to?: number; dmg?: number }
  | { k: 'charge'; t: number; who: number; /** 들어간 칸 (사건 번호 n 과 겹치지 않게 · 요청 #41) */ add: number; perfect: boolean; /** 넘친 칸 (자동 스킬로 감) */ over?: number }
  | { k: 'shield'; t: number; who: number; cells: number[]; last: boolean }
  | { k: 'shieldUp'; t: number }
  | { k: 'role'; t: number; who: number; role: Role; to?: number; dmg?: number; /** 💚 큰 힐 회복량 · 구조 (요청 #46) */ v?: number; rescue?: boolean }
  | { k: 'heal'; t: number; who: number; /** 🩹 응급 힐 = 한 명 · 힐러 일반 공격 = 모두 (to 없음) */ to?: number; v: number; kind: 'aid' | 'atk' }
  | { k: 'revive'; t: number; who: number; to: number }
  | { k: 'boss'; t: number; atk: string; kind?: AtkKind; aoe: boolean; to: number[]; dmg: number[] }
  | { k: 'down'; t: number; who: number }
  | { k: 'gift'; t: number; who: number; to: number }
  | { k: 'sig'; t: number; what: 'breathWarn' | 'breathHeal' | 'breathCut' | 'mirrorOn' | 'reflect' | 'unbind' | 'healNow' | /** 📜 #57 */ 'contra' | 'reverseBack' | 'chain' | 'refreeze' | 'retarget'; who?: number; v?: number }
  | { k: 'cap'; t: number; at: 'warn' | 'call' } /* 📜 #92 10분 상한 알림 */
  | { k: 'end'; t: number; win: boolean; why: string };
export interface State {
  t: number; diff: Diff; boss: BossCfg; seed: number; rnd: number;
  bossHp: number; bossMax: number; bossT: number; bossN: number; target: number[] | null; aoeNext: boolean;
  /** 예고된 다음 공격 · 기우는 저울 쪽(L · R · 수평 = '') · 거울빛 반사 끝 · 숨 고르기 예고 시각 · 다음 숨 */ nextAtk: AtkKind | null; tilt: 'L' | 'R' | ''; mirrorUntil: number; breathWarn: number | null; breathNext: number;
  shieldUp: boolean; shieldAt: number; cells: Cell[]; weakUntil: number;
  /** 🛡 오라 방패 = 다음 보스 공격 1번 팀 전체 막음 · 🗿 석화 끝 시각(보스 공격 시계 멈춤) */ guard: boolean; stoneUntil: number;
  /** 광역 회복을 마지막으로 쓴 보스 공격 차례 (팀 전체 · 보스 공격 한 번 사이 1번) */ healN: number;
  /** 🌈 계열 덧효과 (요청 #36): 🔥 화상(끝 · 초당 · 다음 틱) · 🧊 이번 공격까지 늦춘 초 · 📖 다음 약점 시간 덤 */ burn?: { until: number; per: number; next: number; who: number } | null; frozen?: number; exposeNext?: number; curseUntil?: number;
  /** 👹 분노 (요청 #37): 들어감 · 진정 끝 시각 · 진정까지 모은 퍼펙트 · 다음에 낼 공격(특수) · 분노 뒤 공격 차례 */ /** ⚡ 넘침 자동 스킬 줄 (요청 #41) */ autoQ?: { who: number; at: number }[]; autoLast?: number;
  rage?: boolean; calmUntil?: number; ragePerf?: number; forceAtk?: AK | null; rageN?: number;
  /** 📜 요청 #57 v4: 13 등호의 순간 끝 · 15 다음 차례 자리 · 17 방금 가장 큰 스킬 피해 · 되돌릴 값 · 분노 늦은 표적 다시 정함 · 마지막으로 깬 실드 칸 · 다시 언 칸 · 이어 쓰는 공격 표적 = 느려진 용사 중 HP 가장 낮은 */
  /** 숨 고르기로 회복한 합 */ healed?: number; eqUntil?: number; ordI?: number; big?: { who: number; v: number } | null; revV?: number; lateDone?: boolean; lastBrk?: number; refrozen?: number | null; pickLow?: boolean;
  /** 🛡 이번 예고된 공격을 반응 막기 한 용사 (📜 요청 #35 · 먼저 쓴 사람만) */ blocked?: { by: number; how: 'cover' | 'barrier' | 'cut' } | null;
  /** 📊 판 기록 (균형 도구 · 📜 11/20 「판마다 실제 기록」) */ rec: { /** 📜 #95 도움표로 깬 칸 */ helpBrk?: number; subSec: number[]; timing: { n: number; ok: number; crit: number }; skills: Partial<Record<SkillK | 'react', number>>; charges: number; /** 넘침 자동 스킬 수 */ overflow?: number; /** 🎯 예고 종류별 횟수 · 30% 아래 친구가 생긴 적 (임무 기회 · 요청 #50) */ tele?: Record<AtkClass, number>; lowSeen?: boolean; downs: number; revives: number; lastAns: number[] };
  /** 📜 #92 10분 상한 알림 단계 (1 = 7:00 · 2 = 9:00) */ capAt?: number;
  heroes: Hero[]; revives: number; ev: (Ev & { n?: number })[]; /** 사건 번호 (화면이 「어디까지 봤나」) */ evN: number; end: null | { win: boolean; why: string; t: number };
}
// ── 난수 (mulberry32) ──
const rand = (S: State) => { let a = (S.rnd += 0x6d2b79f5); a = Math.imul(a ^ (a >>> 15), a | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; };
export const alive = (S: State) => S.heroes.filter((h) => !h.down);
export const weak = (S: State) => S.t < S.weakUntil;

export function newBattle(o: { boss: BossCfg; diff: Diff; party: Stats[]; seed?: number }): State {
  const n = Math.max(1, Math.min(4, o.party.length)), max = Math.round((T.bossHpByNo[o.boss.no] ?? BOSS_HP_BASE)[n - 1]! * DIFF_MUL[o.diff].hp * (o.diff === 'hard' ? (T.hardHpByNo[o.boss.no]?.[n - 1] ?? 1) : 1));
  return {
    t: 0, diff: o.diff, boss: o.boss, seed: o.seed ?? 1, rnd: o.seed ?? 1,
    bossHp: max, bossMax: max, bossT: 0, bossN: 0, target: null, aoeNext: false, nextAtk: null, tilt: '', mirrorUntil: 0, breathWarn: null, breathNext: 0,
    shieldUp: false, shieldAt: 0, cells: [], weakUntil: 0, guard: false, stoneUntil: 0,
    heroes: o.party.map((s, id) => ({ id, s, hp: s.maxHp, atb: 0.35 + 0.1 * id, ch: T.chargeStart, down: false, slowUntil: 0, stunUntil: 0, cover: 0, tickets: 0, awkUsed: false, auraUsed: false, atbBonus: 0, stunKind: '', log: { shields: 0, dmg: 0, covers: 0, heals: 0, revives: 0, boosts: 0, right: 0, ult: 0 } })),
    revives: T.revives, ev: [], evN: 0, end: null, healN: -1, blocked: null,
    rec: { subSec: [], timing: { n: 0, ok: 0, crit: 0 }, skills: {}, charges: 0, downs: 0, revives: 0, lastAns: o.party.map(() => 0) },
  };
}
const push = (S: State, e: Ev) => { S.evN++; S.ev.push({ ...e, n: S.evN }); if (S.ev.length > 200) S.ev.splice(0, S.ev.length - 200); };
/** 보스가 받는 피해 (실드 중 감소 · 약점 시간 2배 · 실드 칸이 남으면 HP 1 에서 멈춤 · 📜 #84 쓰러진 친구는 상관없음) */
function hitBoss(S: State, raw: number, pierce = 1, flat = false): number {
  if (!flat && S.curseUntil && S.t < S.curseUntil) raw *= 1 + attrFx.curse.pct; // 🌑 저주
  if (!flat && S.boss.sig === 'eqMoment' && S.t < (S.eqUntil ?? 0)) raw *= SIG.eq.mul; // 13 등호의 순간 (보스 공격 뒤 3초)
  const mul = flat ? 1 : weak(S) ? T.weakDmg : S.shieldUp && S.cells.some((c) => !c.broken) ? Math.min(1, (S.boss.shieldDmg ?? T.shieldDmg) * pierce) : 1;
  const dmg = Math.max(1, Math.round(raw * mul)), floor = S.cells.some((c) => !c.broken) ? 1 : 0; /* 📜 #84 쓰러진 친구가 있어도 HP 1 에서 안 멈춤 (전: 1 에서 버티다 전멸 = 패배) · 실드 칸이 남았을 때만 1 */
  const before = S.bossHp; S.bossHp = Math.max(floor, S.bossHp - dmg);
  if (!S.rage && S.bossHp > 0 && S.bossHp <= S.bossMax * RAGE.at) { S.rage = true; S.ragePerf = 0; S.rageN = 0; S.forceAtk = rageSpecial(S); S.target = null; S.nextAtk = null; S.aoeNext = false; S.bossT = Math.max(S.bossT, RAGE.every[S.diff] - (ATK[S.forceAtk].warn ?? T.telegraph)); push(S, { k: 'rage', t: S.t, on: 'rage' }); const M = modOf(S); if (M?.refreeze && S.lastBrk != null && S.cells[S.lastBrk]?.broken) { const c = S.cells[S.lastBrk]!; c.broken = false; S.refrozen = S.lastBrk; S.weakUntil = Math.min(S.weakUntil, S.t); push(S, { k: 'sig', t: S.t, what: 'refreeze', who: c.owner }); } } // 👹 분노 = 특수 한 번 바로(예고 4초) · 4 얼음 갑옷 다시
  if (!S.shieldUp && !S.cells.length && S.bossHp <= S.bossMax * T.shieldAt) { // 실드 펼침 · 각자 1칸 · 그 용사 계열
    S.shieldUp = true; S.shieldAt = S.t; S.breathNext = S.t + breathEvery(S); S.cells = shieldOf(S.boss).map((fam) => ({ fam, broken: false })); push(S, { k: 'shieldUp', t: S.t }); /* 📜 #95 보스가 정한 속성 4칸 */
    if (S.bossHp <= 0) S.bossHp = 1; /* 한 방에 70% 위 → 0 = 실드가 펼쳐진 채 HP 0 이던 틈 · 실드 칸이 남으면 HP 1 (#84 규칙과 같게) */
  }
  checkEnd(S);
  return before - S.bossHp;
}
/** 🧪 e2e 전용 = 판을 이기게 끝냄 (실드 칸 다 깸 · HP 0 · 엔진의 끝 판정 그대로) */
export function debugWin(S: State) { if (S.end) return; if (!S.cells.length) S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true })); S.cells.forEach((c) => (c.broken = true)); S.shieldUp = true; S.bossHp = 0; checkEnd(S); }
function checkEnd(S: State) {
  if (S.end) return;
  if (S.bossHp <= 0 && S.cells.every((c) => c.broken)) { /* 📜 #84 보스 HP 0 = 바로 승리 (쓰러진 친구가 있어도 · 그 뒤 패배 판정 없음) */ S.end = { win: true, why: '보스 쓰러뜨림', t: S.t }; push(S, { k: 'end', t: S.t, win: true, why: S.end.why }); return; }
  const downs = S.heroes.filter((h) => h.down).length;
  if (downs && (S.heroes.length === 1 || downs === S.heroes.length)) { /* 📜 #92 패배 = 전멸만 (혼자 = 내가 쓰러지면) · 팀 부활 횟수 없음 */ S.end = { win: false, why: S.heroes.length === 1 ? '쓰러짐' : '전멸', t: S.t }; push(S, { k: 'end', t: S.t, win: false, why: S.end.why }); }
}
/** 👹 보스 공격 간격 (분노 = 난이도별 짧게 · 요청 #37) */
export const bossEveryOf = (S: State) => (S.rage ? RAGE.every[S.diff] : T.bossEvery) * (S.t >= T.cap.warn ? T.cap.every : 1); /* 📜 #92 7:00 뒤 공격 간격 −20% */
export const calmed = (S: State) => !!S.calmUntil && S.t < S.calmUntil;
/** 분노 때 낼 특수 = 설정표(rageSpecial) · 없으면 그 보스 특수 공격(없으면 광역) */
const rageSpecial = (S: State): AK => S.boss.rageSpecial ?? (S.boss.cycle.find((k) => ATK_SPECIAL.has(k)) ?? 'aoe');
/** 👹 차시별 분노 (📜 요청 #57) = 분노 중 · 일반 · 도전만 */
export const modOf = (S: State): RageMod | undefined => (S.rage && S.diff !== 'easy' ? S.boss.rageMod : undefined);
/** 분노 차례 = (차시별 차례 · 바꿈) + 특수 하나 */
export const rageCycleOf = (S: State): AK[] => { const M = modOf(S), base = M?.cycle ?? S.boss.cycle; return [...base.map((k) => M?.swap?.[k] ?? k), rageSpecial(S)]; };
/** 이번 차례 공격 = 강제(분노 들어감 · 이어 쓰기) → 분노 중엔 차례마다 특수 하나 더(cycle + 특수) */
const kindOf = (S: State): AK => { if (S.forceAtk) return S.forceAtk; if (S.rage) { const c = rageCycleOf(S); return c[(S.rageN ?? 0) % c.length] ?? 'basic'; } return S.boss.cycle[S.bossN % S.boss.cycle.length] ?? 'basic'; };
/** 6 · 7 숨 고르기 회복 = 8% · 판 전체 회복 합 상한 (SIG.breath.healMax · 끊을 사람이 없는 판도 끝나게) */
function breathHeal(S: State): number { const room = Math.max(0, Math.round(S.bossMax * SIG.breath.healMax) - (S.healed ?? 0)), v = Math.min(room, Math.round(S.bossMax * SIG.breath.heal), S.bossMax - S.bossHp); S.bossHp += v; S.healed = (S.healed ?? 0) + v; return v; }
const breathEvery = (S: State) => modOf(S)?.breathEvery ?? SIG.breath.every;
/** 15 하나씩 차례로 = 다음 단일 표적 (쓰러진 용사 건너뜀 · 분노 = 거꾸로) */
export function orderNext(S: State): number | null {
  if (S.boss.sig !== 'order') return null; const n = S.heroes.length, rev = !!modOf(S)?.orderRev, i0 = S.ordI ?? 0;
  for (let k = 0; k < n; k++) { const j = rev ? (((n - 1 - i0 - k) % n) + n) % n : (i0 + k) % n; if (!S.heroes[j]!.down) return j; }
  return null;
}
/** 그 판 보스 기본 단일 피해 (방어 · 엄호 전) */
const singleBase = (S: State) => { const n = Math.max(1, Math.min(4, S.heroes.length)); return BOSS_HIT[S.diff][n - 1]![0] * (T.bossAtkByNo[S.boss.no] ?? 1) * (T.bossHitByNo[S.boss.no]?.[n - 1] ?? 1) * (S.rage ? RAGE.mul[S.diff] : 1); };
/** 🎯 단일 표적 고르기 (v4: 표식 · 차례 · 되돌리기 · 이어 쓰기 · 둘) */
function pickSingle(S: State, kind: AK, live: Hero[]): number[] {
  const A = ATK[kind], M = modOf(S);
  let id: number | undefined;
  const marked = live.filter((h) => (h.mark ?? 0) > 0).sort((a, b) => (b.mark ?? 0) - (a.mark ?? 0))[0];
  if (A.special === 'reverse') { const b = S.big && !S.heroes[S.big.who]?.down ? S.big : null; id = b?.who; S.revV = b ? Math.min(Math.round(b.v * (M?.revPct ?? SIG.reverse)), Math.round(singleBase(S) * SIG.revCap)) : 0; } // 상한 = 그 판 보스 기본 단일 ×2 (인원 · 난이도 비례 · 1인 판이 한 방에 끝나지 않게)
  else if (marked && S.boss.sig === 'compose') id = marked.id;
  else if (S.pickLow) { const sl = live.filter((h) => S.t < h.slowUntil), pool = sl.length ? sl : live; id = pool.slice().sort((a, b) => a.hp / a.s.maxHp - b.hp / b.s.maxHp)[0]!.id; }
  else if (S.boss.sig === 'order') { const j = orderNext(S); if (j != null) { id = j; const n = S.heroes.length, rev = !!M?.orderRev; S.ordI = rev ? (n - 1 - j + 1) % n : (j + 1) % n; } }
  S.pickLow = false;
  if (id == null) id = live[Math.floor(rand(S) * live.length)]!.id;
  const out = [id];
  if (M?.two?.kinds.includes(kind) && live.length > 1) { const rest = live.filter((h) => h.id !== id); out.push(rest[Math.floor(rand(S) * rest.length)]!.id); }
  return out;
}
export const upcomingOf = (S: State): AK => S.nextAtk ?? kindOf(S);
const ready = (h: Hero, S: State) => !S.end && !h.down && h.atb >= 1 && S.t >= h.stunUntil;
const spend = (h: Hero) => { h.atb = Math.min(0.99, h.atbBonus); h.atbBonus = 0; };

// ── 시간 ──
export function tick(S: State, dt: number): State {
  if (S.end) return S;
  S.t = +(S.t + dt).toFixed(4);
  runAuto(S); if (S.end) return S;
  /* 📜 #92 10분 상한 = 7:00 경고 · 9:00 부름 · 10:00 후퇴 (승패 판정보다 늦게 · 한 번씩) */
  if (S.t >= T.cap.end) { S.end = { win: false, why: '후퇴', t: S.t }; push(S, { k: 'end', t: S.t, win: false, why: '후퇴' }); return S; }
  if (S.t >= T.cap.call && (S.capAt ?? 0) < 2) { S.capAt = 2; push(S, { k: 'cap', t: S.t, at: 'call' }); }
  else if (S.t >= T.cap.warn && (S.capAt ?? 0) < 1) { S.capAt = 1; push(S, { k: 'cap', t: S.t, at: 'warn' }); }
  const W = weak(S);
  for (const h of S.heroes) {
    if (h.down || S.t < h.stunUntil) continue;
    const sp = (W ? T.weakAtb : 1) * (S.t < h.slowUntil ? T.slowX : 1);
    h.atb = Math.min(1, h.atb + (dt / h.s.atbSec) * sp);
  }
  if (S.burn && S.t >= S.burn.next && S.t <= S.burn.until + 1e-6) { const b = S.burn; const d = hitBoss(S, b.per); const hh = S.heroes[b.who]; if (hh) hh.log.dmg += d; b.next += 1; push(S, { k: 'fam', t: S.t, who: b.who, fx: 'burn', v: d, tick: true }); if (b.next > b.until + 1e-6) S.burn = null; checkEnd(S); if (S.end) return S; } // 🔥 화상 1초마다
  if (S.rage && S.calmUntil && S.t >= S.calmUntil) { S.calmUntil = 0; push(S, { k: 'rage', t: S.t, on: 'calmEnd' }); } // 😮‍💨 진정 끝 = 다시 분노
  if (W || S.t < S.stoneUntil || calmed(S)) return S; // 약점 시간 · 🗿 석화 · 😮‍💨 진정 = 보스 공격 멈춤
  S.bossT += dt;
  const EV = bossEveryOf(S), live = alive(S), kind = kindOf(S), A = ATK[kind];
  if (!S.target && S.bossT >= EV - (A.warn ?? T.telegraph) && live.length) { // 표적 예고 (보통 2초 · 화염 숨 · 거울빛 3초)
    let aoe = !!A.aoe; S.tilt = '';
    if (A.special === 'scale') { const tiltN = rand(S) < SIG.scaleTilt; aoe = !tiltN; } // 기우는 저울: 기울면 단일 · 수평이면 광역
    S.nextAtk = kind; S.aoeNext = aoe; S.lateDone = false; S.target = aoe ? live.map((h) => h.id) : pickSingle(S, kind, live);
    if (A.special === 'scale' && !aoe) S.tilt = S.target[0]! % 2 ? 'R' : 'L';
    { const c = atkClass(kind, aoe), tl = (S.rec.tele ??= { single: 0, aoe: 0, special: 0 }); tl[c]++; } // 🎯 임무 기회 셈 (요청 #50)
  }
  { const M = modOf(S); if (M?.late && S.target && S.nextAtk && !S.lateDone && !S.blocked && S.bossT >= EV - M.late && live.length > 1) { // 👹 3 속임 고개 · 10 흔들리는 저울 = 마지막 2초에 다시 정함
    S.lateDone = true; const K = ATK[S.nextAtk];
    if (K.special === 'scale') { const tiltN = rand(S) < SIG.scaleTilt; S.aoeNext = !tiltN; S.target = S.aoeNext ? live.map((h) => h.id) : [live[Math.floor(rand(S) * live.length)]!.id]; S.tilt = S.aoeNext ? '' : S.target[0]! % 2 ? 'R' : 'L'; }
    else if (!S.aoeNext && !ATK_SPECIAL.has(S.nextAtk)) { const rest = live.filter((h) => h.id !== S.target![0]); S.target = [rest[Math.floor(rand(S) * rest.length)]!.id]; }
    push(S, { k: 'sig', t: S.t, what: 'retarget', who: S.target[0] });
  } }
  if (S.boss.sig === 'breath' && S.shieldUp && S.cells.some((c) => !c.broken)) { // 6 · 7 숨 고르기
    if (S.breathWarn == null && S.t >= S.breathNext) { S.breathWarn = S.t; (S.rec.tele ??= { single: 0, aoe: 0, special: 0 }).special++; push(S, { k: 'sig', t: S.t, what: 'breathWarn' }); }
    else if (S.breathWarn != null && S.t >= S.breathWarn + SIG.breath.warn) { const v = breathHeal(S); S.breathWarn = null; S.breathNext = S.t + breathEvery(S); push(S, { k: 'sig', t: S.t, what: 'breathHeal', v }); }
  }
  if (S.bossT >= EV) bossAttack(S);
  return S;
}
function bossAttack(S: State) {
  const kind = S.nextAtk ?? kindOf(S), A = ATK[kind], aoe = S.aoeNext;
  S.bossT = 0; S.bossN++; S.frozen = 0; if (S.forceAtk) S.forceAtk = null; else if (S.rage) S.rageN = (S.rageN ?? 0) + 1;
  const M = modOf(S), marked = new Set<number>(), nm = atkName(S.boss, kind);
  if (S.boss.sig === 'eqMoment') S.eqUntil = S.t + (M?.eqSec ?? SIG.eq.sec); // 13 등호의 순간 = 보스가 공격한 바로 뒤
  if (M?.after?.on === kind) { S.forceAtk = M.after.then; S.pickLow = !!M.after.low; S.bossT = Math.max(0, bossEveryOf(S) - (ATK[M.after.then].warn ?? T.telegraph)); } // 👹 8 거울빛 → 어둠 · 11 물결 → 혀 = 바로 이어 씀
  if (A.special === 'reverse') S.big = null; // 17 되돌리기 = 한 번 쓰면 다시 모음
  const n = S.heroes.length, [one, all] = BOSS_HIT[S.diff][Math.max(1, Math.min(4, n)) - 1]!;
  const base = (aoe ? all : one) * A.mul * (T.bossAtkByNo[S.boss.no] ?? 1) * (T.bossHitByNo[S.boss.no]?.[Math.max(1, Math.min(4, n)) - 1] ?? 1) * (S.rage ? RAGE.mul[S.diff] : 1), to = (S.target || []).filter((id) => !S.heroes[id]!.down), dmg: number[] = [];
  if (S.guard) { S.guard = false; for (const h of S.heroes) h.mark = 0; push(S, { k: 'guard', t: S.t, atk: nm }); S.target = null; S.aoeNext = false; S.nextAtk = null; S.tilt = ''; return; } // 🛡 오라 방패 = 이번 공격 통째로 막음
  const B = S.blocked; S.blocked = null;
  // 🛡 반응 막기 (📜 요청 #35): 특수 = 딜러가 끊음(안 나감) · 단일 = 탱커가 대신 맞음(절반 · 상태이상 없음) · 광역 = 서포터 결계(×0.7 · 상태이상 없음)
  if (B?.how === 'cut') { for (const h of S.heroes) h.mark = 0; S.target = null; S.aoeNext = false; S.nextAtk = null; S.tilt = ''; return; }
  if (A.special === 'breath') { const v = breathHeal(S); push(S, { k: 'sig', t: S.t, what: 'breathHeal', v }); push(S, { k: 'boss', t: S.t, atk: nm, kind, aoe: false, to: [], dmg: [] }); S.target = null; S.aoeNext = false; S.nextAtk = null; S.tilt = ''; return; } // 6 · 7 차례 안 숨 고르기
  if (A.special === 'mirror') { S.mirrorUntil = S.t + SIG.mirror.sec; push(S, { k: 'sig', t: S.t, what: 'mirrorOn' }); }
  const tank = B?.how === 'cover' ? S.heroes[B.by] : null, hits = tank && !tank.down ? [tank.id, ...to.slice(1).filter((x) => x !== tank.id)] : to; // 엄호 = 첫 표적 대신 (둘 = 둘째는 그대로)
  for (const [i, id] of (A.special === 'mirror' ? [] : hits).entries()) {
    const h = S.heroes[id]!, cut = (tank && id === tank.id ? 1 - T.role.tank.cover : h.cover ? 1 - h.cover : 1) * (B?.how === 'barrier' ? 1 - REACT_CFG.barrier : 1);
    const two = i > 0 && M?.two?.kinds.includes(kind) ? M.two.mul : 1, mk = A.special === 'hammer' ? (SIG.mark[Math.min(h.mark ?? 0, M?.markMax ?? 1)] ?? 1) : 1;
    const raw = A.special === 'reverse' ? (S.revV ?? 0) * cut : base * (1 - h.s.def) * cut * two * mk;
    const d = raw > 0 ? Math.min(Math.round(h.s.maxHp * T.oneHitCap), Math.max(1, Math.round(raw))) : 0; dmg.push(d); // 🛡 한 방 상한 60% (요청 #46)
    if (d > 0) { if (!tank) h.cover = 0; h.hp = Math.max(0, h.hp - d); if (h.stunKind === 'sleep') { h.stunUntil = 0; h.stunKind = ''; } } // 수면 = 맞으면 깸
    const noStatus = !!B; // 막으면 얼음 · 느려짐 · 묶임 없음
    if (A.status === 'slow' && !noStatus) { h.slowUntil = S.t + T.slow[S.diff]; h.slowKind = kind; }
    if (A.status === 'stun' && !noStatus) { h.stunUntil = S.t + (A.stunSec ?? T.stun[S.diff]); h.stunKind = kind === 'sleep' ? 'sleep' : 'bind'; }
    if (!noStatus && d > 0 && (A.mark || (A.special === 'hammer' && (M?.markMax ?? 1) >= 2 && (h.mark ?? 0) > 0 && (h.mark ?? 0) < (M?.markMax ?? 1)))) { h.mark = Math.min(M?.markMax ?? 1, (h.mark ?? 0) + 1); marked.add(id); } // 🔩 16 표식 (막으면 안 붙음 · 분노 = 두 겹)
    if (h.hp <= 0) { h.down = true; h.atb = 0; h.ch = 0; S.rec.downs++; push(S, { k: 'down', t: S.t, who: id }); }
    else if (h.hp < h.s.maxHp * T.role.healer.rescueAt) S.rec.lowSeen = true;
  }
  for (const h of S.heroes) if (!marked.has(h.id)) h.mark = 0; // 표식 = 다음 보스 공격 1번까지
  push(S, { k: 'boss', t: S.t, atk: nm, kind, aoe, to: A.special === 'mirror' ? [] : hits, dmg });
  if (aoe && base > 0) push(S, { k: 'sig', t: S.t, what: 'healNow' }); // 💚 광역 직후 = 힐러에게 「지금 힐!」
  S.target = null; S.aoeNext = false; S.nextAtk = null; S.tilt = '';
  checkEnd(S);
}
// ── 문제 ──
/** 문제로 얻은 것 (quiz.ts answer 의 earn) · ⚡ 충전 = 원문항을 통째로 끝냈을 때만(Y1 · 퍼펙트 2 · 재시도 1 · 최대 3) · 쓰러진 학생 = 친구 ATB +50% */
export function earn(S: State, who: number, e: { done: boolean; perfect: boolean; right: boolean; miss?: number }, giftTo?: number): void {
  const h = S.heroes[who]; if (!h || S.end) return;
  if (e.right) { h.log.right++; S.rec.subSec.push(+(S.t - (S.rec.lastAns[who] ?? 0)).toFixed(1)); S.rec.lastAns[who] = S.t; } // 소문항 하나 = 앞 정답부터 이 정답까지
  if (h.down) {
    if (!e.right) return;
    const to = giftTo != null && !S.heroes[giftTo]?.down ? giftTo : alive(S).slice().sort((a, b) => a.atb - b.atb)[0]?.id;
    if (to != null) { const f = S.heroes[to]!; f.atb = Math.min(1, f.atb + T.downedAtbGift); push(S, { k: 'gift', t: S.t, who, to }); }
    return;
  }
  // ⚡ 📜 요청 #41 = 소문항 맞힘마다 +1(첫 시도 · 고쳐 맞힘 같음) · 원문항을 오답 없이 끝냄 = +1 더 · 넘치면 장착 스킬 자동(넘칠 때마다 · 연달아면 0.6초 간격)
  // 📜 요청 #49 = 0.5 칸 단위 · 넘친 몫은 모아 두었다가 1 칸이 되면 자동 스킬
  const gain = (want: number, perfect: boolean) => { const n = Math.min(T.charge.max - h.ch, want), ov = want - n; h.ch += n; S.rec.charges += n; push(S, { k: 'charge', t: S.t, who, add: n, perfect, over: ov }); h.ovf = (h.ovf ?? 0) + ov; while (h.ovf >= 1 - 1e-9) { h.ovf -= 1; queueAuto(S, h); } };
  if (e.right && S.refrozen != null && (S.cells[S.refrozen]?.fam === S.heroes[who]?.s.fam || S.cells[S.refrozen]?.by === who) /* 📜 #95 같은 속성 · 전에 깬 사람 */ && !S.cells[S.refrozen]!.broken) { const c = S.cells[S.refrozen]!; c.broken = true; c.by = who; const idx = S.refrozen; S.refrozen = null; const last = S.cells.every((x) => x.broken); if (last) { S.weakUntil = S.t + T.weak[S.diff]; S.bossT = 0; S.target = null; S.nextAtk = null; S.aoeNext = false; S.tilt = ''; } push(S, { k: 'shield', t: S.t, who, cells: [idx], last }); checkEnd(S); } // 👹 4 다시 언 칸 = 소문항 하나로 깸
  if (e.right && S.boss.sig === 'chain' && h.stunKind === 'bind' && S.t < h.stunUntil) { const v = hitBoss(S, T.skillBase * h.s.skillMul * T.ratio.equip * SIG.chain); h.log.dmg += v; push(S, { k: 'sig', t: S.t, what: 'chain', who, v }); if (S.end) return; } // 14 x 를 넣으면 y = 묶인 채 맞히면 사슬로 피해
  if (e.right) gain(T.charge.byMiss[Math.min(e.miss ?? 0, T.charge.byMiss.length - 1)] ?? 0, false);
  if (e.done && e.perfect) gain(T.charge.perfect, true);
  runAuto(S); // 첫 넘침 = 바로 · 연달아 = 0.6초 뒤 (tick)
  if (e.done && S.shieldUp) h.tickets++;
  if (e.perfect) { h.atb = 1; h.log.perfect = (h.log.perfect ?? 0) + 1; if (S.rage && !calmed(S)) { S.ragePerf = (S.ragePerf ?? 0) + 1; if (S.ragePerf >= RAGE.calmPerfect) { S.ragePerf = 0; S.calmUntil = S.t + RAGE.calmSec; S.target = null; S.nextAtk = null; S.aoeNext = false; S.bossT = 0; push(S, { k: 'rage', t: S.t, on: 'calm' }); } else push(S, { k: 'rage', t: S.t, on: 'perf', n: S.ragePerf }); } }
}

// ── 행동 (ATB 가득) ──
const stateMul = (S: State) => 1; // 실드 · 약점 배율은 hitBoss 가
/** ⚔ 일반 공격 · auto = 문제 푸는 동안 자동(치명 없음 · 보통 ×1 · 📜 요청 #11) */
export function attack(S: State, who: number, timing: Timing, auto = false): boolean {
  const h = S.heroes[who]; if (!h || !ready(h, S)) return false;
  const raw = T.attackBase * h.s.atkMul * (timing === 'crit' ? h.s.crit : T.timing[timing]) * stateMul(S);
  S.rec.timing.n++; if (timing !== 'miss') S.rec.timing.ok++; if (timing === 'crit') S.rec.timing.crit++;
  const dmg = timing === 'miss' ? 0 : hitBoss(S, raw);
  spend(h); if (timing === 'crit') h.atb = T.critAtb; // 치명 = 다음 ATB 20% 채운 채
  h.log.dmg += dmg; push(S, { k: 'atk', t: S.t, who, dmg, timing, ...(auto ? { auto: true } : {}) });
  if (h.s.role === 'healer' && timing !== 'miss' && !S.end) { let v = 0; for (const f of alive(S)) { const a = Math.min(f.s.maxHp - f.hp, Math.round(f.s.maxHp * T.role.healer.atkHeal)); f.hp += a; v = Math.max(v, a); } if (v > 0) push(S, { k: 'heal', t: S.t, who, v, kind: 'atk' }); } // 💚 힐러 일반 공격 맞힘 = 팀 모두 5% (요청 #46 · 힐 횟수에 안 셈)
  if (dmg > 0 && S.t < S.mirrorUntil && !h.down) { const back = Math.max(1, Math.round(dmg * (modOf(S)?.mirrorBack ?? SIG.mirror.back))); h.hp = Math.max(0, h.hp - back); push(S, { k: 'sig', t: S.t, what: 'reflect', who, v: back }); if (h.hp <= 0) { h.down = true; h.atb = 0; h.ch = 0; S.rec.downs++; push(S, { k: 'down', t: S.t, who }); checkEnd(S); } } // 8 거울빛 = 일반 공격만 돌아옴
  return true;
}
/** 🛡 보호막 부수기 (Y2 · 모의실험4 「충전 1개로 자기 칸」): 내 칸이 남았으면 충전 1 · 친구 칸 = 90초 뒤 · 실드 뒤 원문항 2번 끝낸 사람 */
/** 📜 #95 그 칸을 깰 수 있는 용사가 팀에 없음(그 속성이 없거나 다 쓰러짐) = 도움표 칸 */
export const orphanCell = (S: State, c: Cell) => !c.broken && !S.heroes.some((x) => !x.down && x.s.fam === c.fam);
/** 🛡 실드 깨기 (📜 #95): 내 속성 칸이 남았으면 ⚡1 = 'own' · 팀에 없는 속성 칸이 남았고 도움표가 있으면 = 'help' (⚡ 안 씀) */
export const canBreak = (S: State, who: number) => { const h = S.heroes[who]; if (!h || h.down || !S.shieldUp) return null; if (h.ch >= T.cost.shield && S.cells.some((c) => !c.broken && c.fam === h.s.fam)) return 'own' as const; return h.tickets >= T.shieldHelpRuns && S.cells.some((c) => orphanCell(S, c)) ? ('help' as const) : null; };
export function breakShield(S: State, who: number): boolean {
  const h = S.heroes[who], how = canBreak(S, who); if (!h || !how || !ready(h, S)) return false;
  if (how === 'own') h.ch -= T.cost.shield; else { h.tickets -= T.shieldHelpRuns; S.rec.helpBrk = (S.rec.helpBrk ?? 0) + 1; } S.rec.skills.shield = (S.rec.skills.shield ?? 0) + 1;
  const cells: number[] = [], weakFam = S.boss.weak.includes(h.s.fam);
  const take = (c: Cell | undefined) => { if (!c) return; c.broken = true; c.by = who; cells.push(S.cells.indexOf(c)); S.lastBrk = S.cells.indexOf(c); if (S.refrozen === S.lastBrk) S.refrozen = null; };
  if (how === 'own') { take(S.cells.find((c) => !c.broken && c.fam === h.s.fam)); if (weakFam) take(S.cells.find((c) => orphanCell(S, c)) ?? S.cells.find((c) => !c.broken)); } // 📜 #95 같은 속성 칸 · 약점 계열 = + 아무 칸 하나(도움표 칸 먼저)
  else take(S.cells.find((c) => orphanCell(S, c)));
  h.log.shields += cells.length; if (how === 'own' && weakFam) h.log.brk = (h.log.brk ?? 0) + 1; spend(h); // 💥 속성 브레이크 셈 (요청 #51 공적)
  if (S.breathWarn != null) { S.breathWarn = null; S.breathNext = S.t + breathEvery(S); push(S, { k: 'sig', t: S.t, what: 'breathCut', who }); } // 숨 고르기 예고 중 실드 깨면 끊김
  const last = S.cells.every((c) => c.broken);
  if (last) { S.weakUntil = S.t + T.weak[S.diff] + (S.exposeNext ?? 0); S.exposeNext = 0; S.bossT = 0; S.target = null; S.nextAtk = null; S.aoeNext = false; S.tilt = ''; } // 예고 중이던 공격(화염 숨 등) 취소 // 마지막 실드 = 약점 시간 · 예고 취소
  push(S, { k: 'shield', t: S.t, who, cells, last });
  checkEnd(S);
  return true;
}
/** 💠 지금 보이는 스킬 (Y3 부채꼴 · 쓸 수 있을 때만 보임) + 쓸 수 있나(충전 · ATB) */
export function skillList(S: State, who: number): { k: SkillK; cost: number; ok: boolean }[] {
  const h = S.heroes[who]; if (!h) return [];
  const r = ready(h, S), C = T.cost, out: { k: SkillK; cost: number; ok: boolean }[] = [];
  const add = (k: SkillK, show: boolean, ok: boolean) => { const c = costOf(h, k, S); if (show) out.push({ k, cost: c, ok: r && h.ch >= c && ok }); };
  // 📜 요청 #19 스킬 줄이기: ⚡ 내 스킬(장착 · 실드가 뜨면 내 실드 칸도 깸) · 역할 · 🌟 비장(각성이면 각성 · 아니고 +10 이면 홀리 방패) · 💖 부활(그때만)
  add('equip', true, true);
  const hurt = alive(S).some((x) => x.hp < x.s.maxHp);
  add('role', true, h.s.role !== 'healer' || hurt);
  add('heal', h.s.role !== 'healer', hurt); // 🩹 응급 힐 (요청 #46)
  if (h.s.awk) add('awk', !h.awkUsed, true); else add('aura', h.s.aura && !h.auraUsed, true);
  add('revive', S.heroes.some((x) => x.down && x.id !== who), true);
  const rl = out.find((x) => x.k === 'role'); if (rl && !rl.ok && canReact(S, who)) rl.ok = true; // 🛡 예고 중 반응 막기 = ATB 없이 (요청 #35)
  return out;
}
export const canSkill = (S: State, who: number, k: SkillK) => (k === 'shield' ? !!canBreak(S, who) && ready(S.heroes[who]!, S) : !!skillList(S, who).find((x) => x.k === k)?.ok);
/** 🌈 장착 · 각성 스킬 = 속성 덧효과 붙은 보스 피해 (📜 요청 #36′ 속성 8가지) */
function famHit(S: State, h: Hero, raw: number): number {
  const F = fxOfAttr(h.s.attr), shielded = S.shieldUp && S.cells.some((c) => !c.broken) && !weak(S);
  const dmg = hitBoss(S, raw, F === 'pierce' ? attrFx.pierce : 1);
  noteBig(S, h, dmg);
  if (S.end) return dmg;
  const delay = (sec: number) => { const room = attrFx.delayMax - (S.frozen ?? 0), d = Math.max(0, Math.min(sec, room)); if (d > 0) { S.frozen = (S.frozen ?? 0) + d; S.bossT -= d; } return d; };
  if (F === 'pierce') { if (shielded) push(S, { k: 'fam', t: S.t, who: h.id, fx: F }); }
  else if (F === 'burn') { const per = Math.max(1, Math.round((dmg * attrFx.burn.pct) / attrFx.burn.sec)); S.burn = { until: S.t + attrFx.burn.sec, per, next: S.t + 1, who: h.id }; push(S, { k: 'fam', t: S.t, who: h.id, fx: F, v: per * attrFx.burn.sec }); }
  else if (F === 'shock' || F === 'freeze') push(S, { k: 'fam', t: S.t, who: h.id, fx: F, v: delay(F === 'shock' ? attrFx.shock : attrFx.freeze) });
  else if (F === 'gust') push(S, { k: 'fam', t: S.t, who: h.id, fx: F }); // ATB +30% = 행동(ATB 씀) 뒤에 (gustAfter)
  else if (F === 'expose') { if (weak(S)) S.weakUntil += attrFx.expose; else S.exposeNext = (S.exposeNext ?? 0) + attrFx.expose; push(S, { k: 'fam', t: S.t, who: h.id, fx: F, v: attrFx.expose }); }
  else if (F === 'bless') { const f = alive(S).slice().sort((a, b) => a.hp / a.s.maxHp - b.hp / b.s.maxHp)[0]; if (f) { f.hp = Math.min(f.s.maxHp, f.hp + attrFx.bless); push(S, { k: 'fam', t: S.t, who: h.id, fx: F, v: attrFx.bless, to: f.id }); } }
  else if (F === 'curse') { S.curseUntil = S.t + attrFx.curse.sec; push(S, { k: 'fam', t: S.t, who: h.id, fx: F }); }
  return dmg;
}
/** 17 되돌리기 = 방금 가장 크게 맞은 스킬 피해 (되돌리기를 쓰면 다시 모음) */
function noteBig(S: State, h: Hero, v: number) { if (S.boss.sig === 'inverse' && v > (S.big?.v ?? 0)) S.big = { who: h.id, v }; }
/** 🌪 순풍 = 스킬로 ATB 를 쓴 뒤 +30% */
const gustAfter = (h: Hero) => { if (fxOfAttr(h.s.attr) === 'gust') h.atb = Math.min(1, h.atb + attrFx.gust); };
/** 💠 스킬 쓰기 (고르면 바로 발동 · Y3) · to = 역할(엄호 · 격려) · 부활 대상 */
export function useSkill(S: State, who: number, k: SkillK, to?: number): boolean {
  const h = S.heroes[who]; if (!h) return false;
  if ((k === 'shield' || k === 'equip') && canBreak(S, who)) return breakShield(S, who); // ⚡ 내 스킬 = 실드가 떠 있으면 실드 칸 깸 (📜 #95 도움표 = ⚡ 없이도)
  if (k === 'shield' || !canSkill(S, who, k)) return false;
  if (k === 'role') return canReact(S, who) ? react(S, who, to) : roleAct(S, who, to);
  if (k === 'revive') { const f = to != null && S.heroes[to]?.down ? to : S.heroes.find((x) => x.down && x.id !== who)?.id; return f != null && revive(S, who, f); }
  if (k === 'heal') { const tg = healTarget(S, to); if (!tg) return false; const v = Math.min(tg.s.maxHp - tg.hp, Math.round(tg.s.maxHp * T.firstAid)); tg.hp += v; h.ch -= T.cost.heal; h.log.heals++; S.rec.skills.heal = (S.rec.skills.heal ?? 0) + 1; spend(h); push(S, { k: 'heal', t: S.t, who, to: tg.id, v, kind: 'aid' }); return true; }
  S.rec.skills[k] = (S.rec.skills[k] ?? 0) + 1;
  if (k === 'aura') { h.ch -= T.cost.aura; h.auraUsed = true; S.guard = true; S.stoneUntil = Math.max(S.stoneUntil, S.t + T.aura.stone); spend(h); push(S, { k: 'aura', t: S.t, who, stone: T.aura.stone }); return true; }
  const ratio = T.ratio[k] * (k === 'equip' ? healMul(h) : 1), cost = costOf(h, k);
  const dmg = famHit(S, h, T.skillBase * h.s.skillMul * ratio);
  h.ch -= cost; spend(h); gustAfter(h); h.log.dmg += dmg; if (k === 'awk') h.log.ult++;
  if (k === 'awk') { // 각성 덧효과 (판당 1번 · 역할마다)
    h.awkUsed = true; const R = h.s.role;
    if (R === 'dealer' && weak(S)) S.weakUntil += T.awk.dealerWeak;
    if (R === 'tank') for (const f of alive(S)) f.cover = Math.max(f.cover, T.awk.tankCut);
    if (R === 'support') for (const f of alive(S)) f.atb = Math.min(1, f.atb + T.awk.supportAtb);
  }
  push(S, { k: 'skill', t: S.t, who, dmg, kind: k, cost });
  return true;
}
/** ⚡ 넘친 충전으로 장착 스킬 자동 발동 (요청 #13) · ATB · 충전 칸은 그대로 · 피해 = 손으로 쓴 장착 스킬과 같음 */
/** ⚡ 넘침 자동 스킬 줄 (0.6초 간격 · tick 이 꺼냄) */
/** 넣은 배열을 다시 읽어 씀 (화면 상태 감싸개는 넣는 순간 다른 배열이 됨 · ??= 의 돌려준 값은 감싸기 전 배열) */
function queueAuto(S: State, h: Hero) { if (!S.autoQ) S.autoQ = []; const q = S.autoQ, last = q.length ? q[q.length - 1]!.at : (S.autoLast ?? -9); q.push({ who: h.id, at: Math.max(S.t, last + T.charge.autoGap) }); }
function runAuto(S: State) { const q = S.autoQ; if (!q?.length) return; while (q.length && q[0]!.at <= S.t + 1e-6 && !S.end) { const x = q.shift()!, h = S.heroes[x.who]; S.autoLast = S.t; if (h && !h.down) overflowSkill(S, h); } }
function overflowSkill(S: State, h: Hero) {
  S.rec.skills.equip = (S.rec.skills.equip ?? 0) + 1; S.rec.overflow = (S.rec.overflow ?? 0) + 1;
  const dmg = famHit(S, h, T.skillBase * h.s.skillMul * T.ratio.equip * healMul(h)); h.log.dmg += dmg; gustAfter(h);
  push(S, { k: 'skill', t: S.t, who: h.id, dmg, kind: 'equip', cost: 0, auto: true });
}
/** [역할] = 충전 1 · 딜러 강타(장착 ×1.5) · 탱커 엄호(친구 다음 공격 −50%) · 힐러 광역 회복(+12) · 서포터 격려(친구 ATB 가득) */
/** 💚 힐러 = 공격 스킬 ⚡2 · ×1.6 (요청 #46) */
export const costOf = (h: Hero, k: SkillK, S?: State): number => (k === 'revive' ? Math.min(T.charge.max, (h.s.role === 'healer' ? T.revive2.healer : T.revive2.base) + T.revive2.step * (S?.rec.revives ?? 0)) /* 📜 #92 2 → 3 → 4 (힐러 1 → 2 → 3) */ : k === 'equip' && h.s.role === 'healer' ? T.role.healer.skillCost : T.cost[k]);
const healMul = (h: Hero) => (h.s.role === 'healer' ? T.role.healer.skillMul : 1);
/** 힐 대상 = 고른 사람(살아 있으면 · 나 포함) · 아니면 체력 비율이 가장 낮은 사람 */
export function healTarget(S: State, to?: number): Hero | undefined { const f = to != null ? S.heroes[to] : undefined; if (f && !f.down) return f; return alive(S).slice().sort((a, b) => a.hp / a.s.maxHp - b.hp / b.s.maxHp)[0]; }
export function canRole(S: State, who: number): boolean { const h = S.heroes[who]; return !!h && ready(h, S) && h.ch >= T.cost.role && (h.s.role !== 'healer' || alive(S).some((x) => x.hp < x.s.maxHp)); }
export function roleAct(S: State, who: number, to?: number): boolean {
  const h = S.heroes[who]; if (!h || !canRole(S, who)) return false;
  const R = h.s.role; h.ch -= T.cost.role; S.rec.skills.role = (S.rec.skills.role ?? 0) + 1;
  if (R === 'dealer') { const dmg = hitBoss(S, T.skillBase * h.s.skillMul * T.ratio.equip * T.role.dealer.smash); noteBig(S, h, dmg); h.log.dmg += dmg; spend(h); push(S, { k: 'role', t: S.t, who, role: R, dmg }); return true; }
  const f = to != null ? S.heroes[to] : undefined;
  if (R === 'tank') { const tg = f && !f.down ? f : S.heroes[S.target?.[0] ?? who]!; tg.cover = T.role.tank.cover; h.log.covers++; spend(h); push(S, { k: 'role', t: S.t, who, role: R, to: tg.id }); return true; }
  if (R === 'healer') { const tg = healTarget(S, to)!, before = tg.hp / tg.s.maxHp, v = Math.min(tg.s.maxHp - tg.hp, Math.round(tg.s.maxHp * (T.role.healer.big + (h.s.awk ? T.awk.healerBig : 0)))); tg.hp += v; h.log.heals++; const rescue = tg.id !== who && before < T.role.healer.rescueAt; if (rescue) h.log.rescues = (h.log.rescues ?? 0) + 1; spend(h); push(S, { k: 'role', t: S.t, who, role: R, to: tg.id, v, ...(rescue ? { rescue } : {}) }); return true; } // 💚 큰 힐 (요청 #46)
  const tg = f && !f.down && f.id !== who ? f : alive(S).filter((x) => x.id !== who).sort((a, b) => a.atb - b.atb)[0];
  if (!tg) { h.ch += T.cost.role; return false; }
  tg.atb = 1; if (tg.stunUntil > S.t) { tg.stunUntil = 0; tg.stunKind = ''; push(S, { k: 'sig', t: S.t, what: 'unbind', who: tg.id }); } // 9 속박된 친구 = 격려로 바로 풀림
  h.log.boosts++; spend(h); push(S, { k: 'role', t: S.t, who, role: R, to: tg.id }); return true;
}
/** 🎯 역할 임무 (📜 요청 #50 · 판마다 · 보여 주기만 · 💎 없음): 탱커 막기 2 · 딜러 끊기 1 · 서포터 결계 1 · 힐러 구조 1 · 그 판에 기회(그 종류 예고 · 30% 아래 친구)가 없으면 chance = false */
export const MISSION: Record<Role, { need: number; txt: string; ic: string }> = { tank: { need: 2, txt: '막기', ic: '🛡' }, dealer: { need: 1, txt: '끊기', ic: '⚔' }, support: { need: 1, txt: '결계', ic: '🎵' }, healer: { need: 1, txt: '구조', ic: '💚' } };
export function missionOf(S: State, who: number): { need: number; got: number; done: boolean; chance: boolean; txt: string; ic: string } {
  const h = S.heroes[who]!, M = MISSION[h.s.role], got = h.s.role === 'healer' ? (h.log.rescues ?? 0) : (h.log.blocks ?? 0), tl = S.rec.tele;
  const chance = h.s.role === 'healer' ? !!S.rec.lowSeen : (tl?.[h.s.role === 'tank' ? 'single' : h.s.role === 'support' ? 'aoe' : 'special'] ?? 0) > 0;
  return { need: M.need, got: Math.min(got, M.need), done: got >= M.need, chance: chance || got > 0, txt: M.txt, ic: M.ic };
}
// ── 🛡 반응 막기 (📜 요청 #35) ──
/** 지금 예고된 공격의 종류 (예고 없으면 null) · 숨 고르기 예고 = 특수 */
export function telegraphOf(S: State): { cls: AtkClass; atk: string } | null {
  if (S.target && S.nextAtk) return { cls: atkClass(S.nextAtk, S.aoeNext), atk: atkName(S.boss, S.nextAtk) };
  if (S.breathWarn != null) return { cls: 'special', atk: '숨 고르기' };
  return null;
}
/** 예고 중 그 역할이면 ATB 없이 ⚡1 로 바로 · 쓰러짐 · 묶임 · 이미 누가 막았으면 못 씀 */
export function canReact(S: State, who: number): boolean {
  const h = S.heroes[who], tg = telegraphOf(S); if (!h || !tg || S.end || h.down || S.t < h.stunUntil || h.ch < T.cost.role) return false;
  if (S.blocked) return false;
  return REACT[tg.cls] === h.s.role;
}
export function react(S: State, who: number, to?: number): boolean {
  if (!canReact(S, who)) return false;
  const h = S.heroes[who]!, tg = telegraphOf(S)!; h.ch -= T.cost.role; h.log.blocks = (h.log.blocks ?? 0) + 1; S.rec.skills.react = (S.rec.skills.react ?? 0) + 1;
  if (tg.cls === 'single') { S.blocked = { by: who, how: 'cover' }; h.log.covers++; push(S, { k: 'react', t: S.t, who, how: 'cover', cls: tg.cls, atk: tg.atk, to: S.target?.[0] }); return true; }
  if (tg.cls === 'aoe') {
    S.blocked = { by: who, how: 'barrier' };
    const f = to != null ? S.heroes[to] : undefined, tg2 = f && !f.down && f.id !== who ? f : alive(S).filter((x) => x.id !== who).sort((a, b) => a.atb - b.atb)[0];
    if (tg2) { tg2.atb = 1; if (tg2.stunUntil > S.t) { tg2.stunUntil = 0; tg2.stunKind = ''; } h.log.boosts++; }
    push(S, { k: 'react', t: S.t, who, how: 'barrier', cls: tg.cls, atk: tg.atk, to: tg2?.id }); return true;
  }
  // 특수 = 딜러 강타로 끊음 (강타 피해 그대로) · 숨 고르기 = 그 회복 끊김
  const dmg = hitBoss(S, T.skillBase * h.s.skillMul * T.ratio.equip * T.role.dealer.smash); h.log.dmg += dmg;
  if (S.breathWarn != null && !S.target) { S.breathWarn = null; S.breathNext = S.t + breathEvery(S); push(S, { k: 'sig', t: S.t, what: 'breathCut' }); }
  else {
    S.blocked = { by: who, how: 'cut' }; const K = S.nextAtk ? ATK[S.nextAtk] : null;
    if (K?.special === 'contra' && !S.end) { const v = hitBoss(S, S.bossMax * (modOf(S)?.cutPct ?? SIG.contra), 1, true); h.log.dmg += v; push(S, { k: 'sig', t: S.t, what: 'contra', who, v }); } // 12 「모순!」 = 보스가 제 불에 데임
    if (K?.special === 'reverse' && (S.revV ?? 0) > 0 && !S.end) { const v = hitBoss(S, S.revV!, 1, true); h.log.dmg += v; S.big = null; push(S, { k: 'sig', t: S.t, what: 'reverseBack', who, v }); } // 17 거꾸로 = 보스가 그 몫을 맞음
  }
  h.log.cuts = (h.log.cuts ?? 0) + 1; push(S, { k: 'react', t: S.t, who, how: 'cut', cls: tg.cls, atk: tg.atk, dmg }); checkEnd(S); return true;
}
/** 부활 = 충전 1 · 팀 부활 3번 · HP 30% (Y4 그대로) */
export function revive(S: State, who: number, to: number): boolean {
  const h = S.heroes[who], f = S.heroes[to], c = h ? costOf(h, 'revive', S) : 99; if (!h || !f || !f.down || !ready(h, S) || h.ch < c) return false;
  h.ch -= c; f.down = false; f.hp = Math.max(1, Math.round(f.s.maxHp * T.reviveHp)); f.atb = 0; S.rec.revives++; h.log.revives++; if (h.s.role === 'healer') h.log.rescues = (h.log.rescues ?? 0) + 1; /* 📜 #92 힐러 부활 = 구조 임무로 셈 */ spend(h);
  push(S, { k: 'revive', t: S.t, who, to }); checkEnd(S); return true;
}

// ── 판정 도우미 (화면 · 봇 같이) ──
/** ⏳ 타이밍 칸 한 판 (성공 [a, b] · 치명 [c, d] · 바늘 ms) · rnd = 0 ~ 1 (화면 = Math.random · 시험 = 고정) */
export interface Zone { ok: [number, number]; crit: [number, number]; ms: number }
export function timingZone(rnd: () => number): Zone {
  const Z = T.timingZone, lerp = (r: [number, number], x: number) => r[0] + (r[1] - r[0]) * x;
  const w = lerp(Z.okW, rnd()), a = Z.edge + (1 - 2 * Z.edge - w) * rnd(), cw = Math.min(w, lerp(Z.critW, rnd())), c = a + (w - cw) * rnd();
  return { ok: [a, a + w], crit: [c, c + cw], ms: Math.round(lerp(Z.ms, rnd())) };
}
export const timingOf = (p: number, z: Zone): Timing => (p >= z.crit[0] && p <= z.crit[1] ? 'crit' : p >= z.ok[0] && p <= z.ok[1] ? 'ok' : 'miss');

/** 📊 판 기록 한 줄 (균형 도구 · 📜 11/20): 판 길이 · 소문항당 시간 · 타이밍 · 충전 · 스킬 쓴 수 · 쓰러짐 + 반 · 차시 · 인원 · 역할 조합 */
export function runRecord(S: State, ctx: { cls?: string; no: number; practice?: boolean }) {
  const med = (a: number[]) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]!; };
  const r = S.rec, pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  return {
    v: 1, at: Date.now(), cls: ctx.cls ?? '', no: ctx.no, practice: !!ctx.practice, diff: S.diff, n: S.heroes.length,
    roles: S.heroes.map((h) => h.s.role).sort().join('+'), heroes: S.heroes.map((h) => h.s.hero),
    win: !!S.end?.win, why: S.end?.why ?? '', sec: Math.round(S.t), bossLeft: S.bossHp,
    subs: r.subSec.length, subSecMed: med(r.subSec), timingOk: pct(r.timing.ok, r.timing.n), timingCrit: pct(r.timing.crit, r.timing.n), charges: r.charges, skills: { ...r.skills },
    downs: r.downs, revives: r.revives, shields: S.heroes.map((h) => h.log.shields),
  };
}

// ── 🔎 스킬 미리 보기 (📜 요청 #19 덧3 「무슨 효과인지 · 어느 정도 공격인지 미리」) ──
//   숫자 = 지금 이 용사(강화 · 장착 등급 = skillMul) · 약점 시간 · 실드 피해 줄임을 그대로 넣은 어림값 · 화면은 「약」을 붙임
export interface Peek { line: string; gold: boolean; name: string; desc: string; cost: number; per: string; why: string }
const estHit = (S: State, raw: number) => Math.max(1, Math.round(raw * (weak(S) ? T.weakDmg : S.shieldUp && S.cells.some((c) => !c.broken) ? (S.boss.shieldDmg ?? T.shieldDmg) : 1)));
export function skillPeek(S: State, who: number, k: SkillK): Peek {
  const h = S.heroes[who]!, R = h.s.role, wk = weak(S), cost = k === 'equip' && canBreak(S, who) ? T.cost.shield : costOf(h, k, S);
  const base = T.skillBase * h.s.skillMul, wTxt = wk ? ` · 약점 ×${T.weakDmg}` : '';
  let line = '', name = '', desc = '', per = '제한 없음', gold = false;
  if (k === 'equip' || k === 'shield') {
    name = '⚡ 내 스킬';
    if (canBreak(S, who)) { const two = S.boss.weak.includes(h.s.fam); line = `🛡 실드 깸${two ? ' 2칸' : ''}`; desc = `실드가 떠 있으면 내 칸을 깨요${two ? ' · 약점 계열이라 친구 칸 하나 더' : ''}`; }
    else { line = `💥 약 ${estHit(S, base * T.ratio.equip * healMul(h))}${wTxt}`; gold = wk; desc = '보스에게 장착 스킬 피해 · 충전이 넘치면 저절로 나감'; }
  } else if (k === 'role') {
    name = `${ROLE_SKILL[R]}`;
    if (R === 'dealer') { line = `💥 강타 약 ${estHit(S, base * T.ratio.equip * T.role.dealer.smash)}${wTxt}`; gold = wk; desc = `장착 스킬 ×${T.role.dealer.smash} 피해`; }
    else if (R === 'tank') { line = `🛡 엄호 −${Math.round(T.role.tank.cover * 100)}%`; desc = `고른 친구가 다음에 받는 피해 −${Math.round(T.role.tank.cover * 100)}%`; }
    else if (R === 'healer') { const big = Math.round((T.role.healer.big + (h.s.awk ? T.awk.healerBig : 0)) * 100); line = `💚 큰 힐 ${big}%`; desc = `가장 다친 친구(꾹 = 고르기) 최대 체력 ${big}% 회복 · 30% 아래 친구 = 💚 구조!`; }
    else { line = '✨ 격려 ATB 가득'; desc = '고른 친구 ATB 바로 가득 · 묶인 친구는 풀림'; }
  } else if (k === 'heal') { name = '🩹 응급 힐'; line = `🩹 1/3 회복`; desc = '고른 한 명(나 포함) 최대 체력 1/3 회복 · 쓰러진 친구는 안 됨'; }
  else if (k === 'aura') { name = '🌟 홀리 방패'; line = `🛡 다음 공격 막음 · 🗿 ${T.aura.stone}초`; desc = `팀 전체 다음 보스 공격 막음 + 보스 ${T.aura.stone}초 석화`; per = '판당 1번'; }
  else if (k === 'awk') {
    name = '🌟 각성'; line = `💥 약 ${estHit(S, base * T.ratio.awk)} · 1번`; gold = wk;
    desc = `큰 피해 + ${R === 'dealer' ? `약점 시간 +${T.awk.dealerWeak}초` : R === 'tank' ? `팀 받는 피해 −${Math.round(T.awk.tankCut * 100)}%` : R === 'healer' ? `큰 힐 +${Math.round(T.awk.healerBig * 100)}%p` : `팀 ATB +${Math.round(T.awk.supportAtb * 100)}%`}`; per = '판당 1번';
  } else if (k === 'revive') { name = '💖 부활'; line = `💖 부활 HP ${Math.round(T.reviveHp * 100)}%`; desc = `쓰러진 친구를 체력 ${Math.round(T.reviveHp * 100)}%로 살림`; per = `이번 판 ${S.rec.revives}번 살림 · 다음 ⚡${costOf(h, 'revive', S) + T.revive2.step}`; }
  else if (k === 'tier4') { name = '4레벨'; line = `💥 약 ${estHit(S, base * T.ratio.tier4)}`; }
  if ((k === 'equip' && !canBreak(S, who)) || k === 'awk') { const X = ATTR_FX_TXT[fxOfAttr(h.s.attr)]; desc += ` · ${X.emo} ${X.name}: ${X.desc}`; } // 📜 요청 #36′
  const why = S.end ? '판 끝' : h.down ? '쓰러짐' : S.t < h.stunUntil ? '묶임 · 기절' : (k === 'aura' && h.auraUsed) || (k === 'awk' && h.awkUsed) ? '이번 판에 이미 씀' : (k === 'role' && R === 'healer') || k === 'heal' ? (alive(S).some((x) => x.hp < x.s.maxHp) ? '' : '다친 친구 없음') || (h.ch < cost ? `⚡ ${cost} 필요 (지금 ${h.ch})` : h.atb < 1 ? 'ATB 차는 중' : '') : k === 'revive' && S.revives <= 0 ? '팀 부활 다 씀' : h.ch < cost ? `⚡ ${cost} 필요 (지금 ${h.ch})` : h.atb < 1 ? 'ATB 차는 중' : '';
  return { line, gold, name, desc, cost, per, why };
}
