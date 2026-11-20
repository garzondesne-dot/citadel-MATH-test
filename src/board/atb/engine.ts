// ⚔ 게시판 던전 ATB — 전투 엔진 (순수 · 같은 씨앗 = 같은 판) · 📜 docs/board-atb/design/정리.md 3절 · 결정 S · U · V
//   한 곳(진행 폰 · 연습방 = 이 폰)만 tick · 행동을 적용 · 화면은 state 를 그리기만 · 시각 = 초(서버 시각에서 뺀 게임 시각)
//   ⏳ 작전 시간(수호자) · 강적 출현 연출 · 재접속 = 학생 판에서 붙임
import { BOSS_HIT, BOSS_HP, ATK, T, type BossCfg, type Diff, type Fam, type Role } from './tune';
import type { Stats } from './heroes';

export type Zap = 'n' | 'g'; // 보통 · 금색(첫 시도 정답)
export type Timing = 'miss' | 'ok' | 'crit';
export type Hold = 'miss' | 'ok' | 'best';
export interface Hero { id: number; s: Stats; hp: number; atb: number; zaps: Zap[]; down: boolean; slowUntil: number; stunUntil: number; cover: number; tickets: number; awkUsed: boolean; healRest: boolean; atbBonus: number;
  /** 기록 (결과창) */ log: { shields: number; dmg: number; covers: number; heals: number; revives: number; boosts: number; right: number; ult: number } }
export interface Cell { owner: number; fam: Fam; broken: boolean; by?: number }
export type Ev =
  | { k: 'atk'; t: number; who: number; dmg: number; timing: Timing }
  | { k: 'skill'; t: number; who: number; dmg: number; zaps: number; gold: number; hold: Hold; ult: boolean; awk: boolean }
  | { k: 'shield'; t: number; who: number; cells: number[]; last: boolean }
  | { k: 'shieldUp'; t: number }
  | { k: 'role'; t: number; who: number; role: Role; to?: number; dmg?: number }
  | { k: 'revive'; t: number; who: number; to: number }
  | { k: 'boss'; t: number; atk: string; aoe: boolean; to: number[]; dmg: number[] }
  | { k: 'down'; t: number; who: number }
  | { k: 'gift'; t: number; who: number; to: number }
  | { k: 'end'; t: number; win: boolean; why: string };
export interface State {
  t: number; diff: Diff; boss: BossCfg; seed: number; rnd: number;
  bossHp: number; bossMax: number; bossT: number; bossN: number; target: number[] | null; aoeNext: boolean;
  shieldUp: boolean; shieldAt: number; cells: Cell[]; weakUntil: number;
  heroes: Hero[]; revives: number; ev: Ev[]; end: null | { win: boolean; why: string; t: number };
}
// ── 난수 (mulberry32) ──
const rand = (S: State) => { let a = (S.rnd += 0x6d2b79f5); a = Math.imul(a ^ (a >>> 15), a | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; };
export const alive = (S: State) => S.heroes.filter((h) => !h.down);
export const weak = (S: State) => S.t < S.weakUntil;

export function newBattle(o: { boss: BossCfg; diff: Diff; party: Stats[]; seed?: number }): State {
  const n = Math.max(1, Math.min(4, o.party.length)), max = BOSS_HP[o.diff][n - 1]!;
  return {
    t: 0, diff: o.diff, boss: o.boss, seed: o.seed ?? 1, rnd: o.seed ?? 1,
    bossHp: max, bossMax: max, bossT: 0, bossN: 0, target: null, aoeNext: false,
    shieldUp: false, shieldAt: 0, cells: [], weakUntil: 0,
    heroes: o.party.map((s, id) => ({ id, s, hp: s.maxHp, atb: 0.35 + 0.1 * id, zaps: [], down: false, slowUntil: 0, stunUntil: 0, cover: 0, tickets: 0, awkUsed: false, healRest: false, atbBonus: 0, log: { shields: 0, dmg: 0, covers: 0, heals: 0, revives: 0, boosts: 0, right: 0, ult: 0 } })),
    revives: T.revives, ev: [], end: null,
  };
}
const push = (S: State, e: Ev) => { S.ev.push(e); if (S.ev.length > 200) S.ev.splice(0, S.ev.length - 200); };
/** 보스가 받는 피해 (실드 중 감소 · 약점 시간 2배 · 실드 · 쓰러진 친구가 있으면 HP 1 에서 멈춤) */
function hitBoss(S: State, raw: number): number {
  const mul = weak(S) ? T.weakDmg : S.shieldUp && S.cells.some((c) => !c.broken) ? (S.boss.shieldDmg ?? T.shieldDmg) : 1;
  const dmg = Math.max(1, Math.round(raw * mul)), floor = S.cells.some((c) => !c.broken) || S.heroes.some((h) => h.down) ? 1 : 0;
  const before = S.bossHp; S.bossHp = Math.max(floor, S.bossHp - dmg);
  if (!S.shieldUp && !S.cells.length && S.bossHp <= S.bossMax * T.shieldAt) { // 실드 펼침 · 각자 1칸 · 그 용사 계열
    S.shieldUp = true; S.shieldAt = S.t; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); push(S, { k: 'shieldUp', t: S.t });
  }
  checkEnd(S);
  return before - S.bossHp;
}
function checkEnd(S: State) {
  if (S.end) return;
  if (S.bossHp <= 0 && S.cells.every((c) => c.broken) && S.heroes.every((h) => !h.down)) { S.end = { win: true, why: '보스 쓰러뜨림', t: S.t }; push(S, { k: 'end', t: S.t, win: true, why: S.end.why }); return; }
  const downs = S.heroes.filter((h) => h.down).length;
  if (downs && (S.heroes.length === 1 || downs === S.heroes.length || S.revives <= 0)) { S.end = { win: false, why: S.heroes.length === 1 ? '쓰러짐' : downs === S.heroes.length ? '전멸' : '팀 부활을 다 씀', t: S.t }; push(S, { k: 'end', t: S.t, win: false, why: S.end.why }); }
}
const ready = (h: Hero, S: State) => !S.end && !h.down && h.atb >= 1 && S.t >= h.stunUntil;
const spend = (h: Hero) => { h.atb = Math.min(0.99, h.atbBonus); h.atbBonus = 0; };

