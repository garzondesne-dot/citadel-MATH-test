// 👩‍🏫 체험판 v1.0 (📜 2026-11-17 #33) — 차시 12 + 3 · 흐름 · 영상 · 방 설정
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { openRoom, roomPath } from '../src/raid/actions';
import { bossLive, monsterHp } from '../src/raid/raid';
import { REST_AFTER, trialPacks, trialRoom } from '../src/trial/trial';

const T12 = 'ex-12', T03 = 'set-03';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;

describe('👩‍🏫 체험판 차시', () => {
  const [L12, L3] = trialPacks();
  it('12차시 = 도입 → 개념 1(✔) → 문제 1 → 개념 2 → (문제 2) → 문제 3(소레이드) → 형성평가', () => {
    expect(L12!.id).toBe(T12);
    expect(L12!.steps.map((s) => s.id)).toEqual(['intro', 'c1', 'm1', 'c2', 'm2', 'm3', 'boss']);
    expect(!!L12!.steps.find((s) => s.id === 'c1')?.check).toBe(true);
    expect(!!L12!.monsters.m3?.chain).toBe(true);
    expect(L12!.videos?.c1).toBe('video/v12-52.mp4'); expect(L12!.videos?.m3).toBe('video/v12-54.mp4');
    expect(REST_AFTER[T12]).toBe('m1');
  });
  it('3차시 = 도입 · 개념 1 · 문제 1 · 개념 2 · 문제 2 · 형성평가 3문항 · 영상 = 사이트 파일', () => {
    expect(L3!.id).toBe(T03);
    expect(L3!.steps.map((s) => s.id)).toEqual(['intro', 'c1', 'm1', 'c2', 'm2', 'boss']);
    expect(L3!.boss?.items).toBe(3);
    expect(L3!.videos?.c1).toBe('video/v03-22.mp4');
  });
  it('방 = 정찰 5초 · 기준 100 · 12차시 첫 판 = 판 1 · 문제 2 넘김 → 형성평가 짝 문항 빠짐', () => {
    const S = mk(); openRoom(S, L12!, 'TR1', PROFILES.test); trialRoom(S, L12!, 'TR1');
    const R = S.get<Room>(roomPath('TR1'))!;
    expect(R.meta.solve).toBe(5); expect(R.meta.pct).toBe(100);
    expect(R.meta.fresh?.m1).toBe(1); expect(R.meta.fresh?.m3).toBe(1);
    expect(bossLive(L12!, R).drop).toEqual([3]); // 형성평가 4번 = 문제 2 짝
    expect(monsterHp(L12!, R, 'm1', S.now()).max).toBeGreaterThanOrEqual(0);
  });
});
