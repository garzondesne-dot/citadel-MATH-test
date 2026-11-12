// 🏰 디펜스 계산 (#142-2 · 정식 td.js 계산 그대로) — 자리 24 · ★ 6 · 타워 힘 = 모두 같음 · calibrate 뒤 이길 확률이 한쪽으로 쏠리지 않음
import { describe, expect, it } from 'vitest';
import * as TD from '../src/rest/td';

const towers = (n: number, ranged = (i: number) => i % 3 === 0): TD.TowerIn[] => [...Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, slot: i + 1, ranged: ranged(i) })), { uid: 'T', slot: 0, teacher: true, ranged: false }];

describe('🏰 디펜스 (#142-2)', () => {
  it('지도 5개 · 자리 24 · ★ 6', () => {
    expect(TD.MAPS.map((m) => m.id)).toEqual(['forest', 'volcano', 'ice', 'desert', 'crypt']);
    for (const m of TD.MAPS) { const s = TD.slots(m); expect(s.length).toBe(24); expect(s.filter((p) => p.star).length).toBe(6); }
  });
  it('타워 힘 = 모두 같음 (레벨 · 강화 · 스킬 · 속성 안 셈) · 근접 / 원거리만 다름', () => {
    const m = TD.mapGet('forest'), a = TD.towerOf(m, false), b = TD.towerOf(m, false), r = TD.towerOf(m, true);
    expect(a).toEqual(b);
    expect([a.atk, a.rate, a.fam, a.tier]).toEqual([16, 0.8, 'fire', 0]);
    expect([r.range, r.dmgK, a.range, a.dmgK]).toEqual([3, 1, 1.6, 1.3]);
  });
  it('calibrate → 기술 · 방패 없이 돌려도 판마다 끝나고 · 이기고 지는 판이 섞임', () => {
    let wins = 0, games = 0;
    for (const m of TD.MAPS) for (const seed of [11, 22]) {
      const tw = towers(14), hp0 = TD.calibrate({ map: m, seed, towers: tw });
      expect(hp0).toBeGreaterThan(30);
      const S = TD.create({ map: m, seed: seed + 1, towers: tw, hp0 });
      TD.run(S, (S) => S.towers.forEach((T: { uid: string }) => { while (TD.pending(T) > 0) TD.upgrade(S, T.uid, TD.auto(T, S.R)); }));
      expect(S.done).toBe(true); expect(S.t).toBeLessThanOrEqual(TD.LIMIT + 0.1);
      games++; if (S.win) wins++;
    }
    expect(wins).toBeGreaterThan(0); expect(wins).toBeLessThan(games);
  }, 60000);
});