// ── 시간 ──
export function tick(S: State, dt: number): State {
  if (S.end) return S;
  S.t = +(S.t + dt).toFixed(4);
  const W = weak(S);
  for (const h of S.heroes) {
    if (h.down || S.t < h.stunUntil) continue;
    const sp = (W ? T.weakAtb : 1) * (S.t < h.slowUntil ? T.slowX : 1);
    h.atb = Math.min(1, h.atb + (dt / h.s.atbSec) * sp);
  }
  if (W) return S; // 약점 시간 = 보스 공격 멈춤
  S.bossT += dt;
  const live = alive(S);
  if (!S.target && S.bossT >= T.bossEvery - T.telegraph && live.length) { // 2초 전 표적 예고
    const aoe = (S.bossN + 1) % T.aoeEvery === 0;
    S.aoeNext = aoe; S.target = aoe ? live.map((h) => h.id) : [live[Math.floor(rand(S) * live.length)]!.id];
  }
  if (S.bossT >= T.bossEvery) bossAttack(S);
  return S;
}
function bossAttack(S: State) {
  S.bossT = 0; S.bossN++;
  const aoe = S.aoeNext, pair = S.boss.atk.map((k) => ({ k, a: ATK[k] }));
  const pick = aoe ? pair.find((p) => p.a.aoe) ?? { k: 'basic' as const, a: { ...ATK.basic, aoe: true } } : pair.find((p) => !p.a.aoe) ?? pair[0]!;
  const n = S.heroes.length, [one, all] = n === 1 ? BOSS_HIT[S.diff].one : BOSS_HIT[S.diff].party;
  const base = (aoe ? all : one) * pick.a.mul, to = (S.target || []).filter((id) => !S.heroes[id]!.down), dmg: number[] = [];
  for (const id of to) {
    const h = S.heroes[id]!, cut = h.cover ? 1 - h.cover : 1; h.cover = 0;
    const d = Math.max(1, Math.round(base * (1 - h.s.def) * cut)); dmg.push(d);
    h.hp = Math.max(0, h.hp - d);
    if (pick.a.status === 'slow') h.slowUntil = S.t + T.slow[S.diff];
    if (pick.a.status === 'stun') h.stunUntil = S.t + T.stun[S.diff];
    if (h.hp <= 0) { h.down = true; h.atb = 0; h.zaps = []; push(S, { k: 'down', t: S.t, who: id }); }
  }
  push(S, { k: 'boss', t: S.t, atk: pick.a.name, aoe, to, dmg });
  S.target = null; S.aoeNext = false;
  checkEnd(S);
}

