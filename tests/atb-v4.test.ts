// 📋 게시판 보스 설정표 v4 (📜 요청 #57 · docs/board-atb/BOSS-TABLE-v4.md) — 12 ~ 17차시 새 보스 · 차시별 분노 · 차례 고침 · 약점 고르게
import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/model/hero';
import { attack, debugWin, earn, newBattle, orderNext, rageCycleOf, react, tick, useSkill, type State } from '../src/board/atb/engine';
import { statsOf } from '../src/board/atb/heroes';
import { ATK, ATK_SPECIAL, BOSSES, SIG, atkClass, type Diff, type Fam } from '../src/board/atb/tune';

const party = (names: string[]) => names.map((n) => statsOf({ hero: HEROES.find((h) => h.name === n)!.id, lv: 1, enh: 1, tier: 1, name: n }));
const FOUR = ['로안', '발도르', '루멘', '누아'];
const at = (no: number, diff: Diff = 'normal', names = FOUR, seed = 1) => newBattle({ boss: BOSSES[no]!, diff, party: party(names), seed });
const run = (S: State, sec: number) => { for (let k = 0; k < Math.round(sec * 10); k++) tick(S, 0.1); };
const bossEvs = (S: State) => S.ev.filter((e) => e.k === 'boss') as { atk: string; kind: string; aoe: boolean; to: number[]; dmg: number[] }[];
const tough = (S: State) => { for (const h of S.heroes) { h.s = { ...h.s, maxHp: 9999 }; h.hp = 9999; } };
/** 분노에 바로 넣음 (실드 다 깬 채) */
const enrage = (S: State) => { S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true })); S.rage = true; S.ragePerf = 0; S.rageN = 0; S.bossT = 0; };
/** 지금 차례 공격이 예고될 때까지 */
const toTele = (S: State) => { for (let k = 0; k < 200 && !S.target; k++) tick(S, 0.1); };
/** 보스 공격이 n 번 나올 때까지 */
const until = (S: State, n: number) => { for (let k = 0; k < 2000 && bossEvs(S).length < n; k++) tick(S, 0.1); };
const dealerOf = (S: State) => S.heroes.find((h) => h.s.role === 'dealer')!;

describe('v4 보스 표 (📜 #57)', () => {
  it('2 ~ 17 보스 = 차례에 🎯 단일 · 💥 광역 · 🌀 특수가 모두 · 분노 특수 = 특수', () => {
    for (let no = 2; no <= 17; no++) {
      const B = BOSSES[no]!; expect(B, String(no)).toBeTruthy();
      const cls = new Set(B.cycle.map((k) => (ATK[k].special === 'scale' ? ['single', 'aoe'] : ATK[k].aoe && ATK_SPECIAL.has(k) ? ['aoe', 'special'] : [atkClass(k, !!ATK[k].aoe)])).flat()); // 5 화염 숨 = 광역 특수
      expect([...cls].sort(), String(no)).toEqual(['aoe', 'single', 'special']);
      expect(ATK_SPECIAL.has(B.rageSpecial!), String(no)).toBe(true);
      expect(B.cycle.some((k) => ATK[k].mul > 0), String(no)).toBe(true);
    }
  });
  it('약점 = 5계열이 6 ~ 7번씩', () => {
    const n: Record<string, number> = {}; for (let no = 2; no <= 17; no++) for (const f of BOSSES[no]!.weak) n[f] = (n[f] ?? 0) + 1;
    expect(Object.keys(n).sort()).toEqual(['arms', 'flame', 'mystic', 'nature', 'wisdom'] as Fam[]);
    for (const v of Object.values(n)) expect(v >= 6 && v <= 7).toBe(true);
  });
  it('보스마다 공격 이름 (12 촛농 튀기기 · 13 뿔 받기 · 14 사슬 휩쓸기)', () => {
    const S = at(13); tough(S); run(S, 12.1); expect(bossEvs(S)[0]!.atk).toBe('뿔 받기');
    const S2 = at(12); tough(S2); run(S2, 12.1); expect(bossEvs(S2)[0]!.atk).toBe('촛농 튀기기');
  });
});

