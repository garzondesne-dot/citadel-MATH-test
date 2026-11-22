// 📦 #106 함수 던전 몬스터 묶음 시트 (fn5-14 ~ 17) — 그림 전 = 줄마다 임시 그림 · 그림이 오면 같은 이름으로 레이드 · 게시판 · 허수아비 · 성채
import { afterEach, describe, expect, it } from 'vitest';
import { BUNDLES, bundleReady, bundleTemp, SHEETS, spriteOf } from '../src/ui/manifest';
import { bossArt, fnRef } from '../src/ui/board/atb/rdunBoss';
import { bossOf } from '../src/board/atb/tune';

describe('📦 #106 함수 몬스터 묶음', () => {
  afterEach(() => { for (const k of ['fn5-14', 'fn5-boss']) delete (SHEETS as Record<string, unknown>)[k]; });
  it('차시 묶음 4장(몬스터만) + 👑 보스 한 장(4줄 · 차시 순) · 임시 그림이 줄마다 있음', () => {
    expect(Object.keys(BUNDLES).sort()).toEqual(['fn5-14', 'fn5-15', 'fn5-16', 'fn5-17', 'fn5-boss']);
    for (const [k, b] of Object.entries(BUNDLES)) {
      expect(b.ids.length, k).toBe(b.names.length); expect(b.temp.length, k).toBe(b.ids.length);
      for (const t of b.temp) expect(() => spriteOf(t), `${k} ${t}`).not.toThrow();
    }
    expect(BUNDLES['fn5-14']!.ids).toEqual(['f14-m01', 'f14-m03', 'f14-m04']);
    expect(BUNDLES['fn5-boss']!.ids).toEqual(['f14-b01', 'f15-b01', 'f16-b01', 'f17-b01']);
    [14, 15, 16, 17].forEach((n, i) => expect(BUNDLES[`fn5-${n}`]!.bossRef).toBe(`fn5-boss:${i}`));
    expect(spriteOf('fn5-boss:3').url).toBe(spriteOf('d12:4').url);
  });
  it('그림 전: fn5-14:1 = 임시 그림 (꼬리표 @e · @h 그대로) · 차시 팩 검사도 통과(도감에 있음)', () => {
    expect(bundleReady('fn5-14')).toBe(false);
    const a = spriteOf('fn5-14:1'), t = spriteOf(bundleTemp('fn5-14', 1)!);
    expect(a.url).toBe(t.url); expect(a.row).toBe(t.row);
    const e = spriteOf('fn5-15:3@e@h40'); expect(e.elite).toBe(true); expect(e.hue).toBe(40);
    expect(() => spriteOf('fn5-99:0')).toThrow();
  });
  it('게시판 던전: 그림 전 = 지금 임시 그대로 · 몬스터 묶음이 오면 연습 첫 · 일반 둘째 · 보스 묶음이 오면 도전 = 그 차시 보스 줄', () => {
    const cfg = bossOf(14), five = (rows: number, cell: number, src: string) => ({ src, cols: 5, rows, cell, poses: { idle: 0, idleB: 1, attack: 2, hit: 3, down: 4 }, names: [] });
    expect(fnRef(14, 'hard')).toBeNull(); expect(bossArt(cfg, 'hard').sprite).not.toMatch(/^fn5/);
    (SHEETS as Record<string, unknown>)['fn5-14'] = five(3, 256, 'art/fn5/fn5-14-v1.webp');
    expect(bundleReady('fn5-14')).toBe(true);
    expect(bossArt(cfg, 'easy').sprite).toBe('fn5-14:0'); expect(bossArt(cfg, 'normal').sprite).toBe('fn5-14:1');
    expect(bossArt(cfg, 'hard').sprite).not.toMatch(/^fn5/); // 보스 그림은 아직 = 임시 그대로
    (SHEETS as Record<string, unknown>)['fn5-boss'] = five(4, 384, 'art/fn5/fn5-boss-v1.webp');
    expect(bossArt(cfg, 'hard').sprite).toBe('fn5-boss:0'); expect(bossArt(bossOf(17), 'hard').sprite).toBe('fn5-boss:3');
    expect(spriteOf('fn5-boss:0').url).toMatch(/fn5-boss-v1\.webp$/);
  });
});
