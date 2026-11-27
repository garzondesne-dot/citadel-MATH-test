// 🌀 마왕성 차원문 짓기 (📜 11/28) — 🧱 뼈대 · 조각 · ⚡ 에너지 · 통과 보상 한 번 · 연습 = 기록 없음 · ⚡ +1 = 에너지 화면 + 맞힘만
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { AREA, E_BASE, REGIONS, RUNES, addEnergy, addPractice, doorName, doorShare, energyGain, energyOf, frameOf, gateTally, isGatePack, kstDay, markOpened, gateOpened, passWrites, payPass, pickRoom, pieceOrder, publishTally, runesOn, tallyOf, PASS_GEM, PASS_XP } from '../src/school/gate';
import { abcStep, submitAbc, type AbcRec } from '../src/school/abcSheet';
import { PACKS, packOf } from '../src/engine/packs';
import { nextStep, openRoom } from '../src/raid/actions';
import { PROFILES } from '../src/model/profiles';

const mk = (t = 1000): Store => ({ ...memoryStore(), kind: 'memory' as const, now: () => t }) as Store;
const roster = (S: Store, cls: string, n: number) => S.set(`roster/${cls}`, Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, `학생${i + 1}`])));

describe('🧱 뼈대', () => {
  it('기준 = 명단의 80% 올림 · 기준에 닿으면 남은 조각은 현자', () => {
    expect(frameOf(19, 0)).toMatchObject({ total: 19, target: 16, placed: 0, sage: 0, full: false });
    expect(frameOf(19, 15)).toMatchObject({ target: 16, placed: 15, sage: 0, full: false });
    expect(frameOf(19, 16)).toMatchObject({ target: 16, placed: 16, sage: 3, full: true });
    expect(frameOf(18, 15)).toMatchObject({ target: 15, placed: 15, sage: 3, full: true });
    expect(frameOf(17, 14)).toMatchObject({ target: 14, sage: 3, full: true });
    expect(frameOf(19, 19)).toMatchObject({ placed: 19, sage: 0, full: true });
    expect(frameOf(0, 0)).toMatchObject({ target: 0, full: false });
    // 📜 11/28 「넘어갈 때 현자가 채움」 = ⚡ 단계로 넘어가면 목표 전이어도 남은 조각을 현자가
    expect(frameOf(18, 5, true)).toMatchObject({ target: 15, placed: 5, sage: 13, full: true });
    expect(frameOf(0, 0, true)).toMatchObject({ full: false });
  });
  it('반 합 = 명단 중 통과 수 · 에너지 합 · 시험 계정 빠짐', () => {
    const S = mk(); roster(S, '1-2', 18);
    S.set('bonus/1-2/1/abc', { pass: { at: 1, by: 'A' } });
    S.set('bonus/1-2/2/abc', { pass: { at: 1, by: 'R' } });
    S.set('bonus/1-2/3/abc', { A: { nums: [1, 2, 3, 4, 5, 6, 7], g: '1111112', wrong: [7], at: 1 } });
    S.set('bonus/1-2/4/gate', { e: 5 }); S.set('bonus/1-2/5/gate', { e: 7 });
    S.set('bonus/1-2/99/gate', { e: 100 }); // 명단 밖 = 안 셈
    S.set('tester/1-2/5', true); // 시험 계정 = 안 셈
    expect(gateTally(S, '1-2')).toEqual({ n: 17, pass: 2, e: 5 });
    expect(publishTally(S, '1-2')).toEqual({ n: 17, pass: 2, e: 5, s: 0 });
    expect(tallyOf(S, '1-2')).toMatchObject({ n: 17, pass: 2, e: 5, at: 1000, s: 0 });
    // ⚡ 단계로 넘어감 = 현자 채움 표시 · 한 번 켜지면 그대로
    expect(publishTally(S, '1-2', true)).toMatchObject({ s: 1 });
    expect(publishTally(S, '1-2')).toMatchObject({ s: 1 });
    expect(tallyOf(S, '1-2').s).toBe(1);
  });
});