// ── 문제 ──
/** 문제로 얻은 것 (quiz.ts answer 의 earn) · 쓰러진 학생 = 친구 ATB +50% */
export function earn(S: State, who: number, e: { zap: number; gold: boolean; done: boolean; perfect: boolean; right: boolean }, giftTo?: number): void {
  const h = S.heroes[who]; if (!h || S.end) return;
  if (e.right) h.log.right++;
  if (h.down) {
    if (!e.right) return;
    const to = giftTo != null && !S.heroes[giftTo]?.down ? giftTo : alive(S).slice().sort((a, b) => a.atb - b.atb)[0]?.id;
    if (to != null) { const f = S.heroes[to]!; f.atb = Math.min(1, f.atb + T.downedAtbGift); push(S, { k: 'gift', t: S.t, who, to }); }
    return;
  }
  for (let i = 0; i < e.zap && h.zaps.length < T.zapMax; i++) h.zaps.push(e.gold ? 'g' : 'n');
  if (e.done && S.shieldUp) h.tickets++;
  if (e.perfect) h.atb = 1;
}

// ── 행동 (ATB 가득) ──
const stateMul = (S: State) => 1; // 실드 · 약점 배율은 hitBoss 가
export function attack(S: State, who: number, timing: Timing): boolean {
  const h = S.heroes[who]; if (!h || !ready(h, S)) return false;
  const raw = T.attackBase * h.s.atkMul * (timing === 'crit' ? h.s.crit : T.timing[timing]) * stateMul(S);
  const dmg = timing === 'miss' ? 0 : hitBoss(S, raw);
  spend(h); if (timing === 'crit') h.atb = T.critAtb; // 치명 = 다음 ATB 20% 채운 채
  h.log.dmg += dmg; h.healRest = false; push(S, { k: 'atk', t: S.t, who, dmg, timing });
  return true;
}
/** 내 실드 칸이 남아 있고 완주 표가 있으면 [스킬] = 실드 깨기 */
export const canBreak = (S: State, who: number) => { const h = S.heroes[who]; if (!h || !S.shieldUp) return null; const mine = S.cells.find((c) => c.owner === who && !c.broken); if (mine && h.tickets >= 1) return 'own' as const; const others = S.cells.some((c) => !c.broken && c.owner !== who); return others && h.tickets >= T.shieldHelpRuns && S.t - S.shieldAt >= T.shieldHelpAfter ? ('help' as const) : null; };
export function breakShield(S: State, who: number): boolean {
  const h = S.heroes[who], how = canBreak(S, who); if (!h || !how || !ready(h, S)) return false;
  const cells: number[] = [], weakFam = S.boss.weak.includes(h.s.fam);
  const take = (c: Cell | undefined) => { if (!c) return; c.broken = true; c.by = who; cells.push(S.cells.indexOf(c)); };
  if (how === 'own') { h.tickets--; take(S.cells.find((c) => c.owner === who && !c.broken)); if (weakFam) take(S.cells.find((c) => !c.broken)); } // 약점 계열 = 자기 칸 + 친구 칸 하나
  else { h.tickets -= T.shieldHelpRuns; take(S.cells.find((c) => !c.broken && c.owner !== who)); }
  h.log.shields += cells.length; spend(h); h.healRest = false;
  const last = S.cells.every((c) => c.broken);
  if (last) { S.weakUntil = S.t + T.weak[S.diff] + (0); S.bossT = 0; S.target = null; } // 마지막 실드 = 약점 시간 · 예고 취소
  push(S, { k: 'shield', t: S.t, who, cells, last });
  checkEnd(S);
  return true;
}
/** ⚡ n 개 피해 배율 (금색 = 1.5배 값) */
export const zapPower = (zs: Zap[]) => { const n = zs.length; if (!n) return 0; const g = zs.filter((z) => z === 'g').length; return (T.zapMul[n] ?? 6) * (1 + ((T.goldZap - 1) * g) / n); };
export function skill(S: State, who: number, hold: Hold): boolean {
  const h = S.heroes[who]; if (!h || !ready(h, S) || !h.zaps.length) return false;
  if (canBreak(S, who)) return breakShield(S, who);
  const zs = h.zaps, n = zs.length, gold = zs.filter((z) => z === 'g').length, ult = n >= T.zapMax, awk = ult && h.s.awk && !h.awkUsed;
  let pw = zapPower(zs); if (awk) pw *= T.awkMul / T.ultMul;
  const dmg = hitBoss(S, T.skillBase * h.s.skillMul * pw * T.hold[hold]);
  h.zaps = []; spend(h); h.healRest = false; h.log.dmg += dmg; if (ult) h.log.ult++;
  if (awk) { // 각성 필살기 덧효과 (판당 1번)
    h.awkUsed = true; const R = h.s.role;
    if (R === 'dealer' && weak(S)) S.weakUntil += T.awk.dealerWeak;
    if (R === 'tank') for (const f of alive(S)) f.cover = Math.max(f.cover, T.awk.tankCut);
    if (R === 'healer') for (const f of alive(S)) f.hp = Math.min(f.s.maxHp, f.hp + T.awk.healerHeal);
    if (R === 'support') for (const f of alive(S)) f.atb = Math.min(1, f.atb + T.awk.supportAtb);
  }
  push(S, { k: 'skill', t: S.t, who, dmg, zaps: n, gold, hold, ult, awk });
  return true;
}
/** [역할] = ⚡1 · 딜러 강타(스킬 ×1.5 · 실드엔 안 통함) · 탱커 엄호(친구 다음 공격 −50%) · 힐러 광역 회복(+25 · 연달아 못 씀) · 서포터 격려(친구 ATB 가득) */
export function canRole(S: State, who: number): boolean { const h = S.heroes[who]; return !!h && ready(h, S) && h.zaps.length >= 1 && !(h.s.role === 'healer' && h.healRest); }
export function roleAct(S: State, who: number, to?: number): boolean {
  const h = S.heroes[who]; if (!h || !canRole(S, who)) return false;
  const R = h.s.role; h.zaps.shift();
  if (R === 'dealer') { const dmg = hitBoss(S, T.skillBase * h.s.skillMul * T.zapMul[1]! * T.role.dealer.smash); h.log.dmg += dmg; spend(h); push(S, { k: 'role', t: S.t, who, role: R, dmg }); return true; }
  const f = to != null ? S.heroes[to] : undefined;
  if (R === 'tank') { const tg = f && !f.down ? f : S.heroes[S.target?.[0] ?? who]!; tg.cover = T.role.tank.cover; h.log.covers++; spend(h); push(S, { k: 'role', t: S.t, who, role: R, to: tg.id }); return true; }
  if (R === 'healer') { for (const x of alive(S)) x.hp = Math.min(x.s.maxHp, x.hp + T.role.healer.heal); h.log.heals++; spend(h); h.healRest = true; push(S, { k: 'role', t: S.t, who, role: R }); return true; }
  const tg = f && !f.down && f.id !== who ? f : alive(S).filter((x) => x.id !== who).sort((a, b) => a.atb - b.atb)[0];
  if (!tg) { h.zaps.unshift('n'); return false; }
  tg.atb = 1; h.log.boosts++; spend(h); push(S, { k: 'role', t: S.t, who, role: R, to: tg.id }); return true;
}
/** 부활 = ⚡1 · 팀 부활 3번 한도 */
export function revive(S: State, who: number, to: number): boolean {
  const h = S.heroes[who], f = S.heroes[to]; if (!h || !f || !f.down || !ready(h, S) || h.zaps.length < T.reviveCost || S.revives <= 0) return false;
  h.zaps.splice(0, T.reviveCost); f.down = false; f.hp = Math.max(1, Math.round(f.s.maxHp * T.reviveHp)); f.atb = 0; S.revives--; h.log.revives++; spend(h);
  push(S, { k: 'revive', t: S.t, who, to }); checkEnd(S); return true;
}

// ── 판정 도우미 (화면 · 봇 같이) ──
export const timingOf = (p: number): Timing => (p >= T.timingCrit[0] && p <= T.timingCrit[1] ? 'crit' : p >= T.timingOk[0] && p <= T.timingOk[1] ? 'ok' : 'miss');
export const bestZone = (gold: number): [number, number] => { const w = T.holdBestPerGold * gold; return [Math.max(0, T.holdBest[0] - w / 2), Math.min(1, T.holdBest[1] + w / 2)]; };
export const holdOf = (p: number, gold: number): Hold => { const [a, b] = bestZone(gold); return p >= a && p <= b ? 'best' : p >= T.holdOk[0] && p <= T.holdOk[1] ? 'ok' : 'miss'; };
