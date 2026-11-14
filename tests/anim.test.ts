// 🎞 용사 모션 표 = 정식 assets/manifest.js heroesV2 anims 그대로 (📜 2026-11-14 머리 🔨 모션 점검)
import { describe, expect, it } from 'vitest';
import { ANIM, HERO } from '../src/ui/manifest';

const OFFICIAL = { idle: [0, 4, 1.28], walk: [1, 4, 0.64], attack: [2, 4, 0.48], hit: [3, 1], win: [4, 2, 0.7], fall: [5, 2, 0.6, true], heal: [6, 2, 0.7], portal: [7, 4, 0.9, true], sit: [8, 2, 1.6], healed: [9, 2, 0.8], think: [10, 2, 1.4], pant: [11, 2, 0.5] } as const;
describe('용사 모션 표', () => {
  it('12줄 · 정식 줄 · 칸 수 · 초 · 한 번만', () => {
    expect(Object.keys(ANIM).length).toBe(HERO.rows);
    for (const [k, v] of Object.entries(OFFICIAL)) {
      const a = ANIM[k as keyof typeof ANIM];
      expect(a[0]).toBe(v[0]); expect(a[1]).toBe(v[1]);
      if (v.length > 2) expect(a[2]).toBe(v[2]);
      expect(!!a[3]).toBe(v.length > 3);
      expect(a[1]).toBeLessThanOrEqual(HERO.cols);
    }
    expect(new Set(Object.values(ANIM).map((a) => a[0])).size).toBe(HERO.rows);
  });
});
