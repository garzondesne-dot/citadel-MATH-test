// 🌊 파도 레이드에서 가져온 것 (📜 2026-11-16 · DECISIONS 🌊 · 머리 🔨)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { giveStamp, stamped } from '../src/raid/actions';

const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });
describe('⑤ ✅ 도장 📜', () => {
  it('한 수업에 한 번 · 📜 +1 = gifts · 표시 = rooms/…/stamp · 다른 수업은 따로', () => {
    const S = store(); S.set('rooms/K1', { meta: {}, state: { step: 0 } });
    expect(giveStamp(S, 'K1', 's1_1_3')).toBe(true);
    expect(giveStamp(S, 'K1', 's1_1_3')).toBe(false);
    expect(stamped(S.get<Room>('rooms/K1'), 's1_1_3')).toBe(true);
    expect(stamped(S.get<Room>('rooms/K1'), 's1_1_4')).toBe(false);
    expect(S.get('gifts/s1_1_3/stamp_K1')).toMatchObject({ g: 0, s: 1, fun: '✅ 도장', code: 'K1' });
    expect(giveStamp(S, 'K2', 's1_1_3')).toBe(true);
    expect(Object.keys(S.get<Record<string, unknown>>('gifts/s1_1_3')!)).toEqual(['stamp_K1', 'stamp_K2']);
  });
});

import { preCount, preDmg, firstMonster, lastClosePath, armPre } from '../src/school/pre';
import { SUBJ } from '../src/engine/subject';
describe('③ ⚔ 선제 공격', () => {
  it('지난 수업 뒤 고친 칸만 · 학생 수 · 최대 10% · 첫 몬스터만', () => {
    const bon = { 1: { 'set-05': { m1: { fixAt: 50 }, m2: { fixAt: 200 } } }, 2: { 'set-04': { m3: { fixAt: 300 }, boss: { at: 400 } } }, 3: { 'set-05': { m1: { clear: true } } } };
    expect(preCount(bon as never, 100)).toEqual({ fixed: 2, who: 2 });
    expect(preCount([null, { a: { m: { fixAt: 9 } } }] as never, 0)).toEqual({ fixed: 1, who: 1 }); // 서버 배열 꼴
    const R = { meta: { pre: { mid: 'm1', fixed: 7, who: 3 } } } as unknown as Room;
    expect(preDmg(R, 'm1', 48)).toBe(4); expect(preDmg(R, 'm1', 200)).toBe(7); expect(preDmg(R, 'm2', 200)).toBe(0); expect(preDmg(R, 'm1', 9)).toBe(0);
  });
  it('수업 시작 = 기준 시각(마지막 수업 닫힘) 뒤 고친 칸으로 meta.pre · 기준 없음 = 없음 · 테스트 수업 = 따로 칸', async () => {
    const S = store(), L = SUBJ.lessons.find((l) => firstMonster(l))!;
    S.set('bonus/1-3', { 4: { [L.id]: { m1: { fixAt: 500 } } } });
    expect(await armPre(S, L, 'K9', '1-3', false)).toBeNull();
    S.set(lastClosePath('1-3'), 100);
    expect(await armPre(S, L, 'K9', '1-3', false)).toEqual({ mid: firstMonster(L), fixed: 1, who: 1 });
    expect(S.get('rooms/K9/meta/pre')).toMatchObject({ fixed: 1 });
    expect(await armPre(S, L, 'K8', '1-3', true)).toBeNull(); // 🧪 = lastClose~test
    expect(lastClosePath('1-3', true)).toBe('school/lastClose/1-3~test');
  });
});

import { IDLE_MS, idleOn, shouldNudge } from '../src/school/idle';
describe('① 🤝 손 놓은 학생', () => {
  it('공격 단계 · 다 못 맞힘 · 이 몬스터에서 처음 · 90초 → 띄움 / 아니면 안 띄움', () => {
    const base = { attack: true, done: false, asked: false, now: 100_000 + IDLE_MS, last: 100_000 };
    expect(shouldNudge(base)).toBe(true);
    expect(shouldNudge({ ...base, now: base.now - 1 })).toBe(false);
    expect(shouldNudge({ ...base, attack: false })).toBe(false);
    expect(shouldNudge({ ...base, done: true })).toBe(false);
    expect(shouldNudge({ ...base, asked: true })).toBe(false);
  });
  it('리모컨 노랑 = 그 몬스터의 idle 만', () => {
    const R = { players: { a: { idle: { mid: 'm1', at: 1 } }, b: {} } } as unknown as Room;
    expect(idleOn(R, 'a', 'm1')).toBe(true); expect(idleOn(R, 'a', 'm2')).toBe(false); expect(idleOn(R, 'b', 'm1')).toBe(false); expect(idleOn(R, 'a', null)).toBe(false);
  });
});

