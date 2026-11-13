// 🌟 진필살기 · 🛡 홀리 방패 (2026-11-13 ❓#3 ③B ⑤A · 정식 model.js · actions.js 그대로): 3연속 퍼펙트 + Ⅳ → '!true' = 파티 힐 + 석화 20초(공격 시계 +20) · 반 전체 한 번
//   +10 · 퍼펙트 → 홀리 방패 켬 → 공격 주기 안이면 막음 → 막은 기록 = 석화 10초(공격 시계 +10) · 몬스터마다 한 번 · +9 는 못 켬
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, holyArm, holyUse, nextStep, openRoom, roomPath, submit, trueUlt, petriGem } from '../src/raid/actions';
import { answerOf, bindSec, healsReceived, holyArmed, holyCan, holyOn, itemsFor, perfStreak, petrify, plainRecord, stepOf, stone, TRUE_SEC, HOLY_SEC } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';

const wrong = (q: Parameters<typeof answerOf>[0]) => (q.type === 'multi' ? ([] as never) : q.type === 'choice' ? ((q.answerIndex + 1) % 9 as never) : ('999' as never));
function room() {
  let t = 1_000_000; const b = memoryStore(), S: Store = { ...b, kind: 'memory', now: () => t };
  const L = packOf('set-06')!; openRoom(S, L, 'H1', PROFILES.test);
  heartbeat(S, 'H1', 'a', 1, '가', { enh: 10 }); heartbeat(S, 'H1', 'b', 2, '나', { enh: 3 }); heartbeat(S, 'H1', 'c', 3, '다', { enh: 10 });
  const R = () => S.get<Room>(roomPath('H1')) as Room;
  while (stepOf(L, R())?.kind !== 'monster') nextStep(S, L, 'H1');
  const id = stepOf(L, R())!.id;
  const solve = (u: string, ok = true) => { const r = plainRecord(L, R(), id, u); const its = itemsFor(L, R(), id, u, r.nextAttempt); submit(S, L, 'H1', id, u, its.map((q, i) => (ok || i > 0 ? answerOf(q) : wrong(q)))); };
  return { S, L, R, id, solve, tick: (ms: number) => { t += ms; } };
}
describe('🌟 진필살기 · 🛡 홀리 방패', () => {
  it('🌟 3연속 퍼펙트 + Ⅳ 만 · 파티 힐(아직 못 맞힌 친구 +1) · 석화 20초 · 반 전체 한 번', () => {
    const { S, L, R, id, solve } = room();
    solve('a'); expect(trueUlt(S, L, 'H1', id, 'a', true)).toMatch(/3연속/);
    solve('a'); solve('a'); expect(perfStreak(plainRecord(L, R(), id, 'a'))).toBe(3);
    expect(trueUlt(S, L, 'H1', id, 'a', false)).toMatch(/Ⅳ/);
    solve('b', false); const before = healsReceived(R(), id, 'b', L), bind0 = bindSec(R(), id);
    expect(trueUlt(S, L, 'H1', id, 'a', true)).toBe('');
    expect(petrify(R(), id)).not.toBeNull(); expect(bindSec(R(), id) - bind0).toBe(TRUE_SEC);
    expect(healsReceived(R(), id, 'b', L)).toBe(before + 1); // 못 맞힌 친구 +1
    expect(healsReceived(R(), id, 'a', L)).toBe(0); // 쓴 사람 · 다 맞힌 사람은 아님
    solve('c'); solve('c'); solve('c'); expect(trueUlt(S, L, 'H1', id, 'c', true)).toMatch(/이미 진필살기로 굳었/); // 반 전체 한 번
  });
  it('🛡 +10 퍼펙트만 켬 · 주기 안이면 막음 · 막은 기록 = 석화 10초 · 몬스터마다 한 번 · +9 ✗', () => {
    const { S, L, R, id, solve, tick } = room();
    expect(holyCan(L, R(), 'a', S.now())).toBe(false); solve('a'); expect(holyCan(L, R(), 'a', S.now())).toBe(true);
    solve('b'); expect(holyCan(L, R(), 'b', S.now())).toBe(false); // +3
    holyArm(S, 'H1', 'a', id, true); expect(holyOn(R(), id, 'a')).toBe(true);
    expect(holyArmed(R(), id, S.now(), 10)).toEqual(['a']);
    tick(20000); expect(holyArmed(R(), id, S.now(), 10)).toEqual([]); // 이번 공격 주기 밖(켠 지 오래) = 안 막음
    holyArm(S, 'H1', 'a', id, true); const bind0 = bindSec(R(), id);
    holyUse(S, 'H1', 'a', id); expect(holyOn(R(), id, 'a')).toBe(false); expect(bindSec(R(), id) - bind0).toBe(HOLY_SEC);
    const st = stone(R(), id)!; expect(st.holy).toBe(true); expect(st.until - st.at).toBe(HOLY_SEC * 1000);
    expect(holyCan(L, R(), 'a', S.now())).toBe(false); // 몬스터마다 한 번
    expect(petriGem(S, 'H1', 'b', st.at, id, 2)).toBe(2); expect(petriGem(S, 'H1', 'b', st.at, id, 5)).toBe(1); // 석화 한 번에 💎 3까지
  });
});
