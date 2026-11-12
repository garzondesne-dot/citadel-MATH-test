// 📺 #157 TV 전투 장면 배치 · 공격 사건 (순수 계산)
import { describe, expect, it } from 'vitest';
import { arenaBox, partyLayout, tierOf, TV_FS, TV_FW } from '../src/ui/tv/arena/layout';
import { hitsOf } from '../src/ui/tv/arena/events';

describe('📺 TV 전투 장면 (#157)', () => {
  it('몬스터 = 화면 높이 46% (보스 54%) · 체력 막대 = 보이는 머리 위 · 위 막대 아래', () => {
    const m = arenaBox(1920, 1080, false, false, 0.5), bo = arenaBox(1920, 1080, true);
    expect(Math.round(m.mon.size)).toBe(497); expect(Math.round(bo.mon.size)).toBe(583);
    expect(m.hp.y + m.hp.h).toBeLessThanOrEqual(m.mon.top + m.mon.size * 0.5); // 머리(위 절반) 위
    expect(m.hp.y).toBeGreaterThanOrEqual(1080 * 0.15);
  });
  it('인원 단계 1 · 3 · 15 · 26 = 크게 · 가운데로 → 작게 · 두 줄', () => {
    expect([1, 3, 15, 26].map((n) => tierOf(n).k)).toEqual([4, 3.5, 2.5, 2]);
    expect(partyLayout(1, 1920, 1080)[0]!.x).toBeCloseTo(960, 0);
    for (const n of [1, 3, 15, 26]) {
      const p = partyLayout(n, 1920, 1080);
      expect(p).toHaveLength(n);
      expect(p.every((s) => s.x > 0 && s.x < 1920 && s.y <= 1080 * 0.9)).toBe(true);
    }
    const three = partyLayout(3, 1920, 1080).map((s) => s.x);
    expect(three[2]! - three[0]!).toBeLessThan(1920 * 0.5); // 적으면 가운데로 모음
  });
  it('글자 4 크기 · 2 굵기', () => { expect(Object.keys(TV_FS)).toHaveLength(4); expect(Object.keys(TV_FW)).toHaveLength(2); });
  it('공격 사건 = 횟수가 늘어난 학생만 · 데미지 차이 · 연습', () => {
    const was = { a: { n: 1, dmg: 2, prac: false }, b: { n: 0, dmg: 0, prac: false } };
    const now = { a: { n: 2, dmg: 4, prac: false }, b: { n: 1, dmg: 0, prac: false }, c: { n: 0, dmg: 0, prac: false } };
    expect(hitsOf(was, now)).toEqual([{ u: 'a', dmg: 2, kind: 'hit' }, { u: 'b', dmg: 0, kind: 'miss' }]);
    expect(hitsOf(now, { ...now, a: { n: 3, dmg: 4, prac: true } })).toEqual([{ u: 'a', dmg: 0, kind: 'practice' }]);
  });
});
