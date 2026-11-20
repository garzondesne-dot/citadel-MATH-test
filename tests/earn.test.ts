// 💎 · 📜 얻는 길 (📜 2026-11-20 선생님 · 머리 🔨) — 타일 값 = 각 규칙 파일 상수 그대로 · 순서 · 가는 곳
import { describe, expect, it } from 'vitest';
import { GEM_TILES, SCROLL_TILES } from '../src/school/earn';
import { DUMMY_G } from '../src/school/dummy';
import { CASTLE_GEM } from '../src/school/castle';
import { G } from '../src/school/reward';
import { KEY_CHEST } from '../src/school/keys';

describe('💎 얻는 길', () => {
  it('7칸 · 머리 순서 그대로 · 가는 곳 = 캠프 물건', () => {
    expect(GEM_TILES.map((t) => t.k)).toEqual(['chal', 'scare', 'castle', 'board', 'raid', 'chest', 'mail']);
    expect(GEM_TILES.map((t) => t.go)).toEqual(['tentdeco', 'scare', 'castle', 'dummy', 'gate', 'gate', 'mail']);
  });
  it('값 = 코드 상수 (허수아비 · 성채 · 레이드 · 열쇠 · 도전과제)', () => {
    const v = Object.fromEntries(GEM_TILES.map((t) => [t.k, t.amt]));
    expect(v.scare).toBe(`+${Math.min(...Object.values(DUMMY_G))}~${Math.max(...Object.values(DUMMY_G))}`);
    expect(v.castle).toBe(`+${CASTLE_GEM.first}~${CASTLE_GEM.roomBoss}`);
    expect(v.raid).toBe(`+${G.join}~${G.join + G.solvedMax + G.perfect + G.bossPerfect}`);
    expect(v.chest).toBe(`+${KEY_CHEST.gem}`);
    expect(v.chal).toBe('+10~50');
    expect(v.mail).toBe('여러 개');
  });
  it('📜 = 서술형 📸 통과 곳 셋(수업 · 허수아비 · 성채) + 도전과제', () => {
    expect(SCROLL_TILES.map((t) => t.k)).toEqual(['raid', 'scare', 'castle', 'chal']);
  });
});