describe('v4 새 공격 · 대표 행동', () => {
  it('12 거짓 가정 = 전원 느려짐 · 피해 0 / 딜러가 끊으면 보스 최대 HP 3% (분노 6%)', () => {
    const S = at(12); tough(S); until(S, 2); toTele(S); expect(S.nextAtk).toBe('falseHyp');
    const d = dealerOf(S); d.ch = 3; const hp0 = S.bossHp; expect(react(S, d.id)).toBe(true);
    const c = S.ev.find((e) => e.k === 'sig' && e.what === 'contra') as { v: number } | undefined; expect(c?.v).toBe(Math.round(S.bossMax * SIG.contra)); expect(hp0 - S.bossHp).toBeGreaterThan(c!.v);
    const S2 = at(12); tough(S2); until(S2, 3); const b = bossEvs(S2)[2]!; expect(b.kind).toBe('falseHyp'); expect(b.dmg.every((x) => x === 0)).toBe(true); expect(S2.heroes.every((h) => h.slowUntil > S2.t)).toBe(true);
    const S3 = at(12); tough(S3); enrage(S3); S3.forceAtk = 'falseHyp'; toTele(S3); const d3 = dealerOf(S3); d3.ch = 3; react(S3, d3.id);
    expect((S3.ev.find((e) => e.k === 'sig' && e.what === 'contra') as { v: number }).v).toBe(Math.round(S3.bossMax * 0.06));
  });
  it('13 등호의 순간 = 보스 공격 뒤 3초 받는 피해 ×1.3', () => {
    const S = at(13); tough(S); const h = S.heroes[0]!;
    h.atb = 1; attack(S, 0, 'ok'); const d0 = (S.ev.at(-1) as { dmg: number }).dmg;
    run(S, 12.1); h.atb = 1; attack(S, 0, 'ok'); const d1 = (S.ev.filter((e) => e.k === 'atk').at(-1) as { dmg: number }).dmg;
    expect(d1).toBe(Math.round(d0 * SIG.eq.mul));
    run(S, 3.1); h.atb = 1; attack(S, 0, 'ok'); expect((S.ev.filter((e) => e.k === 'atk').at(-1) as { dmg: number }).dmg).toBe(d0);
  });
  it('14 x 를 넣으면 y = 속박된 채 소문항을 맞히면 사슬로 보스 피해', () => {
    const S = at(14); tough(S); const h = S.heroes[1]!; h.stunUntil = S.t + 2; h.stunKind = 'bind'; const hp0 = S.bossHp;
    earn(S, 1, { done: false, perfect: false, right: true });
    const c = S.ev.find((e) => e.k === 'sig' && e.what === 'chain') as { v: number } | undefined; expect(c?.v).toBeGreaterThan(0); expect(hp0 - S.bossHp).toBe(c!.v);
    const S2 = at(14); earn(S2, 1, { done: false, perfect: false, right: true }); expect(S2.ev.some((e) => e.k === 'sig' && e.what === 'chain')).toBe(false);
  });
  it('15 하나씩 차례로 = 단일 표적이 자리 순서 · 쓰러진 용사 건너뜀 · 분노 = 거꾸로', () => {
    const S = at(15); tough(S); expect(orderNext(S)).toBe(0); S.heroes[1]!.down = true;
    until(S, 6); const sg = bossEvs(S).filter((e) => !e.aoe).map((e) => e.to[0]); expect(sg).toEqual([0, 2, 3]); // 강타 0 · 화염 · 강타 2 · 능선 불길 · 강타 3 · 화염
    const R = at(15); tough(R); enrage(R); R.ordI = 0; expect(orderNext(R)).toBe(3);
  });
  it('16 증기 뿜기 표식 → 망치가 그 용사를 ×1.6 · 엄호로 막으면 표식 없음', () => {
    const S = at(16); tough(S); run(S, 12.1); const f = bossEvs(S)[0]!; expect(f.kind).toBe('steam'); const v = f.to[0]!; expect(S.heroes[v]!.mark).toBe(1);
    toTele(S); expect(S.target).toEqual([v]); run(S, 4.1); const g = bossEvs(S)[1]!; expect(g.kind).toBe('hammer'); expect(S.heroes[v]!.mark ?? 0).toBe(0);
    const S2 = at(16); tough(S2); toTele(S2); const tk = S2.heroes.find((h) => h.s.role === 'tank')!; tk.ch = 3; react(S2, tk.id); run(S2, 4.1); expect(S2.heroes.every((h) => !h.mark)).toBe(true);
  });
  it('17 되돌리기 = 가장 큰 스킬 피해 30% 를 그 용사에게 · 끊으면 보스가 맞음 (분노 50%)', () => {
    const S = at(17); tough(S); const h = S.heroes[0]!; h.ch = 3; h.atb = 1; useSkill(S, 0, 'equip'); const big = S.big!.v; expect(S.big!.who).toBe(0);
    until(S, 2); toTele(S); expect(S.nextAtk).toBe('reverse'); expect(S.target).toEqual([0]); expect(S.revV).toBeGreaterThan(0); expect(S.revV).toBeLessThanOrEqual(Math.round(big * SIG.reverse)); // 상한 = 보스 기본 단일 ×2
    const hp0 = h.hp; run(S, 4.2); const last = bossEvs(S).at(-1)!; expect(last.kind).toBe('reverse'); expect(last.dmg[0]).toBeGreaterThan(0); expect(hp0 - h.hp).toBe(last.dmg[0]);
    const C = at(17); tough(C); C.heroes[0]!.ch = 3; C.heroes[0]!.atb = 1; useSkill(C, 0, 'equip'); enrage(C); C.forceAtk = 'reverse'; toTele(C); expect(C.revV).toBeLessThanOrEqual(Math.round(C.big!.v * 0.5));
    const d = dealerOf(C); d.ch = 3; const want = C.revV!; react(C, d.id); expect((C.ev.find((e) => e.k === 'sig' && e.what === 'reverseBack') as { v: number }).v).toBe(want);
  });
  it('6 · 7 차례 안 숨 고르기 = 다 모으면 보스 HP 8% 회복 · 끊으면 없음', () => {
    const S = at(6); tough(S); S.bossHp = S.bossMax - 500; const hp0 = S.bossHp; until(S, 3); expect(bossEvs(S)[2]!.kind).toBe('breathAtk'); expect(S.bossHp - hp0).toBe(Math.round(S.bossMax * SIG.breath.heal));
    const C = at(6); tough(C); C.bossHp = C.bossMax - 500; until(C, 2); toTele(C); const d = dealerOf(C); d.ch = 3; react(C, d.id); const h1 = C.bossHp; run(C, 4.2); expect(C.bossHp).toBe(h1);
  });
  it('11 삼키기 = 한 명 3초 행동 불능 + 피해 / 2 포효 도약 = 단일 ×2', () => {
    const S = at(11); tough(S); until(S, 3); const b = bossEvs(S)[2]!; expect(b.kind).toBe('swallow'); const h = S.heroes[b.to[0]!]!; expect(h.stunUntil - S.t).toBeGreaterThan(2.8); expect(b.dmg[0]).toBeGreaterThan(0);
    const P = at(2); tough(P); until(P, 2); const [s1, p1] = bossEvs(P) as { dmg: number[]; to: number[] }[]; expect(p1!.dmg[0]! / (s1!.dmg[0]! / 1.5)).toBeGreaterThan(1.6);
  });
});

