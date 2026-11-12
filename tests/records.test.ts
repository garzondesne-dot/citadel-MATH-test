// 🔁 #163 ③ 정식 칸 꼴: 수업 기록 · 💎 buy 지도 · 명단 가림
import { describe, expect, it } from 'vitest';
import type { Question, Given, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, itemsFor, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { summaryOf, perfectsOf, wonOf, bossFullOf } from '../src/school/records';
import { buysOf } from '../src/store/me.svelte';
import { maskName } from '../src/school/school';
import { roleOf } from '../src/board/team';

describe('🔁 정식 칸 꼴 (#163 ③)', () => {
  it('수업 기록 = mons o · f · x · n · bossM · boss · bossN (정식 result.js summary 꼴)', () => {
    const L = packOf('set-06')!, S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'R1', PROFILES.test); heartbeat(S, 'R1', 'a', 1, '가'); heartbeat(S, 'R1', 'b', 2, '나');
    const R = () => S.get<Room>(roomPath('R1')) as Room;
    while (stepOf(L, R())?.kind !== 'monster') nextStep(S, L, 'R1');
    const id = stepOf(L, R())!.id;
    submit(S, L, 'R1', id, 'a', itemsFor(L, R(), id, 'a', 0).map(answerOf));
    const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
    submit(S, L, 'R1', id, 'b', wrong(itemsFor(L, R(), id, 'b', 0)));
    const a = summaryOf(L, R(), 'a', 'R1', S.now()), b = summaryOf(L, R(), 'b', 'R1', S.now());
    expect(a.mons[id]).toBe('o'); expect(b.mons[id]).toBe('x');
    expect(a.mons.m2).toBe('n'); expect(a.bossN).toBe(3); expect(a.bossM).toBe('nnn'); expect(a.boss).toBe(0);
    expect(perfectsOf(a)).toBe(1); expect(wonOf(a)).toBe(false);
    expect(perfectsOf({ mons: { m1: { perfect: true }, m2: { perfect: false } } })).toBe(1); // 옛 v1.0 꼴도
    expect(bossFullOf({ boss: 3, bossN: 3 })).toBe(true); expect(bossFullOf({ boss: { ok: 6, items: 6 } })).toBe(true);
  });
  it('💎 buy: 정식 { 물건: 시각 } = 경제 0판으로 읽음 · v1.0 목록은 그대로', () => {
    expect(buysOf({ buy: { h7: 100, fx2: 200 } })).toEqual({ buys: [{ id: 'h7', ver: 0, at: 100 }, { id: 'fx2', ver: 0, at: 200 }], ver: 0 });
    expect(buysOf({ buy: [{ id: 'h7', ver: 1, at: 5 }], ver: 1 })).toEqual({ buys: [{ id: 'h7', ver: 1, at: 5 }], ver: 1 });
  });
  it('명단 가림 = 정식 mask · 게시판 역할 = 정식 기록(소문제 수 없음)도', () => {
    expect([maskName('김민준'), maskName('이윤'), maskName('남궁민수')]).toEqual(['김*준', '이*', '남**수']);
    expect(roleOf({ mons: { m1: 'o', m2: 'f', m3: 'o', u4: 'x' } }, ['m1', 'm2', 'm3']).role).toBe('g');
    expect(roleOf({ mons: { u4: 'x', u5: 'o' } }, ['u4', 'u5', 'u6', 'u7']).role).toBe('c');
  });
});
