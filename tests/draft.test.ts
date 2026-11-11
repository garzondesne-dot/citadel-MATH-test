// 🧙 내 용사 「고름 → 💾 저장」 규칙 (정식 #98 · #96 · 💰 경제 변경 규칙 ④)
import { describe, expect, it } from 'vitest';
import { canEnh, canHero, canSkill, cost, dirty, emptyPlan, equipOf, left, nextSkill, ownsHero, ownsSkill, save, type Look } from '../src/model/draft';
import { ECON_VER, type Wallet } from '../src/model/wallet';

const W = (gem = 9999, scroll = 30, buys: Wallet['buys'] = []): Wallet => ({ gem, scroll, buys, ver: ECON_VER });
const L0: Look = { hero: 0, enh: 0, socket: {}, title: 'none' };

describe('고름 (저장 전 · 화면에서만 💎 빠짐)', () => {
  it('강화 +1 · +2 = 💎 10 + 15 · 실패 없음', () => {
    const P = { ...emptyPlan(), enh: 2 };
    expect(cost(P, 0)).toEqual({ g: 25, s: 0 });
    expect(left(W(), P, 0)).toEqual({ gem: 9974, scroll: 30 });
  });
  it('+7 부터 📜 도 듦 · 💎 모자라면 못 고름', () => {
    expect(cost({ ...emptyPlan(), enh: 1 }, 6)).toEqual({ g: 50, s: 1 });
    expect(canEnh(W(49, 5), emptyPlan(), 6)).toBe(false);
    expect(canEnh(W(50, 0), emptyPlan(), 6)).toBe(false);
    expect(canEnh(W(50, 1), emptyPlan(), 6)).toBe(true);
    expect(canEnh(W(), emptyPlan(), 10)).toBe(false); // 최고 +10
  });
  it('스킬 = 다음 칸만 (#96) · 고르면 그다음 칸이 열림', () => {
    expect(nextSkill(W(), emptyPlan(), 0)).toBe(1);
    const P = { ...emptyPlan(), sk: ['moon'] };
    expect(ownsSkill(W(), P, 0, 'moon')).toBe(true);
    expect(nextSkill(W(), P, 0)).toBe(2);
    expect(canSkill(W(70, 0), P, 0, 0)).toBe(false); // moon 20 + slash 60 > 70
    expect(canSkill(W(80, 0), P, 0, 0)).toBe(true);
  });
  it('윗 칸을 가지면 아래 칸도 가짐 (정식 #78)', () => {
    expect(ownsSkill(W(9999, 30, [{ id: 'fx_slash', ver: 1, at: 0 }]), emptyPlan(), 0, 'moon')).toBe(true);
  });
  it('용사: 처음 열린 7명 · 💎 용사는 사야 · 조건 용사는 못 삼', () => {
    expect(ownsHero(W(), emptyPlan(), 3)).toBe(true);
    expect(ownsHero(W(), emptyPlan(), 12)).toBe(false);
    expect(ownsHero(W(), { ...emptyPlan(), heroes: [12] }, 12)).toBe(true);
    expect(canHero(W(29), emptyPlan(), 0)).toBe(false); // 가장 싼 용사 💎 30
    expect(canHero(W(30), emptyPlan(), 0)).toBe(true);
  });
  it('끼운 스킬 = 용사마다 · 없으면 Ⅰ', () => {
    expect(equipOf(L0)).toBe('cut');
    expect(equipOf({ ...L0, socket: { 0: 'moon' } })).toBe('moon');
    expect(dirty(emptyPlan(), L0, { ...L0, socket: { 0: 'moon' } })).toBe(true);
    expect(dirty(emptyPlan(), L0, { ...L0 })).toBe(false);
  });
});

describe('💾 저장 = 한 번에', () => {
  it('산 것 = { id, ver } · 💎 빠짐 · 강화 · 출전 · 호칭 반영 · 기록 한 줄', () => {
    const r = save(W(), { heroes: [12], enh: 1, sk: ['moon'] }, L0, { hero: 12, enh: 0, socket: { 12: 'twinkle' }, title: 'dawn' }, 5, () => 0.99);
    if (typeof r === 'string') throw new Error(r);
    expect(r.wallet.gem).toBe(9999 - 30 - 10 - 20);
    expect(r.wallet.buys).toEqual([{ id: 'hero_12', ver: ECON_VER, at: 5 }, { id: 'fx_moon', ver: ECON_VER, at: 5 }]);
    expect(r.look).toEqual({ hero: 12, enh: 1, socket: { 12: 'twinkle' }, title: 'dawn' });
    expect(r.great).toBe(0);
    expect(r.wallet.log).toEqual(['상점 💎 −60']);
  });
  it('🌟 대성공 = 그 단계 💎 절반 돌려받기', () => {
    const r = save(W(), { ...emptyPlan(), enh: 2 }, L0, L0, 1, () => 0.05);
    if (typeof r === 'string') throw new Error(r);
    expect(r.great).toBe(2);
    expect(r.back).toBe(5 + 7);
    expect(r.wallet.gem).toBe(9999 - 25 + 12);
  });
  it('모자라면 저장 안 됨 · 이미 산 것이면 안 됨', () => {
    expect(save(W(10), { ...emptyPlan(), sk: ['moon'] }, L0, L0, 1)).toBe('💎 조각이 10개 모자라요.');
    expect(typeof save(W(9999, 30, [{ id: 'fx_moon', ver: 1, at: 0 }]), { ...emptyPlan(), sk: ['moon'] }, L0, L0, 1)).toBe('string');
  });
});
