// 🐞 11/19 수업 버그 (11차시 · 1-5반) — ② 명단 받기 전 가짜 이름 · ③ 🎬 영상 중 효과음
import { describe, expect, it } from 'vitest';
import { roster, rosterReady } from '../src/school/school';
import type { Store } from '../src/model/types';

const mk = (kind: Store['kind'], data: Record<string, unknown>): Store => ({ kind, get: <T>(p: string) => (data[p] ?? null) as T | null, set: () => {}, watch: () => () => {}, now: () => 0 });

describe('② 명단 받기 전', () => {
  it('서버 + 명단 없음 = 아직 아님 (가짜 이름을 보여 주지 않음)', () => {
    expect(rosterReady('1-1', mk('server', {}))).toBe(false);
  });
  it('서버 + 가린 명단이 오면 준비됨 · 진짜 번호만', () => {
    const S = mk('server', { 'rosterMask/1-1': { 15: '김*수' } });
    expect(rosterReady('1-1', S)).toBe(true);
    expect(roster('1-1', S).map((p) => p.num)).toEqual([15]);
  });
  it('이 기기 체험 모드 = 늘 준비됨 (가짜 이름 목록 그대로)', () => {
    expect(rosterReady('1-1', mk('device', {}))).toBe(true);
    expect(roster('1-1', mk('device', {})).length).toBeGreaterThan(0);
  });
});

describe('③ 🎬 영상 동안 효과음 끔', () => {
  it('hush 가 켜지면 소리 칸은 기록만 하고 내지 않음 · 끄면 되돌림', async () => {
    const m = await import('../src/ui/sound.svelte');
    m.hush('tv-video', true); expect(m.hushed()).toBe(true);
    m.hush('tv-video', false); expect(m.hushed()).toBe(false);
  });
});

describe('② 받았는데 비어 있는 반', () => {
  it('서버가 「받음」이라고 하면 예전처럼 이름표 목록 (명단을 안 올린 반 · 에뮬레이터 시험)', () => {
    const S = { ...mk('server', {}), loaded: (p: string) => p === 'rosterMask/1-9' };
    expect(rosterReady('1-9', S)).toBe(true);
    expect(rosterReady('1-1', S)).toBe(false);
  });
});