describe('v4 차시별 분노 (일반 · 도전만)', () => {
  it('분노 차례 = 바꿈 · 통째 · 특수 하나 붙음 / 연습 = 공통 분노만', () => {
    const S5 = at(5); enrage(S5); expect(rageCycleOf(S5)).toEqual(['fire', 'smash', 'fire', 'fire']);
    const E5 = at(5, 'easy'); enrage(E5); expect(rageCycleOf(E5)).toEqual(['sleep', 'smash', 'fire', 'fire']);
    const S13 = at(13); enrage(S13); expect(rageCycleOf(S13)).toEqual(['mace', 'meteor', 'sleep', 'sleep']);
    const S16 = at(16); enrage(S16); expect(rageCycleOf(S16)).toEqual(['steam', 'hammer', 'hammer', 'aoe', 'bind']);
  });
  it('2 표적 둘 (둘째 ×0.7) · 엄호는 첫 표적만', () => {
    const S = at(2); tough(S); enrage(S); S.rageN = 0; toTele(S); expect(S.nextAtk).toBe('smash'); expect(S.target!.length).toBe(2);
    const [a, b] = S.target!; run(S, 4.2); const e = bossEvs(S).at(-1)!; expect(e.to).toEqual([a, b]);
    const r = (e.dmg[1]! / (1 - S.heroes[b!]!.s.def)) / (e.dmg[0]! / (1 - S.heroes[a!]!.s.def)); expect(r).toBeGreaterThan(0.6); expect(r).toBeLessThan(0.8);
    const E = at(2, 'easy'); tough(E); enrage(E); toTele(E); expect(E.target!.length).toBe(1);
  });
  it('9 · 14 속박 2명', () => {
    for (const no of [9, 14]) { const S = at(no); tough(S); enrage(S); S.forceAtk = 'bind'; toTele(S); expect(S.target!.length, String(no)).toBe(2); run(S, 4.2); expect(S.heroes.filter((h) => h.stunUntil > S.t).length).toBe(2); }
  });
  it('3 속임 고개 = 마지막 2초에 표적을 바꿈', () => {
    const S = at(3); tough(S); enrage(S); S.rageN = 0; toTele(S); const a = S.target![0]; expect(S.nextAtk).toBe('smash'); run(S, 2.2); expect(S.target![0]).not.toBe(a);
    expect(S.ev.some((e) => e.k === 'sig' && e.what === 'retarget')).toBe(true);
  });
  it('4 얼음 갑옷 다시 = 마지막으로 깬 칸이 다시 얼고 · 그 사람이 소문항 하나 맞히면 깸', () => {
    const S = at(4); tough(S); S.bossHp = Math.round(S.bossMax * 0.69); S.heroes[0]!.atb = 1; attack(S, 0, 'ok'); expect(S.shieldUp).toBe(true);
    for (const h of S.heroes) { h.ch = 3; h.atb = 1; useSkill(S, h.id, 'equip'); } expect(S.cells.every((c) => c.broken)).toBe(true);
    const last = S.lastBrk!, owner = S.cells[last]!.owner; S.weakUntil = 0; S.bossHp = Math.floor(S.bossMax * 0.3) + 2; S.heroes[1]!.atb = 1; attack(S, 1, 'crit');
    expect(S.rage).toBe(true); expect(S.cells[last]!.broken).toBe(false); expect(S.refrozen).toBe(last);
    earn(S, owner, { done: false, perfect: false, right: true }); expect(S.cells[last]!.broken).toBe(true); expect(S.refrozen).toBeNull();
  });
  it('6 · 7 가쁜 숨 = 20초마다 · 8 이중 거울 = 거울빛 뒤 바로 어둠 · 되돌림 40%', () => {
    const S = at(8); tough(S); enrage(S); S.forceAtk = 'mirror'; toTele(S); run(S, 4.2); expect(S.forceAtk).toBe('darkHit'); toTele(S); expect(S.nextAtk).toBe('darkHit');
    const h = S.heroes[0]!; h.atb = 1; attack(S, 0, 'ok'); const a = S.ev.filter((e) => e.k === 'atk').at(-1) as { dmg: number }, r = S.ev.find((e) => e.k === 'sig' && e.what === 'reflect') as { v: number };
    expect(r.v).toBe(Math.max(1, Math.round(a.dmg * 0.4)));
  });
  it('11 물결 뒤 혀 = 느려진 용사 중 HP 가장 낮은 한 명', () => {
    const S = at(11); tough(S); enrage(S); S.heroes[2]!.hp = 100; S.forceAtk = 'fog'; toTele(S); run(S, 4.2); expect(S.forceAtk).toBe('tongue'); toTele(S); expect(S.target).toEqual([2]);
  });
  it('봇 판 = 12 ~ 17 다 끝남 (연습 · 일반 · 도전)', async () => {
    const { newBot, simulate } = await import('../src/board/atb/bots');
    const { PACKS } = await import('../src/engine/packs');
    const L = PACKS.find((p) => p.no === 10 && !p.partOf)!;
    for (let no = 12; no <= 17; no++) for (const diff of ['easy', 'normal', 'hard'] as Diff[]) { const S = at(no, diff, FOUR, no); simulate({ ...L, no }, S, S.heroes.map((_, i) => newBot(L, i, 'normal', no))); expect(S.end, `${no} ${diff}`).not.toBeNull(); }
  });
});