describe('🧩 조각', () => {
  for (const n of [17, 18, 19]) it(`명단 ${n}명 = 조각 ${n}개 · 아래(받침)부터 · 쐐기 − × 마지막 · 덩어리 모두 덮음`, () => {
    const P = pieceOrder(n);
    expect(P).toHaveLength(n);
    expect(P[0]!.rs).toEqual(['bL']);
    expect(P[n - 1]!.rs).toEqual(['t3']);
    expect(P[n - 2]!.rs.includes('t2') || P[n - 2]!.rs.includes('t3')).toBe(true);
    // 덩어리 순서 그대로 · 같은 덩어리 띠 = 0 … of−1 (아래부터)
    const flat = P.map((p) => p.rs[0]!);
    expect([...new Set(flat)]).toEqual([...REGIONS]);
    for (const r of REGIONS) { const ks = P.filter((p) => p.rs[0] === r); expect(ks.map((p) => p.k)).toEqual(ks.map((_, i) => i)); expect(ks.every((p) => p.of === ks.length)).toBe(true); }
    // 큰 덩어리(받침)가 먼저 나뉨
    expect(P.filter((p) => p.rs[0] === 'bL').length).toBeGreaterThanOrEqual(P.filter((p) => p.rs[0] === 'p2L').length);
  });
  it('14개보다 적으면 이웃 덩어리를 묶음 · 0명 = 없음', () => {
    const P = pieceOrder(5);
    expect(P).toHaveLength(5);
    expect(P.flatMap((p) => p.rs)).toEqual([...REGIONS]);
    expect(pieceOrder(0)).toEqual([]);
    expect(Object.keys(AREA).sort()).toEqual([...REGIONS].sort());
  });
});

describe('⚡ 에너지', () => {
  it('단계: 0 · 107 · 108 · 144 · 180 · 216 · 300', () => {
    expect([0, 107, 108, 144, 180, 216, 300].map((e) => energyOf(e).stage)).toEqual([0, 0, 1, 2, 3, 4, 4]);
    expect(energyOf(107)).toMatchObject({ step10: 9, over: false });
    expect(energyOf(108)).toMatchObject({ pct: 1, step10: 10, name: '기준 달성' });
    expect(energyOf(300).name).toBe('각성 Ⅲ · 전설의 문');
    expect(doorName('1-5', 190)).toBe('1-5반 · 각성 Ⅱ의 문');
    expect(doorName('1-5', 50)).toBe('1-5반 · 마왕성 차원문');
    expect(doorShare(54)).toEqual({ a: 50, b: 50 });
    expect(doorShare(300)).toEqual({ a: 100, b: 0 });
  });
  it('룬 10개 = 10.8 마다 하나 · 108 = 모두 · 0 = 모두 꺼짐 (뼈대 완성만으로는 안 켜짐)', () => {
    expect(RUNES).toHaveLength(10);
    expect([0, 10, 11, 54, 107, 108, 500].map(runesOn)).toEqual([0, 0, 1, 5, 9, 10, 10]);
  });
  it('+1 = 에너지 화면에서 연 방 + 맞힘만', () => {
    expect(energyGain({ fromGate: true, correct: true })).toBe(1);
    expect(energyGain({ fromGate: true, correct: false })).toBe(0);
    expect(energyGain({ fromGate: false, correct: true })).toBe(0);
  });
  it('내 칸에 더함 · 그날 + · 반 합에 들어감', () => {
    const S = mk(Date.UTC(2026, 10, 30, 1)); roster(S, '1-3', 3);
    addEnergy(S, 'bonus/1-3/2', S.now()); addEnergy(S, 'bonus/1-3/2', S.now());
    expect(S.get('bonus/1-3/2/gate/e')).toBe(2);
    expect(S.get(`bonus/1-3/2/gate/d/${kstDay(S.now())}`)).toBe(2);
    expect(kstDay(S.now())).toBe('20261130');
    expect(gateTally(S, '1-3').e).toBe(2);
  });
  it('🎲 무작위 = 열린 방 중 처치 안 한 방 먼저', () => {
    const rs = [{ id: 'a', open: true, clear: true }, { id: 'b', open: false, clear: false }, { id: 'c', open: true, clear: false }];
    expect(pickRoom(rs, () => 0.99)?.id).toBe('c');
    expect(pickRoom(rs.map((r) => ({ ...r, clear: true })), () => 0)?.id).toBe('a');
    expect(pickRoom([{ open: false, clear: false }])).toBeNull();
  });
});

