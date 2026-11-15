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
