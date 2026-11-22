// 📦 #106 함수 던전 몬스터 묶음 시트 (fn5-14 ~ 17) — 그림 전 = 줄마다 임시 그림 · 그림이 오면 같은 이름으로 레이드 · 게시판 · 허수아비 · 성채
import { afterEach, describe, expect, it } from 'vitest';
import { BUNDLES, bundleReady, bundleTemp, SHEETS, spriteOf } from '../src/ui/manifest';
import { bossArt, fnRef } from '../src/ui/board/atb/rdunBoss';
import { bossOf } from '../src/board/atb/tune';

describe('📦 #106 함수 몬스터 묶음', () => {
  afterEach(() => { delete (SHEETS as Record<string, unknown>)['fn5-14']; });
  it('묶음 4장 = 줄 순서 · 마지막 줄 = 👑 보스 · 임시 그림이 줄마다 있음', () => {
    expect(Object.keys(BUNDLES).sort()).toEqual(['fn5-14', 'fn5-15', 'fn5-16', 'fn5-17']);
    for (const [k, b] of Object.entries(BUNDLES)) {
      expect(b.ids.length, k).toBe(b.names.length); expect(b.temp.length, k).toBe(b.ids.length); expect(b.boss, k).toBe(b.ids.length - 1);
      expect(b.ids[b.boss], k).toMatch(/-b01$/);
      for (const t of b.temp) expect(() => spriteOf(t), `${k} ${t}`).not.toThrow();
    }
    expect(BUNDLES['fn5-14']!.ids).toEqual(['f14-m01', 'f14-m03', 'f14-m04', 'f14-b01']);
    expect(BUNDLES['fn5-17']!.names[3]).toBe('역함수의 거울 군주');
  });
  it('그림 전: fn5-14:1 = 임시 그림 (꼬리표 @e · @h 그대로) · 차시 팩 검사도 통과(도감에 있음)', () => {
    expect(bundleReady('fn5-14')).toBe(false);
    const a = spriteOf('fn5-14:1'), t = spriteOf(bundleTemp('fn5-14', 1)!);
    expect(a.url).toBe(t.url); expect(a.row).toBe(t.row);
    const e = spriteOf('fn5-15:4@e@h40'); expect(e.elite).toBe(true); expect(e.hue).toBe(40);
    expect(() => spriteOf('fn5-99:0')).toThrow();
  });
  it('게시판 던전: 그림 전 = 지금 임시(랜덤 던전) 그대로 · 그림이 오면 연습 첫 몬스터 · 일반 둘째 · 도전 👑 보스', () => {
    const cfg = bossOf(14);
    expect(fnRef(14, 'hard')).toBeNull();
    expect(bossArt(cfg, 'hard').sprite).not.toMatch(/^fn5/);
    (SHEETS as Record<string, unknown>)['fn5-14'] = { src: 'art/fn5/fn5-14-v1.webp', cols: 5, rows: 4, cell: 256, poses: { idle: 0, idleB: 1, attack: 2, hit: 3, down: 4 }, names: BUNDLES['fn5-14']!.names };
    expect(bundleReady('fn5-14')).toBe(true);
    expect(bossArt(cfg, 'easy').sprite).toBe('fn5-14:0'); expect(bossArt(cfg, 'normal').sprite).toBe('fn5-14:1'); expect(bossArt(cfg, 'hard').sprite).toBe('fn5-14:3');
    expect(spriteOf('fn5-14:3').url).toMatch(/fn5-14-v1\.webp$/);
  });
});
