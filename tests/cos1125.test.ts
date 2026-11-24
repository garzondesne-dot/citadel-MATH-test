// 🎨 옷장 1차 (📜 2026-11-25 · 머리 🔨): 값표 · 사기 · 입은 것 거르기 · 로그 줄
import { describe, expect, it } from 'vitest';
import { COS, COS_KINDS, COS_PRICE, buyCos, cosClean, cosLog, cosWorn, fxHueOf, ownsCos, auraColorOf, nameColorOf } from '../src/model/cosmetics';
import { ECON_VER, type Wallet } from '../src/model/wallet';

const W = (gem: number): Wallet => ({ gem, scroll: 0, buys: [], ver: ECON_VER });
describe('🎨 옷장', () => {
  it('물건 = 이름표 색 8 · 테두리 4 · 공격 색 6 · 발밑 빛 5 · 카드 배경 6 (29개) · 값 40 · 120 · 80 · 100 · 60', () => {
    const n = (k: string) => COS.filter((c) => c.kind === k).length;
    expect([n('nameColor'), n('nameFrame'), n('fx'), n('aura'), n('cardBg')]).toEqual([8, 4, 6, 5, 6]);
    expect(COS_PRICE).toEqual({ nameColor: 40, nameFrame: 120, fx: 80, aura: 100, cardBg: 60 });
    expect(new Set(COS.map((c) => c.id)).size).toBe(COS.length);
    expect(COS_KINDS.map((k) => k.k)).toEqual(['nameColor', 'nameFrame', 'fx', 'aura', 'cardBg']);
  });
  it('사기 = 💎 빠짐 · 산 기록 cos_ · 두 번 못 삼 · 모자라면 까닭', () => {
    const w = W(100);
    expect(buyCos(w, 'nc_gold', 1)).toBeNull(); expect(w.gem).toBe(60); expect(ownsCos(w, 'nc_gold')).toBe(true); expect(w.buys[0]!.id).toBe('cos_nc_gold');
    expect(buyCos(w, 'nc_gold', 2)).toMatch(/이미/); expect(w.gem).toBe(60);
    expect(buyCos(w, 'au_gold', 3)).toMatch(/모자라/); expect(w.gem).toBe(60); expect(ownsCos(w, 'au_gold')).toBe(false);
    expect(buyCos(w, 'zzz', 4)).toMatch(/없는/);
  });
  it('입은 것 = 없는 물건 · 다른 종류 칸 버림 · 산 것만 (내 것)', () => {
    expect(cosClean({ nameColor: 'nc_sky', aura: 'nc_sky', fx: 'nope', x: 1 })).toEqual({ nameColor: 'nc_sky' });
    const w = W(500); buyCos(w, 'fx_blue', 1);
    expect(cosWorn(w, { fx: 'fx_blue', aura: 'au_red' })).toEqual({ fx: 'fx_blue' });
    expect(fxHueOf({ fx: 'fx_blue' })).toBe(210); expect(fxHueOf({})).toBe(0);
    expect(auraColorOf({ aura: 'au_red' })).toBe('#ff5b5b'); expect(nameColorOf(null)).toBe('');
  });
  it('💎 로그 = cos_{물건} · g 0 (받은 💎 셈에 안 섞임) · spend = 값', () => {
    const l = cosLog('nf_fire', 9);
    expect(l.key).toBe('cos_nf_fire'); expect(l.row.g).toBe(0); expect(l.row.spend).toBe(120); expect(l.row.at).toBe(9); expect(l.row.why).toMatch(/불꽃/);
  });
});
