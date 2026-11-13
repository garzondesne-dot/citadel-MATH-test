// ❤ 하트 · ⚡ 기력 · 🔥 재도전 판 (📜 2026-11-13 밤 · 베타 v4 · 머리 🔨 하트 묶음 A · B)
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, heartRelease, nextStep, openRoom, roomPath, spendEnergy, submit, trueUlt } from '../src/raid/actions';
import { answerOf, ENERGY, healsReceived, itemsFor, plainRecord, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';

const wrong = (q: Parameters<typeof answerOf>[0]) => (q.type === 'multi' ? ([] as never) : q.type === 'choice' ? ((q.answerIndex + 1) % 9 as never) : ('999' as never));
function room() {
  const b = memoryStore(), S: Store = { ...b, kind: 'memory', now: () => 1_000_000 };
  const L = packOf('set-06')!; openRoom(S, L, 'V4', PROFILES.test); S.set(`${roomPath('V4')}/meta/version`, 4);
  for (const [u, n] of [['a', 1], ['b', 2], ['c', 3]] as const) heartbeat(S, 'V4', u, n, u, { enh: 3 });
  const R = () => S.get<Room>(roomPath('V4')) as Room;
  while (stepOf(L, R())?.kind !== 'monster' || L.monsters[stepOf(L, R())!.id]?.chain) nextStep(S, L, 'V4');
  const id = stepOf(L, R())!.id;
  const solve = (u: string, ok = true) => { const r = plainRecord(L, R(), id, u); const its = itemsFor(L, R(), id, u, r.nextAttempt); return submit(S, L, 'V4', id, u, its.map((q, i) => (ok || i > 0 ? answerOf(q) : wrong(q)))); };
  const rec = (u: string) => plainRecord(L, R(), id, u);
  return { S, L, R, id, solve, rec };
}
describe('❤ 하트 (일반 몬스터 · v4)', () => {
  it('❤ 4 · 하나라도 틀리면 −1 (개수 상관없이) · 다 맞힌 제출은 ❤ 안 씀', () => {
    const { solve, rec } = room();
    expect(rec('a').slots).toBe(4); solve('a', false); expect(rec('a').left).toBe(3); solve('a'); expect(rec('a').left).toBe(3); expect(rec('a').perfect).toBe(true);
  });
  it('❤ 0 → 🙋 잠김 · 더 못 냄 → 풀어주기 = ❤ +1 · 정답 펼침 · 💚 힐 받으면 ❤ +1', () => {
    const { S, L, id, solve, rec } = room();
    for (let i = 0; i < 4; i++) solve('b', false);
    expect(rec('b').left).toBe(0); expect(rec('b').locked).toBe(true); expect(solve('b', false)).toBe(false);
    heartRelease(S, 'V4', id, 'b'); expect(rec('b').left).toBe(1); expect(rec('b').locked).toBe(false); expect(rec('b').reveal).toBe(true);
    solve('a'); expect(spendEnergy(S, L, 'V4', id, 'a', 'b')).toBe(true); expect(rec('b').left).toBe(2);
  });
});
describe('⚡ 기력 → 🔥 재도전 판 (v4)', () => {
  it('다 맞히기 전 ⚡ 0 · 다 맞히면 ⚡ 3 · ⚡ 1 쓰면 판 열림 · 판을 다 맞혀야 다음 ⚡ · 판 안에서 틀려도 ❤ 그대로', () => {
    const { S, L, id, solve, rec } = room();
    solve('a', false); expect(rec('a').tokens).toBe(0); expect(spendEnergy(S, L, 'V4', id, 'a', 'bind')).toBe(false);
    solve('a'); expect(rec('a').tokens).toBe(ENERGY); expect(rec('a').canHeal).toBe(true);
    expect(spendEnergy(S, L, 'V4', id, 'a', 'bind')).toBe(true); expect(rec('a').roundOpen).toBe(true); expect(rec('a').canRetry).toBe(true);
    expect(spendEnergy(S, L, 'V4', id, 'a', 'bind')).toBe(false); // 판을 다 맞혀야 다음
    const h = rec('a').left; solve('a', false); expect(rec('a').left).toBe(h); expect(rec('a').fix).toBe(true); expect(rec('a').roundOpen).toBe(true);
    solve('a'); expect(rec('a').rounds).toBe(1); expect(rec('a').roundOpen).toBe(false); expect(rec('a').canHeal).toBe(true);
    expect(rec('a').best).toBe(rec('a').total); // 데미지 그대로(재도전 판 = 0)
  });
  it('⚡ 3 다 쓰면 끝 · 판 없음', () => {
    const { S, L, id, solve, rec } = room();
    solve('a'); for (let i = 0; i < 3; i++) { expect(spendEnergy(S, L, 'V4', id, 'a', 'bind')).toBe(true); solve('a'); }
    expect(rec('a').tokLeft).toBe(0); expect(rec('a').canHeal).toBe(false); expect(rec('a').canRetry).toBe(false); expect(solve('a')).toBe(false);
  });
  it('🌟 = 첫 공격 퍼펙트 + 판 2개 각각 한 번에 → 세 번째 ⚡ 에서만 · 파티 힐 없음', () => {
    const { S, L, R, id, solve, rec } = room();
    solve('a'); expect(trueUlt(S, L, 'V4', id, 'a', true)).toMatch(/세 번째/);
    spendEnergy(S, L, 'V4', id, 'a', 'bind'); solve('a'); spendEnergy(S, L, 'V4', id, 'a', 'bind'); solve('a');
    expect(rec('a').trueOk).toBe(true); solve('c', false);
    const before = healsReceived(R(), id, 'c', L);
    expect(trueUlt(S, L, 'V4', id, 'a', true)).toBe(''); expect(healsReceived(R(), id, 'c', L)).toBe(before); // 💚 파티 힐 없음
    expect(rec('a').roundOpen).toBe(true); // 🌟 도 ⚡ 1 → 재도전 판
  });
  it('판 하나를 한 번에 못 맞히면 🌟 안 켜짐', () => {
    const { S, L, id, solve, rec } = room();
    solve('a'); spendEnergy(S, L, 'V4', id, 'a', 'bind'); solve('a', false); solve('a'); spendEnergy(S, L, 'V4', id, 'a', 'bind'); solve('a');
    expect(rec('a').trueOk).toBe(false);
  });
});
