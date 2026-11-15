// 💚 힐 받을 친구 = 정식 model.js healTarget 그대로 (📜 2026-11-15 머리 규칙 점검): 접속 · 낸 적 있음 · 아직 다 못 맞힘 · 나 · 선생님 아님 · 받은 힐 2 미만
//   무게 = 남은 기회 0칸 8 · 1칸 4 · 2칸 2 · 그 밖 1 · 후보 없음 = null → healAuto 는 '_'(응원)
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { chainSubmit, healAuto, heartbeat, nextStep, openRoom, roomPath } from '../src/raid/actions';
import { answerOf, chainRecord, healsReceived, healTarget, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';

describe('💚 힐 받을 친구 (정식 healTarget)', () => {
  const L = packOf('set-06@7')!, S: Store = { ...memoryStore(), kind: 'memory' };
  openRoom(S, L, 'H1', PROFILES.test); S.set('rooms/H1/meta/version', 3);
  for (const [u, n] of [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['t', 9]] as const) heartbeat(S, 'H1', u, n, u);
  S.set('rooms/H1/players/t/teacher', true);
  const R = () => S.get<Room>(roomPath('H1')) as Room;
  while (stepOf(L, R())?.kind !== 'monster') nextStep(S, L, 'H1');
  const id = stepOf(L, R())!.id;
  const finish = (u: string) => { for (let k = 0; k < 12 && !chainRecord(L, R(), id, u).done; k++) { const r = chainRecord(L, R(), id, u); chainSubmit(S, L, 'H1', id, u, r.stage, 0, answerOf(r.items[r.stage]!)); } };
  const miss = (u: string, n: number) => { for (let k = 0; k < n; k++) { const r = chainRecord(L, R(), id, u); chainSubmit(S, L, 'H1', id, u, r.stage, 0, '틀린 답 999'); } };
  finish('a'); finish('d'); miss('e', 1); for (let k = 0; k < 12 && chainRecord(L, R(), id, 'b').left > 1; k++) miss('b', 1); finish('t'); // c = 아직 안 냄
  const now = () => S.now();

  it('후보 = 낸 적 있고 아직 다 못 맞힌 친구만 (나 · 선생님 · 다 맞힘 · 안 낸 친구 빼고)', () => {
    const seen = new Set<string>(); for (let i = 0; i < 50; i++) seen.add(healTarget(L, R(), id, 'a', now(), i / 50)!);
    expect([...seen].sort()).toEqual(['b', 'e']);
  });
  it('남은 기회가 적은 친구에게 무게가 큼', () => {
    const lb = chainRecord(L, R(), id, 'b').left, le = chainRecord(L, R(), id, 'e').left; expect(lb).toBeLessThanOrEqual(1); expect(le).toBeGreaterThan(2); // b 무게 4 이상 · e 무게 1
    let nb = 0; for (let i = 0; i < 100; i++) if (healTarget(L, R(), id, 'a', now(), (i + 0.5) / 100) === 'b') nb++;
    expect(nb).toBeGreaterThanOrEqual(80);
  });
  it('접속이 끊긴 친구는 빠짐', () => {
    S.set('rooms/H1/players/e/seen', 1); // 아주 옛날 접속
    for (let i = 0; i < 20; i++) expect(healTarget(L, R(), id, 'a', now(), i / 20)).toBe('b');
    heartbeat(S, 'H1', 'e', 5, 'e');
  });
  it('몬스터당 받은 힐 +2 까지 · 후보가 없으면 응원(_)', () => {
    S.set('rooms/H1/players/e/seen', 1);
    expect(healAuto(S, L, 'H1', id, 'a')).toBe('b'); expect(healAuto(S, L, 'H1', id, 'a')).toBe('b');
    expect(healsReceived(R(), id, 'b', L)).toBe(2);
    expect(healTarget(L, R(), id, 'a', now(), 0)).toBeNull();
    expect(healAuto(S, L, 'H1', id, 'a')).toBe('_'); expect(healsReceived(R(), id, 'b', L)).toBe(2);
  });
});
