// 🔥 몬스터별 시도 수 (📜 11/25 선생님 · 머리 🔨 · 🎉 축제의 날 「포기하지 않은 용사」): records/{반}/{번호}/{차시}.tries
import { describe, expect, it } from 'vitest';
import type { Question, Given, Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { bossSubmit, heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { answerOf, bossItem, itemsFor, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { mergeRow, summaryOf, triesOf } from '../src/school/records';

const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];
describe('🔥 시도 수 (tries)', () => {
  it('일반 몬스터 = 다 맞힐 때까지 낸 횟수 · 그 뒤 연습 공격은 안 셈 · 안 낸 학생 = 칸 없음', () => {
    const L = packOf('set-06')!, S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'T1', PROFILES.test); for (const [u, n] of [['a', 1], ['b', 2], ['c', 3]] as const) heartbeat(S, 'T1', u, n, u);
    const R = () => S.get<Room>(roomPath('T1')) as Room;
    while (stepOf(L, R())?.kind !== 'monster') nextStep(S, L, 'T1');
    const id = stepOf(L, R())!.id;
    submit(S, L, 'T1', id, 'a', itemsFor(L, R(), id, 'a', 0).map(answerOf));
    submit(S, L, 'T1', id, 'b', wrong(itemsFor(L, R(), id, 'b', 0)));
    submit(S, L, 'T1', id, 'b', wrong(itemsFor(L, R(), id, 'b', 1)));
    submit(S, L, 'T1', id, 'b', itemsFor(L, R(), id, 'b', 2).map(answerOf));
    submit(S, L, 'T1', id, 'b', itemsFor(L, R(), id, 'b', 3).map(answerOf)); // 다 맞힌 뒤 연습 공격
    expect(triesOf(L, R(), 'a')[id]).toBe(1);
    expect(triesOf(L, R(), 'b')[id]).toBe(3);
    expect(triesOf(L, R(), 'c')).toEqual({});
    const sb = summaryOf(L, R(), 'b', 'T1', S.now()) as { tries?: Record<string, number> };
    expect(sb.tries?.[id]).toBe(3);
    expect((summaryOf(L, R(), 'c', 'T1', S.now()) as { tries?: unknown }).tries).toBeUndefined();
  });
  it('형성평가 = 문항마다 boss_i · 맞힐 때까지', () => {
    const L = packOf('set-06')!, S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'T2', PROFILES.test); heartbeat(S, 'T2', 'a', 1, 'a');
    const R = () => S.get<Room>(roomPath('T2')) as Room;
    bossSubmit(S, L, 'T2', 'a', 0, -999 as unknown as Given);
    bossSubmit(S, L, 'T2', 'a', 0, answerOf(bossItem(L, R(), 'a', 0, 1)!));
    bossSubmit(S, L, 'T2', 'a', 1, answerOf(bossItem(L, R(), 'a', 1, 0)!));
    const t = triesOf(L, R(), 'a');
    expect(t.boss_0).toBe(2); expect(t.boss_1).toBe(1); expect(t.boss_2).toBeUndefined();
  });
  it('같은 차시를 다시 저장 = 칸마다 큰 값 · 앞 기록에만 있는 칸은 남음', () => {
    const base = { at: 1, code: 'X', no: 6, mons: {}, miss: [], perfects: 0, right: 0, total: 0 };
    const m = mergeRow({ ...base, tries: { m1: 3, m2: 1 } } as never, { ...base, tries: { m1: 2, boss_0: 1 } } as never) as { tries?: Record<string, number> };
    expect(m.tries).toEqual({ m1: 3, m2: 1, boss_0: 1 });
  });
});
