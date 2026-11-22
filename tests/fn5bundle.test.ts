// 📦 #106 함수 던전 몬스터 묶음 (fn5-14 ~ 17 몬스터 · fn5-boss 보스) — 레이드 · 게시판 · 허수아비 · 성채가 'fn5-14:줄' 로 같은 시트
import { describe, expect, it } from 'vitest';
import { BUNDLES, bundleReady, bundleTemp, SHEETS, spriteOf } from '../src/ui/manifest';
import { bossArt, fnRef } from '../src/ui/board/atb/rdunBoss';
import { bossOf } from '../src/board/atb/tune';

const KEYS = ['fn5-14', 'fn5-15', 'fn5-16', 'fn5-17', 'fn5-boss'];
describe('📦 #106 함수 몬스터 묶음', () => {
  it('차시 묶음 4장(몬스터만) + 👑 보스 한 장(4줄 · 차시 순) · 줄마다 임시 그림도 있음(다시 뽑을 때 대비)', () => {
    expect(Object.keys(BUNDLES).sort()).toEqual(KEYS);
    for (const [k, b] of Object.entries(BUNDLES)) {
      expect(b.ids.length, k).toBe(b.names.length); expect(b.temp.length, k).toBe(b.ids.length);
      for (const t of b.temp) expect(() => spriteOf(t), `${k} ${t}`).not.toThrow();
    }
    expect(BUNDLES['fn5-14']!.ids).toEqual(['f14-m01', 'f14-m03', 'f14-m04']);
    expect(BUNDLES['fn5-boss']!.ids).toEqual(['f14-b01', 'f15-b01', 'f16-b01', 'f17-b01']);
    [14, 15, 16, 17].forEach((n, i) => expect(BUNDLES[`fn5-${n}`]!.bossRef).toBe(`fn5-boss:${i}`));
    expect(bundleTemp('fn5-boss', 3)).toBe('d12:4');
  });
  it('🎨 그림 들어옴: 5장 모두 5칸 · 줄 수 = 표 · 이름 = 표 · 자기 파일', () => {
    for (const k of KEYS) {
      const s = SHEETS[k]!, b = BUNDLES[k]!;
      expect(bundleReady(k), k).toBe(true); expect(s.cols).toBe(5); expect(s.rows).toBe(b.ids.length); expect(s.names).toEqual(b.names);
      expect(spriteOf(`${k}:${b.ids.length - 1}`).url, k).toMatch(new RegExp(`/art/fn5/${k}-v\\d+\\.webp$`));
    }
    const e = spriteOf('fn5-15:3@e@h40'); expect(e.elite).toBe(true); expect(e.hue).toBe(40); expect(e.row).toBe(3);
    expect(() => spriteOf('fn5-99:0')).toThrow();
  });
  it('게시판 던전 14 ~ 17: 연습 첫 몬스터 · 일반 둘째 · 도전 = fn5-boss 의 그 차시 줄', () => {
    [14, 15, 16, 17].forEach((n, i) => {
      expect(bossArt(bossOf(n), 'easy').sprite).toBe(`fn5-${n}:0`); expect(bossArt(bossOf(n), 'normal').sprite).toBe(`fn5-${n}:1`);
      expect(bossArt(bossOf(n), 'hard').sprite).toBe(`fn5-boss:${i}`); expect(fnRef(n, 'hard')).toBe(`fn5-boss:${i}`);
    });
    expect(fnRef(13, 'hard')).toBeNull();
  });
});