import { stuckCells, STUCK_N } from '../src/school/idle';
import { itemsFor as itemsFor2, answerOf } from '../src/raid/raid';
describe('② 🧱 같은 칸 막힘', () => {
  it('2번 이상 틀리고 못 맞힘 · 또는 멈춤(못 맞힌 첫 칸) = 막힘 · 칸마다 수 · 맞히면 빠짐', () => {
    const L = SUBJ.lessons.find((l) => l.id === 'set-06')!;
    const R = { meta: { code: 'K', lesson: 'set-06', version: 4, created: 0 }, state: { step: 1 }, players: { d: { idle: { mid: 'm1', at: 1 } } }, subs: { m1: {} as Record<string, Record<number, unknown>> } } as unknown as Room;
    const wrong2 = { 0: [[], null], 1: [[], null] }; // ① 칸 두 번 틀림 (빈 고르기)
    const w = () => JSON.parse(JSON.stringify(wrong2)); (R.subs as Record<string, Record<string, unknown>>).m1 = { a: w(), b: w(), c: w() };
    let c = stuckCells(L, R, 'm1', ['a', 'b', 'c']);
    expect(c[0]).toBe(STUCK_N); expect(c[1] || 0).toBe(0);
    expect(stuckCells(L, R, 'm1', ['a', 'b', 'c', 'd'])[0]).toBe(4); // 멈춤 학생 = 못 맞힌 첫 칸
    const ok0 = itemsFor2(L, R, 'm1', 'c', 2).map(answerOf); // c 가 세 번째에 ① 맞힘
    ((R.subs as Record<string, Record<string, Record<number, unknown>>>).m1!.c!)[2] = [ok0[0], null];
    c = stuckCells(L, R, 'm1', ['a', 'b', 'c']);
    expect(c[0]).toBe(2);
  });
});

import { BUNDLES, FEATS, wanted } from '../src/school/features.svelte';
import { savedPaper, setPaperDefault } from '../src/theme/theme';
describe('⚙ 🧩 수업 기능 스위치 7개 (📜 2026-11-16)', () => {
  const NEW = ['sword', 'help3', 'review', 'cc', 'pre', 'stamp', 'guide', 'qpaper'] as const; // 📊 길잡이 = 📜 2026-11-17 #30 (모두 = 켬 · 가볍게 · 게임처럼 = 끔)
  it('7개 · 🤝 · 🧱 는 스위치 없음 · 모든 묶음 처음 값 켬 · 설정 없음 = 켬 · 끄면 끔', () => {
    expect(FEATS.filter((f) => f.group === '🧩 수업 기능').map((f) => f.id)).toEqual([...NEW]);
    // 📦 기능 단계 (📜 2026-11-16): 🪶 기본 = 모두 끔 · ⚔ 표준 = 칼 · 양피지 · 선제 공격 · 도장 · 🏰 풀 = 모두 · 우리 학교 처음 값 = 🏰 풀
    for (const id of NEW) expect(wanted({ bundle: 'basic' }, id)).toBe(false);
    for (const id of NEW) expect(wanted({ bundle: 'standard' }, id)).toBe(['sword', 'qpaper', 'pre', 'stamp'].includes(id));
    for (const id of NEW) expect(wanted({ bundle: 'full' }, id)).toBe(true);
    for (const id of NEW) expect(wanted(null, id)).toBe(true); void BUNDLES;
    expect(wanted({ bundle: 'full', on: { stamp: false } }, 'stamp')).toBe(false);
  });
  it('📜 양피지 기본 끔 = 처음 값만 끔 · 학생이 고른 값은 그대로', () => {
    let v: string | null = null; (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: () => v };
    setPaperDefault(false); expect(savedPaper()).toBe(false);
    v = '1'; expect(savedPaper()).toBe(true);
    v = null; setPaperDefault(true); expect(savedPaper()).toBe(true);
  });
});

import { estimate, packTier, timeSig, recordTime, ltimePath, T0, lessonCounts } from '../src/school/ltime';
describe('⏱ 수업 시간 영향 (📜 2026-11-16)', () => {
  const L = SUBJ.lessons.find((l) => l.id === 'set-06')!;
  it('기본 = 도입 · 개념 · 몬스터(정찰 포함 + 소문제) · 형성평가 · 마무리 · 기능 = 체크 · 풀이 · 쉼터 · 연출', () => {
    const c = lessonCounts(L), base = c.intro * T0.intro + c.concept * T0.concept + c.mons.reduce((a, m) => a + T0.mon + m.n * (m.chain ? T0.chainStage : T0.item), 0) + c.bossItems * T0.bossItem + T0.wrap;
    const all = estimate(L, () => true), none = estimate(L, () => false);
    expect(all.base).toBeCloseTo(base, 5); expect(none.extra).toBe(0); expect(all.extra).toBeCloseTo(T0.rest + T0.fx + c.checks * T0.cc + c.reviews * T0.review, 5);
    expect(all.total).toBeCloseTo(all.base + all.extra, 5); expect(packTier(L)).toBe('basic');
  });
  it('50분 넘으면 빨강 + 가장 큰 기능 끄기 한 줄 · 실측 3번 이상 = 실측 평균', () => {
    const big = SUBJ.lessons.find((l) => l.id === 'set-08')!, e = estimate(big, () => true, null);
    expect(e.over).toBe(true); expect(e.cut?.id).toBe('rest'); // 8차시 = 52.3 + 기능 3 > 50
    expect(estimate(L, () => true, { a: 40, b: 44 }).real).toBeNull();
    const r = estimate(L, () => true, { a: 40, b: 44, c: 48 }); expect(r.real).toEqual({ n: 3, min: 44 }); expect(r.total).toBe(44);
  });
  it('수업 닫을 때 실측 기록 = 차시 · 기능 서명 · 수업 · 너무 짧거나 긴 것은 버림', () => {
    const S = store(), sig = timeSig(() => true); expect(sig).toBe('1111');
    recordTime(S, 'set-06', 'K1', 0, 45 * 60000, sig); recordTime(S, 'set-06', 'K2', 0, 30000, sig);
    expect(S.get(ltimePath('set-06', sig))).toEqual({ K1: 45 });
  });
});
