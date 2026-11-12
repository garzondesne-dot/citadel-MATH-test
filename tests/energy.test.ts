// ⚡ #152 기력 (정식 heals 칸): 소레이드 대장 처치 = 남은 칸이 기력 · 묶기 = 공격 3초 늦춤 · 힐 = 친구 도전 칸 +1 · 기력이 없으면 못 씀
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { chainSubmit, heartbeat, nextStep, openRoom, roomPath, spendEnergy } from '../src/raid/actions';
import { answerOf, bindSec, chainRecord, healsReceived, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { attackMs, attackOf, ATTACKS } from '../src/raid/attacks';

describe('⚡ 기력 · 💥 공격 표 (#152)', () => {
  it('소레이드 다 맞힘 → 기력 = 남은 칸 · 묶기 · 힐 · 바닥나면 막힘', () => {
    const L = packOf('set-06@7')!, S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'E1', PROFILES.test); heartbeat(S, 'E1', 'a', 1, '가'); heartbeat(S, 'E1', 'b', 2, '나');
    const R = () => S.get<Room>(roomPath('E1')) as Room;
    while (stepOf(L, R())?.kind !== 'monster') nextStep(S, L, 'E1');
    const id = stepOf(L, R())!.id;
    for (let k = 0; k < 12 && !chainRecord(L, R(), id, 'a').done; k++) { const r = chainRecord(L, R(), id, 'a'); chainSubmit(S, L, 'E1', id, 'a', r.stage, 0, answerOf(r.items[r.stage]!)); }
    const r0 = chainRecord(L, R(), id, 'a');
    expect(r0.done).toBe(true); expect(r0.tokens).toBeGreaterThan(0);
    expect(spendEnergy(S, L, 'E1', id, 'a', 'bind')).toBe(true); expect(bindSec(R(), id)).toBe(3);
    expect(spendEnergy(S, L, 'E1', id, 'a', 'b')).toBe(true); expect(healsReceived(R(), id, 'b')).toBe(1);
    expect(spendEnergy(S, L, 'E1', id, 'a', 'a')).toBe(false); // 나에게 힐 ✗
    while (chainRecord(L, R(), id, 'a').tokLeft > 0) spendEnergy(S, L, 'E1', id, 'a', 'bind');
    expect(spendEnergy(S, L, 'E1', id, 'a', 'bind')).toBe(false);
    expect(spendEnergy(S, L, 'E1', id, 'b', 'bind')).toBe(false); // 기력 없음
  });
  it('짝 표: 몬스터마다 attack · 보스 = 번갈아 · 없으면 pause', () => {
    const L6 = packOf('set-06')!, L7 = packOf('set-06@7')!, L2 = packOf('set-02')!;
    const st = (L: typeof L6, id: string) => L.steps.find((s) => s.id === id)!;
    expect(attackOf(L6, st(L6, 'm1'), 0).id).toBe('fog'); expect(attackOf(L7, st(L7, 'u4'), 0).id).toBe('smash');
    expect([0, 1, 2].map((k) => attackOf(L6, st(L6, 'boss'), k).id)).toEqual(['glitch', 'fog', 'glitch']);
    expect(attackOf(L2, st(L2, 'm4'), 0).id).toBe('ice');
    expect(Object.keys(ATTACKS)).toEqual(['pause', 'glitch', 'fog', 'ice', 'fire', 'smash']);
    expect(Object.values(ATTACKS).filter((a) => a.lockInput).map((a) => a.id)).toEqual(['pause', 'glitch']);
    // #168 손풀기 공격만 3초 · 나머지 = 지금 멈춤
    expect(Object.values(ATTACKS).map((a) => attackMs(a, 1))).toEqual([1000, 1000, 3000, 3000, 3000, 1000]);
  });
});