describe('v4 스토리 문구 (📜 #64 · STORY-LINES-v1)', () => {
  it('2 ~ 17 = 의뢰문 · 보스 대사 3줄(10 ~ 25자) · 보스 이름 = 설정표 이름', async () => {
    const { SUBJ } = await import('../src/engine/subject');
    const { bossLine } = await import('../src/board/atb/story');
    for (let no = 2; no <= 17; no++) {
      const q = SUBJ.quests?.[no]; expect(q, String(no)).toBeTruthy(); expect(q!.boss, String(no)).toBe(BOSSES[no]!.name); expect(q!.line.length).toBeGreaterThan(20);
      for (const k of ['enter', 'rage', 'down'] as const) { const t = bossLine(no, k)!; expect(t, `${no} ${k}`).toBeTruthy(); expect(t.length >= 10 && t.length <= 25, `${no} ${k} ${t}`).toBe(true); }
    }
    expect(bossLine(7, 'enter')).toContain('다시'); expect(bossLine(18, 'enter')).toBeNull();
  });
});

describe('🚨 #84 보스 HP 1 에서 버티다 패배 (선생님 베타 판)', () => {
  it('쓰러진 친구가 있어도 보스 HP 0 = 바로 승리 · 그 뒤 패배 없음', () => {
    const S = at(8); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true }));
    S.heroes[1]!.down = true; S.heroes[1]!.hp = 0; S.bossHp = 3; const h = S.heroes[0]!; h.atb = 1;
    attack(S, 0, 'crit'); expect(S.bossHp).toBe(0); expect(S.end?.win).toBe(true); expect(S.end?.why).toBe('보스 쓰러뜨림');
    for (const x of S.heroes) { x.down = true; x.hp = 0; } run(S, 30); expect(S.end?.win).toBe(true);
  });
  it('실드 칸이 남아 있으면 HP 1 에서 멈춤 (그대로)', () => {
    const S = at(8); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); S.bossHp = 3; S.heroes[0]!.atb = 1;
    attack(S, 0, 'crit'); expect(S.bossHp).toBe(1); expect(S.end).toBeNull();
  });
});

describe('🧪 debugWin · 한 방 실드 틈', () => {
  it('debugWin = 실드 전이어도 바로 승리', () => {
    const S = at(2); expect(S.cells.length).toBe(0);
    debugWin(S); expect(S.end?.win).toBe(true);
  });
});
