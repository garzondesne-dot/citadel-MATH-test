// ⚡ #152 기력 (정식 heals 칸): 소레이드 대장 처치 = 남은 칸이 기력 · 묶기 = 공격 3초 늦춤 · 힐 = 친구 도전 칸 +1 · 기력이 없으면 못 씀
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { chainSubmit, heartbeat, nextStep, openRoom, roomPath, spendEnergy } from '../src/raid/actions';
import { answerOf, bindSec, chainRecord, healsReceived, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { attackMs, attackOf, attackStrong, ATTACKS, bossAttacks } from '../src/raid/attacks';

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
    expect(Object.keys(ATTACKS)).toEqual(['pause', 'glitch', 'fog', 'ice', 'fire', 'smash', 'confuse', 'wind', 'poison', 'bind', 'sleep', 'dark', 'mirror', 'lock', 'scale']);
    expect(Object.values(ATTACKS).filter((a) => a.lockInput).map((a) => a.id)).toEqual(['pause', 'glitch', 'bind']);
    // #168 손풀기 공격만 3초 · 나머지 = 지금 멈춤
    expect(Object.values(ATTACKS).slice(0, 6).map((a) => attackMs(a, 1))).toEqual([1000, 1000, 3000, 3000, 3000, 1000]);
  });
  it('#161 공격 15: 속성 8 · 몸짓 겹침 0 · 던전 특수 = 그 차시 보스 셋째 · 분노 = 50% 아래 · 멈춤 상한 안', () => {
    const els = new Set(Object.values(ATTACKS).map((a) => a.elem)); expect(els.size).toBe(8);
    const g = Object.values(ATTACKS).map((a) => a.gesture).filter(Boolean); expect(new Set(g).size).toBe(g.length);
    const L8 = packOf('set-08')!, L9 = packOf('set-09')!, L10 = packOf('set-10')!, L6 = packOf('set-06')!;
    expect(bossAttacks(L8)).toEqual(['glitch', 'ice', 'mirror']); expect(bossAttacks(L9)).toEqual(['smash', 'glitch', 'lock']); expect(bossAttacks(L10)).toEqual(['smash', 'fog', 'scale']);
    expect(bossAttacks(L6)).toEqual(['glitch', 'fog']);
    const b8 = L8.steps.find((s) => s.kind === 'boss')!; expect([0, 1, 2, 3].map((k) => attackOf(L8, b8, k).id)).toEqual(['glitch', 'ice', 'mirror', 'glitch']);
    expect(attackStrong({ left: 49, max: 100 })).toBe(true); expect(attackStrong({ left: 50, max: 100 })).toBe(false); expect(attackStrong({ left: 0, max: 100 })).toBe(false); expect(attackStrong(null)).toBe(false);
    expect(attackMs(ATTACKS.pause!, 4, true)).toBe(4000); // 멈춤 = 이미 상한
    expect(attackMs(ATTACKS.fog!, 5, true)).toBe(3900); // 3초 × 1.3 ≤ 5초
    expect(attackMs(ATTACKS.fog!, 3, true)).toBe(3000); // 상한 3초
    expect(attackMs(ATTACKS.fog!, 1, true)).toBe(3000); // 원래가 상한보다 길면 그대로
  });
});