describe('💎 통과 보상 · 📄 연습', () => {
  it('처음 7/7 = 💎 20 + EXP 20 · 두 번째 = 0 (log gate_pass)', () => {
    const S = mk(); S.set('gem/1-4/7', { total: 100 }); S.set('xp/1-4/7', { total: 10 });
    expect(payPass(S, '1-4', 7, 5)).toEqual({ gem: PASS_GEM, xp: PASS_XP });
    expect(payPass(S, '1-4', 7, 6)).toEqual({ gem: 0, xp: 0 });
    expect(S.get('gem/1-4/7/total')).toBe(120); expect(S.get('xp/1-4/7/total')).toBe(30);
    expect(S.get('gem/1-4/7/log/gate_pass')).toMatchObject({ g: 20, at: 5 });
    expect(passWrites({ gate_pass: { g: 20 } }, null, 1)).toMatchObject({ gem: 0, xp: 20 });
  });
  it('연습 = 판 수만 · 답안지 기록 · 통과 · 반 뼈대 그대로', () => {
    const S = mk(); roster(S, '1-5', 2);
    const rec: AbcRec = { pass: { at: 1, by: 'A' } }; S.set('bonus/1-5/1/abc', rec);
    // 연습판 = 화면 안 기록(A 건너뛴 채 B) → 서버에 안 씀
    const local = submitAbc({ A: { nums: [], g: '', wrong: [], at: 0 } }, '2222222', [2, 2, 2, 2, 2, 2, 2], 9);
    expect(local.rec.pass?.by).toBe('B');
    addPractice(S, 'bonus/1-5/1');
    expect(S.get('bonus/1-5/1/abc')).toEqual(rec);
    expect(S.get('bonus/1-5/1/gate/p')).toBe(1);
    expect(abcStep(S.get<AbcRec>('bonus/1-5/1/abc')).kind).toBe('done');
    expect(gateTally(S, '1-5')).toEqual({ n: 2, pass: 1, e: 0 });
  });
});

describe('🌀 차시 팩 gate-1', () => {
  it('도입 단계 4개 · gate = sheet · energy · door · 몬스터 없음 · 학생 목록 숨김 · 진도 밖(no 0)', () => {
    const L = packOf('gate-1')!;
    expect(L).toBeTruthy(); expect(isGatePack(L)).toBe(true);
    expect(L.steps.map((s) => [s.kind, s.gate ?? ''])).toEqual([['intro', ''], ['intro', 'sheet'], ['intro', 'energy'], ['intro', 'door']]);
    expect(Object.keys(L.monsters)).toEqual([]); expect(L.hide).toBe(true); expect(L.no).toBe(0);
    expect(PACKS.filter((p) => isGatePack(p)).map((p) => p.id)).toEqual(['gate-1']);
  });
  it('수업 시작 = held(진도) 안 적음 · 연 반 표시는 한 번', () => {
    const S = mk(); const L = packOf('gate-1')!;
    openRoom(S, L, 'G1', PROFILES.class); S.set('rooms/G1/meta/cls', '1-2');
    nextStep(S, L, 'G1');
    expect(S.get('held/1-2')).toBeNull();
    markOpened(S, '1-2'); expect(gateOpened(S, '1-2')).toBe(true); expect(gateOpened(S, '1-3')).toBe(false);
    const t0 = S.get('school/gate/opened/1-2'); markOpened(S, '1-2'); expect(S.get('school/gate/opened/1-2')).toBe(t0);
  });
  it('E_BASE 108', () => expect(E_BASE).toBe(108));
});
